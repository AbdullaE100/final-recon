import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  try {
    // Return masked environment variables
    const envVars = {
      STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY') || null,
      SUBSCRIPTION_PRICE_ID: Deno.env.get('SUBSCRIPTION_PRICE_ID') || null,
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') || null,
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || null
    }
    
    return new Response(JSON.stringify(envVars), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 