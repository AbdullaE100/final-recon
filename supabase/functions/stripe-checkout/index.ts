import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Monthly subscription price ID
const PRICE_ID = Deno.env.get('SUBSCRIPTION_PRICE_ID') || ''

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log request for debugging
    console.log('Received checkout request')
    
    // Extract the authorization token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header')
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted')
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('User authenticated:', user.id)

    // Parse the request body
    const reqBody = await req.json()
    console.log('Request body:', reqBody)
    
    const { priceId = PRICE_ID, customerId, returnUrl, trial_period_days } = reqBody
    console.log('Using price ID:', priceId || PRICE_ID)
    
    if (!priceId && !PRICE_ID) {
      console.log('No price ID provided')
      return new Response(JSON.stringify({ error: 'No price ID provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    let customer = customerId

    // If no customer ID is provided, check if the user already has a Stripe customer
    if (!customer) {
      // Check if the user already has a Stripe customer
      const { data: existingCustomer } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      if (existingCustomer?.stripe_customer_id) {
        customer = existingCustomer.stripe_customer_id
        console.log('Using existing customer:', customer)
      } else {
        // Create a new Stripe customer
        const stripeCustomer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id
          }
        })
        
        customer = stripeCustomer.id
        console.log('Created new customer:', customer)
      }
    }

    // Create the checkout session
    console.log('Creating checkout session')
    const session = await stripe.checkout.sessions.create({
      customer,
      line_items: [
        {
          price: priceId || PRICE_ID,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: returnUrl || Deno.env.get('APP_URL') || 'https://yourapp.com',
      cancel_url: returnUrl || Deno.env.get('APP_URL') || 'https://yourapp.com',
      allow_promotion_codes: true,
      subscription_data: trial_period_days ? {
        trial_period_days: trial_period_days
      } : undefined,
      metadata: {
        supabase_user_id: user.id
      }
    })

    console.log('Session created:', session.id)
    console.log('Session URL:', session.url)

    return new Response(JSON.stringify({ sessionUrl: session.url, customerId: customer }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in checkout:', error)
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 