# NoFap App Widget Extension Setup

This document provides instructions for adding the streak widget to the iOS app.

## Setting up in Xcode

1. Open the iOS project in Xcode:
   ```
   cd ios
   open boltexponativewind.xcworkspace
   ```

2. Add the widget extension target:
   - In Xcode, go to `File > New > Target`
   - Select `iOS` tab, then choose `Widget Extension`
   - Name it `StreakWidget`
   - Set the bundle identifier to `com.nofapapp.mobile.widget`
   - Set the language to `Swift`
   - Set the interface to `SwiftUI`
   - Set the deployment target to iOS 14.0 or above
   - Click `Finish`
   - When prompted to activate the scheme, click `Activate`

3. Delete the template files that Xcode created and add the files we've created:
   - Delete the template Swift file and Info.plist that Xcode created
   - Right-click on the StreakWidget group in the Project Navigator
   - Select `Add Files to "StreakWidget"...`
   - Navigate to the `ios/StreakWidget` folder
   - Select `StreakWidget.swift`, `Info.plist`, and `StreakWidget.entitlements`
   - Click `Add`

4. Configure App Groups capabilities:
   - Select the main app target, go to `Signing & Capabilities`
   - Click `+ Capability` and add `App Groups`
   - Add a group with ID `group.com.nofapapp.mobile`
   - Select the widget target, go to `Signing & Capabilities`
   - Click `+ Capability` and add `App Groups`
   - Add the same group with ID `group.com.nofapapp.mobile`

5. Update the widget target's Build Settings:
   - Select the widget target
   - Set `Build Active Architecture Only` to `Yes` for Debug
   - Ensure `iOS Deployment Target` is set to iOS 14.0 or above

6. Run `pod install` to update the Podfile:
   ```
   pod install
   ```

## Testing the Widget

1. Build and run the main app first to ensure it's properly installed on the simulator or device
2. Make sure your streak data is correctly initialized in the app
3. Run the widget extension target in Xcode to test it in the widget gallery
4. On a real device, you can add the widget from the home screen by:
   - Long press on the home screen
   - Tap the "+" icon in the top-left
   - Search for "Streak" and select the NoFap Streak Widget
   - Choose the size and add to your home screen

## Troubleshooting

- If the widget doesn't show the correct streak data:
  - Make sure the app has been run at least once
  - Check that the app group entitlements are correctly configured
  - Verify that the app is correctly saving data to UserDefaults

- If the widget doesn't update after streak changes:
  - The widget updates approximately every 30 minutes
  - You can force a refresh by removing and adding the widget again 