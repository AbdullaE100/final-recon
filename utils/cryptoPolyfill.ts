/**
 * This file provides a polyfill for crypto-related functionality
 * to ensure compatibility across different platforms.
 */
import { Platform } from 'react-native';

const setupCryptoPolyfill = () => {
  // Only needed for web
  if (Platform.OS === 'web') {
    // No need to implement a full polyfill as we're using crypto-js with our 
    // custom implementation that doesn't rely on the native crypto module
    console.log('Crypto polyfill initialized for web platform');
  }
};

export default setupCryptoPolyfill; 