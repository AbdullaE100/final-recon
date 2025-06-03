# NoFap Tracking App

A mobile application built with React Native and Expo to help track NoFap streaks and recovery progress.

## Features

- Track your NoFap streak with daily check-ins
- Visualize brain recovery metrics based on scientific research
- Daily motivational quotes
- Persistent data storage with Supabase backend
- Clean, modern UI with dark theme

## Setup

### Prerequisites

- Node.js (v14 or newer)
- npm or Yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Supabase (see below)
4. Update the Supabase credentials in `utils/supabaseClient.ts`
5. Start the app:
   ```
   npm start
   ```

## Supabase Setup

The app uses Supabase as a backend to store user data. Follow these steps to set it up:

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Create a new table named `streaks` with the following columns:
   - `id` (type: uuid, primary key, default: `uuid_generate_v4()`)
   - `user_id` (type: text, not null, unique)
   - `streak` (type: integer, default: 0)
   - `last_check_in` (type: timestamp with time zone)
   - `start_date` (type: timestamp with time zone)
   - `updated_at` (type: timestamp with time zone)

4. Get your Supabase URL and anon key from the project settings
5. Update the `utils/supabaseClient.ts` file with your credentials:
   ```typescript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

## Fixing App Crashes

If the app crashes when selecting different metrics in the Brain Recovery visualization, update the BrainMetrics component with the improved animation handling as shown in the codebase.

## Data Persistence

The app uses a combination of local storage and Supabase to ensure your data is always available:

1. All user data is stored locally using AsyncStorage
2. Streak data is additionally synced with Supabase when online
3. If offline, the app will use locally stored data
4. When back online, the app will sync with Supabase

## Technologies Used

- React Native / Expo
- TypeScript
- Supabase
- React Native Reanimated for animations
- React Native SVG for visualizations
- Expo Secure Store for secure local storage

## License

MIT

## Onboarding Flow Changes

The onboarding flow has been modified to present the premium subscription option using Apple In-App Purchase (IAP) after selecting a companion. This ensures compliance with App Store guidelines.

The flow now works as follows:
1. User completes the onboarding steps (username, welcome, quiz, commitment)
2. User selects their companion
3. User is automatically directed to the subscription screen
4. The Apple IAP subscription screen opens for a seamless checkout experience

If you want to bypass the payment screen during onboarding, modify the navigation in `completeOnboardingAndNavigate` function in `app/onboarding.tsx` to:

```js
router.replace('/(tabs)' as any);
```