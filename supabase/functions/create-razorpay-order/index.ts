import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';

// Declare Deno global for TypeScript
declare const Deno: {
    serve: (handler: (request: Request) => Response | Promise<Response>) => void;
    env: {
        get: (key: string) => string | undefined;
    };
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
    id: string;
    name: string;
    price: number;
    description?: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { items } = await req.json() as { items: CartItem[] };

        if (!items || items.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Cart is empty' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Calculate total amount
        const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
        const amountInPaise = Math.round(totalAmount * 100);

        // Get Razorpay credentials
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!razorpayKeyId || !razorpayKeySecret) {
            return new Response(
                JSON.stringify({ error: 'Razorpay credentials not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Razorpay order
        const razorpayUrl = 'https://api.razorpay.com/v1/orders';
        const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

        const orderPayload = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `order_${user.id}_${Date.now()}`,
            notes: {
                user_id: user.id,
                items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, price: i.price }))),
            },
        };

        const razorpayResponse = await fetch(razorpayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
            },
            body: JSON.stringify(orderPayload),
        });

        if (!razorpayResponse.ok) {
            const errorText = await razorpayResponse.text();
            console.error('Razorpay API error:', errorText);
            return new Response(
                JSON.stringify({ error: 'Failed to create Razorpay order' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const razorpayOrder = await razorpayResponse.json();

        // Store order in database with pending status
        for (const item of items) {
            const { error: dbError } = await supabaseClient
                .from('orders')
                .insert({
                    user_id: user.id,
                    item_id: item.id,
                    item_type: 'course',
                    amount: item.price,
                    status: 'pending',
                    razorpay_order_id: razorpayOrder.id,
                });

            if (dbError) {
                console.error('Database error:', dbError);
            }
        }

        // Return order details to client
        return new Response(
            JSON.stringify({
                razorpay_order_id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key_id: razorpayKeyId,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in create-razorpay-order:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
