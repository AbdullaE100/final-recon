# NoFap App iOS Widget Implementation

This document provides instructions for implementing and testing the streak counter widget for iOS.

## Widget Features

- Displays current streak count directly on iOS home screen
- Shows streak start date
- Automatically updates when the app updates your streak
- Visually styled to match the app's aesthetic

## Implementation Steps

### 1. Add App Groups Capability

1. Open Xcode and select the main target
2. Go to the "Signing & Capabilities" tab
3. Click "+ Capability" and add "App Groups"
4. Create a new app group with ID `group.com.nofapapp.mobile`

### 2. Create Widget Extension

1. In Xcode, go to File > New > Target
2. Select "Widget Extension" under iOS
3. Name it "StreakWidget"
4. Set language to Swift
5. Click "Finish" 

### 3. Configure Files

The following files have already been created in the project:

- **iOS Native Files:**
  - `ios/StreakWidget/StreakWidget.swift` - The widget implementation
  - `ios/StreakWidget/Info.plist` - Widget configuration
  - `ios/StreakWidget/StreakWidget.entitlements` - Widget entitlements
  - `ios/boltexponativewind/SharedUserDefaults.h` - Header for shared data
  - `ios/boltexponativewind/SharedUserDefaults.m` - Implementation for shared data
  - `ios/WidgetUpdaterModule.h` - Native module header
  - `ios/WidgetUpdaterModule.m` - Native module implementation

- **JavaScript Files:**
  - Updated `utils/streakService.ts` to communicate with the widget
  - Updated `context/GamificationContext.tsx` to update the widget when streak changes

### 4. Configure Xcode Project

1. Open Xcode and your project workspace
2. Add the files in the `ios/StreakWidget` directory to your widget target
3. Add `SharedUserDefaults.h/.m` to your main app target
4. Add `WidgetUpdaterModule.h/.m` to your main app target
5. Build and verify there are no compilation errors

### 5. Testing the Widget

1. Run your app on an iOS device or simulator (iOS 14.0+)
2. Use the app to set or update your streak
3. Add the widget to your home screen:
   - Long press on the home screen
   - Tap the "+" icon in the top-left corner
   - Search for "Streak"
   - Add the widget

## Troubleshooting

### Widget Not Showing Data

If the widget doesn't display streak data:

1. Make sure the app has been run at least once
2. Verify app groups are properly configured
3. Check the logs for any errors in updating widget data
4. Try removing and adding the widget again

### Widget Not Updating

Widgets have a refresh timeline policy:

1. The widget is set to refresh every 30 minutes
2. Force a refresh by:
   - Updating your streak in the app (should trigger immediate update)
   - Removing and adding the widget again
   - Restarting your device

### Common Build Errors

- **Missing files**: Ensure all Swift and Objective-C files are added to the correct targets
- **App Group errors**: Verify signing and capabilities are correctly configured
- **Widget not appearing**: Make sure the widget extension target is enabled for your build scheme

## Technical Details

- The widget uses iOS WidgetKit introduced in iOS 14
- Data is shared between app and widget using App Groups and NSUserDefaults
- The React Native JavaScript bridge updates widget data when streak changes
- The widget has a small memory footprint and minimal battery impact

## Future Enhancements

Potential improvements for the widget:

1. Add medium/large widget sizes with more information
2. Add widget configuration options
3. Add tappable areas to quickly navigate to specific app sections
4. Add visual indicators for streak progress and milestones 