import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHmac } from "node:crypto";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            payment_method
        } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return new Response(
                JSON.stringify({ error: 'Missing payment details' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get Razorpay key secret
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
        if (!razorpayKeySecret) {
            return new Response(
                JSON.stringify({ error: 'Razorpay secret not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify signature
        const generatedSignature = createHmac('sha256', razorpayKeySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            console.error('Signature mismatch:', { generatedSignature, razorpay_signature });
            return new Response(
                JSON.stringify({ error: 'Invalid payment signature', verified: false }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Signature is valid - update orders and create enrollments
        const { data: orders, error: fetchError } = await supabaseClient
            .from('orders')
            .select('item_id, amount')
            .eq('user_id', user.id)
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('status', 'pending');

        if (fetchError || !orders || orders.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Orders not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Update all orders to completed
        const { error: updateError } = await supabaseClient
            .from('orders')
            .update({
                status: 'completed',
                razorpay_payment_id,
                razorpay_signature,
                payment_method,
            })
            .eq('user_id', user.id)
            .eq('razorpay_order_id', razorpay_order_id);

        if (updateError) {
            console.error('Failed to update orders:', updateError);
            return new Response(
                JSON.stringify({ error: 'Failed to update order status' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create enrollments for all courses
        for (const order of orders) {
            const { error: enrollError } = await supabaseClient
                .from('enrollments')
                .insert({
                    user_id: user.id,
                    course_id: order.item_id,
                    progress: 0,
                })
                .select()
                .single();

            if (enrollError && enrollError.code !== '23505') { // Ignore duplicate key errors
                console.error('Failed to create enrollment:', enrollError);
            }
        }

        return new Response(
            JSON.stringify({
                verified: true,
                message: 'Payment verified successfully',
                orders_updated: orders.length
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in verify-payment:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
