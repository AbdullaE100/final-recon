import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

// Webhook secret from Stripe dashboard
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // Get the signature from the header
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('No signature provided')
    return new Response('No signature provided', { status: 400 })
  }

  try {
    // Get the raw request body
    const body = await req.text()
    
    // Verify the event by constructing it with the signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log(`Webhook received: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
        
      case 'customer.created':
        await handleCustomerCreated(event.data.object)
        break
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
        
      // Add other event handlers as needed
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Return a 200 response to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

// Handler for subscription created event
async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer
  const status = subscription.status
  const priceId = subscription.items.data[0].price.id
  
  // Get the Stripe customer to find the user
  const customer = await stripe.customers.retrieve(customerId)
  
  // Find the user by email
  if (customer.email) {
    try {
      // First get the user ID from auth.users
      const { data: userData, error: userError } = await supabase
        .auth.admin.getUserByEmail(customer.email)
        
      if (userError || !userData) {
        console.error('Error finding user:', userError)
        return
      }
      
      // Create/update subscription record
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userData.user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          status: status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        
      if (error) {
        console.error('Error updating subscription:', error)
      }
    } catch (err) {
      console.error('Error in handleSubscriptionCreated:', err)
    }
  }
}

// Handler for subscription updated event
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer
  const status = subscription.status
  const priceId = subscription.items.data[0].price.id
  
  try {
    // Find the user subscription by Stripe subscription ID
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        stripe_price_id: priceId,
        status: status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)
      
    if (error) {
      console.error('Error updating subscription:', error)
    }
  } catch (err) {
    console.error('Error in handleSubscriptionUpdated:', err)
  }
}

// Handler for subscription deleted/canceled event
async function handleSubscriptionDeleted(subscription) {
  try {
    // Update the subscription status to canceled
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
        canceled_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)
      
    if (error) {
      console.error('Error canceling subscription:', error)
    }
  } catch (err) {
    console.error('Error in handleSubscriptionDeleted:', err)
  }
}

// Handler for customer created event
async function handleCustomerCreated(customer) {
  // This is where you would link a Stripe customer to a user in your database
  console.log(`Customer created: ${customer.id} for email ${customer.email}`)
}

// Handler for invoice paid event
async function handleInvoicePaid(invoice) {
  const subscription = invoice.subscription
  if (subscription) {
    // Update subscription status to active if it's not already
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription)
        .eq('status', 'incomplete')
        
      if (error) {
        console.error('Error updating subscription after payment:', error)
      }
    } catch (err) {
      console.error('Error in handleInvoicePaid:', err)
    }
  }
}

// Handler for payment failed event
async function handlePaymentFailed(invoice) {
  const subscription = invoice.subscription
  if (subscription) {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription)
        
      if (error) {
        console.error('Error updating subscription after failed payment:', error)
      }
    } catch (err) {
      console.error('Error in handlePaymentFailed:', err)
    }
  }
} 