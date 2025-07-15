import 'dotenv/config';

export default {
  expo: {
    name: "ClearMind",
    slug: "clearmind",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
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
      "infoPlist": {
        "UIBackgroundModes": [
          "fetch"
        ]
      }
    },
    android: {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      }
    },
    web: {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    experiments: {
      "typedRoutes": true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  }
}; 