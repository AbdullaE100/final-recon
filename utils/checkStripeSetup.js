// A simple script to test the Stripe Checkout endpoint
const { createClient } = require('@supabase/supabase-js');

// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://gtxigxwklomqdlihxjyd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have configuration
if (!supabaseKey) {
  console.error('Error: No Supabase API key found. Please provide it as SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to sign in and get token
async function signInAndTest(email, password) {
  try {
    // Sign in with email/password
    console.log(`Signing in as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Authentication error:', authError.message);
      return;
    }

    if (!authData?.session?.access_token) {
      console.error('Failed to get access token');
      return;
    }

    console.log('Successfully signed in and got access token');
    
    // Get the access token
    const token = authData.session.access_token;
    
    // Test the Stripe checkout endpoint
    console.log('Testing Stripe checkout endpoint...');
    
    // Make request to checkout endpoint
    const checkoutUrl = `https://gtxigxwklomqdlihxjyd.functions.supabase.co/stripe-checkout`;
    
    const response = await fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        returnUrl: 'nofapapp://subscription',
      }),
    });
    
    // Get response text
    const responseText = await response.text();
    console.log('Response status:', response.status);
    
    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('Response:', JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.sessionUrl) {
        console.log('\n✅ SUCCESS: Stripe checkout is properly configured!');
        console.log('Checkout URL:', jsonResponse.sessionUrl);
      } else {
        console.log('\n❌ ERROR: No session URL returned. Stripe is likely not properly configured');
        
        if (jsonResponse.error && jsonResponse.error.includes('API key')) {
          console.log('The error indicates an issue with the Stripe API key. Check STRIPE_SECRET_KEY environment variable.');
        } else if (jsonResponse.error && jsonResponse.error.includes('price')) {
          console.log('The error indicates an issue with the price ID. Check SUBSCRIPTION_PRICE_ID environment variable.');
        }
      }
    } catch (e) {
      console.log('Failed to parse response as JSON:', e.message);
      console.log('Raw response:', responseText);
      console.log('\n❌ ERROR: Response is not valid JSON. The function might be misconfigured.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Main function
async function main() {
  // Get email/password from command line args
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error('Usage: node checkStripeSetup.js <email> <password>');
    process.exit(1);
  }
  
  await signInAndTest(email, password);
}

// Run main function
main().catch(console.error); 