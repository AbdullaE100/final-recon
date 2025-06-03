# App Store Connect Setup Guide

This guide walks you through setting up subscription products in App Store Connect for your Apple IAP implementation.

## Prerequisites

- Apple Developer Account ($99/year)
- App registered in App Store Connect
- Xcode project with proper bundle identifier

## Step 1: Create Your App in App Store Connect

### Prerequisites
- Active Apple Developer Program membership ($99/year)
- Your app's bundle identifier (e.g., `com.yourcompany.nofapapp`)
- App name and basic information

### Creating Your App
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Navigate to "My Apps"
4. Click the "+" button to create a new app
5. Fill in the required information:
   - **Platform**: iOS
   - **Name**: Your app name (e.g., "NoFap Companion")
   - **Primary Language**: English (or your preferred language)
   - **Bundle ID**: Select or create your bundle identifier
   - **SKU**: A unique identifier for your app (e.g., "nofap-companion-2024")
   - **User Access**: Full Access (recommended)
6. Click "Create"

### After Creating Your App
1. Your app will appear in "My Apps"
2. Select your newly created app to continue with subscription setup

## Step 2: Create Subscription Group

1. In your app, go to **Features** → **In-App Purchases**
2. Click the **+** button next to "Subscription Groups"
3. Create a new subscription group:
   - **Reference Name**: "Premium Subscriptions"
   - **App Store Display Name**: "Premium Features"
4. Click **Create**

## Step 3: Create Subscription Products

### Monthly Subscription

1. Click **+** next to your subscription group
2. Select **Auto-Renewable Subscription**
3. Fill in the details:
   - **Product ID**: `com.yourapp.premium.monthly`
   - **Reference Name**: "Premium Monthly"
   - **Subscription Duration**: 1 Month
4. Click **Create**

### Yearly Subscription

1. Repeat the process for yearly subscription:
   - **Product ID**: `com.yourapp.premium.yearly`
   - **Reference Name**: "Premium Yearly"
   - **Subscription Duration**: 1 Year

## Step 4: Configure Subscription Details

For each subscription:

### Subscription Information
- **Display Name**: "Premium Monthly" / "Premium Yearly"
- **Description**: Describe your premium features

### Subscription Prices
1. Click **+** next to "Subscription Prices"
2. Set your pricing:
   - **Monthly**: $9.99 (or your preferred price)
   - **Yearly**: $99.99 (or your preferred price)
3. Select territories where the subscription will be available

### App Store Information
- **Display Name**: What users see in the App Store
- **Description**: Detailed description of premium features

## Step 5: Review Information

1. Add **App Store Review Information**:
   - **Screenshot**: Optional screenshot of subscription benefits
   - **Review Notes**: Instructions for App Store reviewers

2. Set **Subscription Review Information**:
   - Explain what premium features unlock
   - Provide test account credentials if needed

## Step 6: Submit for Review

1. Click **Submit for Review** for each subscription
2. Wait for Apple's approval (usually 24-48 hours)
3. Subscriptions must be approved before testing

## Step 7: Create Sandbox Test Accounts

1. Go to **Users and Access** → **Sandbox Testers**
2. Click **+** to create test accounts
3. Create multiple test accounts for different scenarios:
   - New user testing
   - Existing subscriber testing
   - Different regions/currencies

### Test Account Details
- **Email**: Use unique emails (can be fake)
- **Password**: Strong password
- **First/Last Name**: Any names
- **Date of Birth**: Must be 18+
- **App Store Territory**: Select your target markets

## Step 8: Update Your App Configuration

1. Update `utils/inAppPurchase.ts` with your actual product IDs:
   ```typescript
   export const PRODUCT_IDS = {
     PREMIUM_MONTHLY: 'com.yourapp.premium.monthly',
     PREMIUM_YEARLY: 'com.yourapp.premium.yearly',
   };
   ```

2. Replace `com.yourapp` with your actual bundle identifier

## Step 9: Testing Checklist

### Before Testing
- [ ] Subscriptions approved in App Store Connect
- [ ] Sandbox test accounts created
- [ ] Product IDs updated in code
- [ ] react-native-iap code uncommented
- [ ] App built and installed on device

### Test Scenarios
- [ ] Purchase monthly subscription
- [ ] Purchase yearly subscription
- [ ] Restore purchases
- [ ] Test with different sandbox accounts
- [ ] Test subscription expiration
- [ ] Test upgrade/downgrade flows

## Common Issues and Solutions

### "Product not found" Error
- Ensure product IDs match exactly
- Verify subscriptions are approved
- Check bundle identifier matches

### "Cannot connect to iTunes Store" Error
- Ensure using sandbox test account
- Sign out of production App Store account
- Use physical device (not simulator)

### Purchases Not Restoring
- Verify using same Apple ID
- Check restore purchases implementation
- Ensure proper receipt validation

## Production Deployment

### Before App Store Submission
1. Test thoroughly with sandbox accounts
2. Implement proper receipt validation
3. Handle all error scenarios
4. Test on multiple devices and iOS versions

### App Store Review
1. Provide clear subscription benefits
2. Include restore purchases functionality
3. Handle subscription management properly
4. Follow Apple's subscription guidelines

## Important Notes

- **Sandbox vs Production**: Sandbox purchases are free and for testing only
- **Receipt Validation**: Always validate receipts server-side in production
- **Subscription Management**: Users can manage subscriptions in iOS Settings
- **Refunds**: Handle through App Store Connect, not your app
- **Family Sharing**: Consider if you want to support family sharing

## Resources

- [Apple IAP Documentation](https://developer.apple.com/in-app-purchase/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Subscription Best Practices](https://developer.apple.com/app-store/subscriptions/)