// Initialize polyfills for React Native environment
import 'react-native-get-random-values';

// Import comprehensive Hermes polyfills
import './hermes-polyfill.js';

// Import our crypto initialization
import './crypto-init.js';

// Register the app entry point last
import 'expo-router/entry';

// ... existing code ... 