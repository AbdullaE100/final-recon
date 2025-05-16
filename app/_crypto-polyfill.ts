/**
 * This file is automatically loaded by Expo Router (files with underscore prefix)
 * and provides polyfills for crypto-related functionality.
 */
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

// Ensure we're not using any features that require secure random number generation in web
if (Platform.OS === 'web') {
  // Override the random method to not use native secure random
  // This is a simplified approach - in production, you would want a more secure solution
  CryptoJS.lib.WordArray.random = function(nBytes) {
    const words = [];
    const r = (function(m_w) {
      let m_z = 0x3ade68b1;
      const mask = 0xffffffff;

      return function() {
        m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
        m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
        let result = ((m_z << 0x10) + m_w) & mask;
        result /= 0x100000000;
        return result + 0.5;
      };
    })(Math.floor(Math.random() * 0xffffffff));

    for (let i = 0; i < nBytes; i += 4) {
      const _r = r() * 0x100000000;
      const rcache = Math.floor(_r);
      words.push(rcache);
    }
    
    // Create a WordArray using CryptoJS.lib.WordArray.create() instead of .init()
    return CryptoJS.lib.WordArray.create(words, nBytes);
  };

  console.log('[CryptoPolyfill] Initialized for web platform');
}

export default {}; 