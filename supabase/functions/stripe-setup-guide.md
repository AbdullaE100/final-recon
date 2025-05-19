# Stripe Setup Guide for Supabase Edge Functions

This guide helps you set up the necessary environment variables for the Stripe integration to work properly.

## Required Environment Variables

The following environment variables must be set in your Supabase project for the Stripe functions to work:

1. `STRIPE_SECRET_KEY` - Your Stripe secret API key
2. `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret
3. `SUBSCRIPTION_PRICE_ID` - The ID of your subscription product in Stripe
4. `SUPABASE_URL` - Your Supabase project URL
5. `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Setting Up Environment Variables

### Option 1: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Set environment variables
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUBSCRIPTION_PRICE_ID=price_...
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Find the "Project API keys" section and copy the "service_role" key
4. Navigate to Settings > Functions
5. Click on "Environment variables"
6. Add each of the environment variables listed above

## Creating a Stripe Price ID

1. Sign in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Products > Add Product
3. Create a subscription product with the appropriate pricing
4. Once created, click on the product to view its details
5. Find the "API ID" for the price (starts with "price_...")
6. Use this ID as your `SUBSCRIPTION_PRICE_ID` environment variable

## Testing the Configuration

After setting up the environment variables, deploy your functions and test them:

```bash
# Deploy the functions
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhooks
supabase functions deploy stripe-portal

# Verify the environment variables
supabase functions env list
```

## Troubleshooting

If you encounter "No checkout URL returned from server", check these common issues:

1. **Missing Environment Variables**: Ensure all required variables are set
2. **Invalid Stripe API Key**: Verify your Stripe API key is correct
3. **Invalid Price ID**: Make sure the subscription price ID exists in your Stripe account
4. **Deployment Issues**: Redeploy your functions after setting environment variables
5. **CORS Issues**: Ensure your API calls include the proper headers

For further debugging, check the function logs:

```bash
supabase functions logs stripe-checkout
``` 