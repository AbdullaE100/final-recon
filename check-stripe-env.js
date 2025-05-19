#!/usr/bin/env node

/**
 * This script will check your Stripe environment variables
 * Run with: node check-stripe-env.js
 */

const https = require('https');

// Function to make a GET request to Supabase
function fetchEnvVars() {
  console.log('Checking Supabase Edge Function environment variables...\n');
  
  const options = {
    hostname: 'gtxigxwklomqdlihxjyd.functions.supabase.co',
    path: '/check-env',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log('Error response:', data);
        console.log('\nThe check-env function may not be deployed. Let\'s create it.');
        console.log('\nFunction Code:');
        console.log('-------------');
        printCheckEnvFunction();
        return;
      }
      
      try {
        const envData = JSON.parse(data);
        console.log('Environment variables found:');
        
        if (envData.STRIPE_SECRET_KEY) {
          const key = envData.STRIPE_SECRET_KEY;
          const maskedKey = `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
          console.log(`✅ STRIPE_SECRET_KEY: ${maskedKey}`);
        } else {
          console.log('❌ STRIPE_SECRET_KEY: Not set');
        }
        
        if (envData.SUBSCRIPTION_PRICE_ID) {
          console.log(`✅ SUBSCRIPTION_PRICE_ID: ${envData.SUBSCRIPTION_PRICE_ID}`);
        } else {
          console.log('❌ SUBSCRIPTION_PRICE_ID: Not set');
        }
        
        if (envData.SUPABASE_URL) {
          console.log(`✅ SUPABASE_URL: ${envData.SUPABASE_URL}`);
        } else {
          console.log('❌ SUPABASE_URL: Not set');
        }
        
        if (envData.SUPABASE_SERVICE_ROLE_KEY) {
          const key = envData.SUPABASE_SERVICE_ROLE_KEY;
          const maskedKey = `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
          console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${maskedKey}`);
        } else {
          console.log('❌ SUPABASE_SERVICE_ROLE_KEY: Not set');
        }
        
        console.log('\nWhat to do if variables are missing:');
        console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gtxigxwklomqdlihxjyd');
        console.log('2. Navigate to Settings > API > Edge Functions');
        console.log('3. Add the missing environment variables');
        
      } catch (e) {
        console.log('Error parsing response:', e.message);
        console.log('Response data:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error:', error.message);
    console.log('\nCould not connect to the Supabase Edge Function.');
    console.log('You may need to deploy the check-env function first.');
    console.log('\nFunction Code:');
    console.log('-------------');
    printCheckEnvFunction();
  });
  
  req.end();
}

// Print the code for the check-env function
function printCheckEnvFunction() {
  console.log(`
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
  `);
  
  console.log('\nTo deploy this function:');
  console.log('1. Create a file at supabase/functions/check-env/index.ts');
  console.log('2. Copy the code above into that file');
  console.log('3. Run: supabase functions deploy check-env');
  console.log('   or deploy via the Supabase dashboard');
}

fetchEnvVars(); 