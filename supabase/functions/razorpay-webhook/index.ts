import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHmac } from "node:crypto";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get webhook signature
        const webhookSignature = req.headers.get('X-Razorpay-Signature');
        if (!webhookSignature) {
            return new Response(
                JSON.stringify({ error: 'Missing webhook signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get webhook body
        const body = await req.text();

        // Get webhook secret
        const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
        if (!webhookSecret) {
            console.error('Webhook secret not configured');
            return new Response(
                JSON.stringify({ error: 'Webhook not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify webhook signature
        const expectedSignature = createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== webhookSignature) {
            console.error('Invalid webhook signature');
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse webhook payload
        const payload = JSON.parse(body);
        const event = payload.event;
        const paymentEntity = payload.payload?.payment?.entity;
        const orderEntity = payload.payload?.order?.entity;

        console.log('Webhook event received:', event);

        // Create Supabase client with service role
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Handle different event types
        switch (event) {
            case 'payment.captured':
            case 'order.paid': {
                const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
                const razorpayPaymentId = paymentEntity?.id;
                const paymentMethod = paymentEntity?.method;

                if (!razorpayOrderId) {
                    console.error('Missing order ID in webhook payload');
                    break;
                }

                // Update order status to completed
                const { error: updateError } = await supabaseClient
                    .from('orders')
                    .update({
                        status: 'completed',
                        razorpay_payment_id: razorpayPaymentId,
                        payment_method: paymentMethod,
                    })
                    .eq('razorpay_order_id', razorpayOrderId)
                    .eq('status', 'pending');

                if (updateError) {
                    console.error('Failed to update order:', updateError);
                } else {
                    console.log('Order updated successfully:', razorpayOrderId);
                }

                // Get the order to create enrollment
                const { data: orders } = await supabaseClient
                    .from('orders')
                    .select('user_id, item_id')
                    .eq('razorpay_order_id', razorpayOrderId);

                if (orders && orders.length > 0) {
                    for (const order of orders) {
                        const { error: enrollError } = await supabaseClient
                            .from('enrollments')
                            .insert({
                                user_id: order.user_id,
                                course_id: order.item_id,
                                progress: 0,
                            });

                        if (enrollError && enrollError.code !== '23505') {
                            console.error('Failed to create enrollment:', enrollError);
                        }
                    }
                }
                break;
            }

            case 'payment.failed': {
                const razorpayOrderId = paymentEntity?.order_id;
                const errorReason = paymentEntity?.error_description;

                if (razorpayOrderId) {
                    const { error: updateError } = await supabaseClient
                        .from('orders')
                        .update({
                            status: 'cancelled',
                            error_reason: errorReason,
                        })
                        .eq('razorpay_order_id', razorpayOrderId);

                    if (updateError) {
                        console.error('Failed to update failed order:', updateError);
                    } else {
                        console.log('Failed order updated:', razorpayOrderId);
                    }
                }
                break;
            }

            default:
                console.log('Unhandled event type:', event);
        }

        return new Response(
            JSON.stringify({ received: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in razorpay-webhook:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
