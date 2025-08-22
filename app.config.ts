import 'dotenv/config';

export default {
  expo: {
    name: "Pledge",
    slug: "clearmind",
    version: "1.2.0",
    orientation: "portrait",
    icon: "./assets/images/newlogo.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/newlogo.png", // Updated to use the new logo
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      "fallbackToCacheTimeout": 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      "supportsTablet": true,
      "bundleIdentifier": "com.abu2002.clearmind",
      "buildNumber": "40",
      "infoPlist": {
        "UIBackgroundModes": [
          "fetch"
        ]
      }
    },
    android: {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/newlogo.png",
        "backgroundColor": "#FFFFFF"
      }
    },
    web: {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-web-browser"
    ],
    experiments: {
      "typedRoutes": true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "8f82e74f-1ebb-4ef3-bbd4-88c67f8b9790"
      }
    },
  }
}; 