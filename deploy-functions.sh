#!/bin/bash

# Supabase project reference
PROJECT_REF="gtxigxwklomqdlihxjyd"

# Install Supabase CLI if not already installed
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    npm install -g supabase
fi

# Create shared folder to deploy
echo "Setting up shared folder..."
mkdir -p supabase/functions/_shared
cp supabase/functions/_shared/cors.ts supabase/functions/_shared/

# Deploy functions
echo "Deploying Edge Functions..."
supabase functions deploy stripe-webhooks --project-ref $PROJECT_REF
supabase functions deploy stripe-checkout --project-ref $PROJECT_REF
supabase functions deploy stripe-portal --project-ref $PROJECT_REF

# Set environment variables
echo "Setting environment variables..."
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" --project-ref $PROJECT_REF
supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" --project-ref $PROJECT_REF
supabase secrets set SUPABASE_URL="https://$PROJECT_REF.supabase.co" --project-ref $PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" --project-ref $PROJECT_REF
supabase secrets set SUBSCRIPTION_PRICE_ID="$SUBSCRIPTION_PRICE_ID" --project-ref $PROJECT_REF

echo "Deployment complete!"
echo "Your webhook URL is: https://$PROJECT_REF.functions.supabase.co/stripe-webhooks" 