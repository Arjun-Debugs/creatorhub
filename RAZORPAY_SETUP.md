# Razorpay Payment Integration Setup Guide

## Prerequisites

1. **Razorpay Account**: Sign up at [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
2. **Supabase Project**: Your Supabase project should be set up

## Step 1: Get Razorpay API Keys

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings** → **API Keys**
3. Generate API keys (or use existing ones)
4. You'll get:
   - **Key ID** (starts with `rzp_test_` for test mode)
   - **Key Secret** (keep this secure!)

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

> **⚠️ Important**: 
> - `VITE_RAZORPAY_KEY_ID` has the `VITE_` prefix (exposed to client)
> - `RAZORPAY_KEY_SECRET` does NOT have `VITE_` prefix (server-only)
> - Keep your Key Secret secure and never expose it to the client

## Step 3: Deploy Edge Functions

Deploy the Edge Functions to Supabase:

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
npx supabase functions deploy create-razorpay-order
npx supabase functions deploy verify-payment
npx supabase functions deploy razorpay-webhook
```

## Step 4: Set Environment Secrets in Supabase

Go to your Supabase Dashboard → Edge Functions → Secrets, and add:

```
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Step 5: Run Database Migration

Apply the Razorpay database migration:

```bash
npx supabase db push
```

Or manually run the migration SQL in your Supabase SQL Editor:
- File Location: `supabase/migrations/20260117193827_add_razorpay_fields.sql`

## Step 6: Configure Webhook in Razorpay Dashboard

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings** → **Webhooks**
2. Click **Create New Webhook**
3. Set the webhook URL to:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook
   ```
4. Select the following events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Set a webhook secret (save this securely!)
6. Click **Create Webhook**
7. Update your `.env` with the webhook secret:
   ```env
   RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

## Step 7: Test the Integration

### Using Test Cards

Razorpay provides test cards for different scenarios:

**Successful Payment:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failed Payment:**
- Card Number: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

### Testing Steps

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Explore page and add a course to cart
3. Go to Checkout
4. Click "Pay" button
5. Razorpay modal should open with the correct amount
6. Enter test card details
7. Complete payment
8. Verify:
   - Payment success message appears
   - Order status updates to `completed` in database
   - Course enrollment is created
   - Email confirmations are sent (if configured)

## Troubleshooting

### "Payment gateway not configured" Error
- Check that `VITE_RAZORPAY_KEY_ID` is set in `.env`
- Ensure the key starts with `rzp_test_` or `rzp_live_`
- Restart your dev server after updating `.env`

### "Failed to create order" Error
- Verify Edge Function is deployed
- Check Supabase logs for errors
- Ensure `RAZORPAY_KEY_SECRET` is set in Supabase secrets

### "Payment verification failed" Error
- Check that the webhook secret matches in both Razorpay dashboard and Supabase
- Verify signature verification logic is working
- Check Supabase Edge Function logs

### Webhook Not Triggering
- Ensure webhook URL is correct
- Check webhook signature is being validated correctly
- Verify events are selected in Razorpay dashboard

## Going Live

When ready to accept real payments:

1. **Activate your Razorpay account** (complete KYC verification)
2. **Generate live API keys** from the dashboard
3. **Update environment variables** with live keys:
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY
   RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
   ```
4. **Update webhook URL** to use production domain
5. **Test thoroughly** in production environment before announcing

## Security Best Practices

✅ **DO:**
- Keep `RAZORPAY_KEY_SECRET` server-side only
- Validate all payments server-side
- Verify payment signatures
- Use HTTPS in production
- Set up webhook signature validation

❌ **DON'T:**
- Expose Key Secret to client
- Skip signature verification
- Trust client-side payment data without verification
- Use test keys in production

## Support

For issues:
- **Razorpay Docs**: https://razorpay.com/docs
- **Razorpay Support**: https://dashboard.razorpay.com/support
- **Supabase Docs**: https://supabase.com/docs
