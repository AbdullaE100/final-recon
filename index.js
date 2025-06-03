// Initialize polyfills for React Native environment
import 'react-native-gesture-handler';
import 'react-native-get-random-values';

// Import our safe crypto initialization for Hermes compatibility
import './safeCryptoInit';

// Register the app entry point last
import 'expo-router/entry';

// ... existing code ...