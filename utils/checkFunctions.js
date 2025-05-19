/**
 * Simple script to check if Supabase Edge Functions are accessible
 * This doesn't test authentication but just if the endpoints are available
 */
const fetch = require('node-fetch');

// Function to test endpoint availability
async function testEndpoint(endpoint) {
  try {
    console.log(`Testing ${endpoint}...`);
    const url = `https://gtxigxwklomqdlihxjyd.functions.supabase.co/${endpoint}`;
    
    // We'll send OPTIONS request which should work even without auth
    const response = await fetch(url, { method: 'OPTIONS' });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`✅ ${endpoint} is accessible`);
      return true;
    } else {
      console.log(`❌ ${endpoint} returned non-200 status code`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error accessing ${endpoint}:`, error.message);
    return false;
  }
}

// Function to print environment variables that need to be set
function printEnvGuide() {
  console.log('\n--- ENVIRONMENT VARIABLE SETUP GUIDE ---');
  console.log('Set these variables in Supabase dashboard or using Supabase CLI:');
  console.log('1. STRIPE_SECRET_KEY - Your Stripe secret key (starts with sk_test_ or sk_live_)');
  console.log('2. STRIPE_WEBHOOK_SECRET - Your Stripe webhook signing secret (starts with whsec_)');
  console.log('3. SUBSCRIPTION_PRICE_ID - Your Stripe price ID (starts with price_)');
  console.log('4. SUPABASE_URL - Your Supabase URL (https://gtxigxwklomqdlihxjyd.supabase.co)');
  console.log('5. SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key\n');
  
  console.log('To set using Supabase CLI:');
  console.log('supabase secrets set STRIPE_SECRET_KEY=sk_test_...');
  console.log('supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('supabase secrets set SUBSCRIPTION_PRICE_ID=price_...');
  console.log('supabase secrets set SUPABASE_URL=https://gtxigxwklomqdlihxjyd.supabase.co');
  console.log('supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...');
}

// Main function
async function main() {
  console.log('Checking Supabase Edge Functions availability...\n');
  
  // Test each endpoint
  const checkoutResult = await testEndpoint('stripe-checkout');
  const webhooksResult = await testEndpoint('stripe-webhooks');
  const portalResult = await testEndpoint('stripe-portal');
  
  console.log('\n--- RESULTS SUMMARY ---');
  console.log(`stripe-checkout: ${checkoutResult ? '✅ Available' : '❌ Not available'}`);
  console.log(`stripe-webhooks: ${webhooksResult ? '✅ Available' : '❌ Not available'}`);
  console.log(`stripe-portal: ${portalResult ? '✅ Available' : '❌ Not available'}`);
  
  if (checkoutResult && webhooksResult && portalResult) {
    console.log('\n✅ All endpoints are accessible.');
    console.log('If you still have issues, the problem is likely with environment variables or authentication.');
    printEnvGuide();
  } else {
    console.log('\n❌ Some endpoints are not accessible.');
    console.log('Check your Supabase deployment and function logs.');
  }
}

// Run main function
main().catch(console.error); 