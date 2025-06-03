# Apple In-App Purchase (IAP) Setup Guide

This app now uses Apple In-App Purchase instead of Stripe to comply with App Store guidelines.

## Overview

The app has been converted from Stripe payments to Apple IAP with the following changes:

- Removed all Stripe-related code and dependencies
- Implemented Apple IAP using mock functions (ready for production implementation)
- Updated subscription context to use Apple IAP
- Modified UI to use native Apple payment flows

## Implementation Status

### ✅ Completed
- ✅ Removed Stripe payment gateway
- ✅ Removed Stripe Supabase functions
- ✅ Updated subscription context
- ✅ Modified UI components
- ✅ Created Apple IAP utility functions (production-ready structure)
- ✅ Added react-native-iap dependency to package.json
- ✅ Implemented real IAP function structure (commented for safety)

### 🔄 Next Steps for Production

#### 1. **Install Dependencies**
   ```bash
   npm install
   cd ios && pod install  # For iOS
   ```

#### 2. **Configure App Store Connect**
   - Create subscription products in App Store Connect
   - Set up subscription groups (e.g., "Premium Subscriptions")
   - Configure pricing and availability
   - **Important**: Product IDs must match those in `PRODUCT_IDS`

#### 3. **Update Product IDs**
   - Replace product IDs in `utils/inAppPurchase.ts`:
   ```typescript
   export const PRODUCT_IDS = {
     PREMIUM_MONTHLY: 'com.yourapp.premium.monthly', // Replace with actual ID
     PREMIUM_YEARLY: 'com.yourapp.premium.yearly',   // Replace with actual ID
   };
   ```

#### 4. **Enable Real IAP Implementation**
   - Uncomment all react-native-iap code in `utils/inAppPurchase.ts`
   - Remove mock implementations
   - Test each function individually

#### 5. **Implement Backend Receipt Validation**
   - Create secure backend endpoint for receipt validation
   - Update `validateReceipt` function to call your backend
   - Never validate receipts on client-side in production

#### 6. **Test with Sandbox**
   - Create sandbox test accounts in App Store Connect
   - Test purchase flows thoroughly
   - Verify receipt validation works correctly
   - Test restore purchases functionality

## File Changes Made

### Modified Files
- `app/subscription.tsx` - Converted from Stripe to Apple IAP
- `context/SubscriptionContext.tsx` - Updated to use Apple IAP
- `utils/inAppPurchase.ts` - Created Apple IAP utility functions
- `README.md` - Updated documentation

### Removed Files
- `utils/directStripeCheckout.ts`
- `utils/checkStripeSetup.js`
- `fix-stripe-checkout.js`
- `supabase/functions/stripe-*` - All Stripe functions
- Various Stripe deployment scripts

## App Store Compliance

This implementation ensures compliance with Apple's App Store guidelines:

- ✅ Uses Apple's payment system for digital content
- ✅ No external payment gateways for subscriptions
- ✅ Follows Apple's IAP best practices
- ✅ Maintains user privacy and security

## Testing

To test the current implementation:

1. The app will show mock premium status
2. Purchase buttons will show alerts (mock implementation)
3. All Stripe references have been removed
4. Ready for real Apple IAP integration

## Production Deployment

Before submitting to App Store:

1. Replace mock functions with real IAP implementation
2. Test thoroughly with sandbox accounts
3. Ensure receipt validation is secure
4. Update app metadata in App Store Connect