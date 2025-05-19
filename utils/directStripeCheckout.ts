/**
 * This is a temporary workaround to handle Stripe checkout directly,
 * bypassing the Supabase Edge Function until it's properly configured.
 */

// Fallback URL that always works (direct Stripe payment link)
const FALLBACK_PAYMENT_URL = 'https://buy.stripe.com/test_bJe5kwcYe2KWg8FdNtaAw00';

// Trial product URL for $3.99 monthly plan
const TRIAL_PAYMENT_URL = 'https://buy.stripe.com/test_bJe5kwcYe2KWg8FdNtaAw00';

/**
 * Creates a direct URL to a temporary checkout service
 * This is a fallback solution for when the Supabase Edge Function fails
 */
export const createDirectCheckoutUrl = (customerId?: string, priceId = 'price_premium_monthly'): string => {
  try {
    // Determine which URL to use based on price ID
    let baseUrl = 'https://buy.stripe.com/test_bJe5kwcYe2KWg8FdNtaAw00'; // Default test mode URL

    // Use trial URL for the trial price
    if (priceId === 'price_trial_monthly') {
      baseUrl = TRIAL_PAYMENT_URL;
    }
    
    // Add some parameters to help with identification
    const params = new URLSearchParams({
      client_reference_id: customerId || 'direct_checkout',
      locale: 'en',
      redirect: 'nofapapp://subscription?success=true',
    });
    
    // Build the URL
    return `${baseUrl}?${params.toString()}`;
  } catch (error) {
    console.error('Error creating checkout URL, using fallback:', error);
    return priceId === 'price_trial_monthly' ? TRIAL_PAYMENT_URL : FALLBACK_PAYMENT_URL;
  }
};

/**
 * Creates a Stripe Customer Portal URL for managing subscriptions
 * This is a temporary solution until the Supabase function is working
 */
export const createDirectPortalUrl = (customerId: string): string => {
  // Use the Stripe Customer Portal link
  return 'https://billing.stripe.com/p/login/test_bJe5kwcYe2KWg8FdNtaAw00';
}; 