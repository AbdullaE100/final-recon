/**
 * This file explicitly initializes CryptoJS and ensures it's patched correctly
 */

// Import CryptoJS directly
import CryptoJS from 'crypto-js';

// Make CryptoJS available globally
if (typeof global.CryptoJS === 'undefined') {
  global.CryptoJS = CryptoJS;
}

// Always patch the WordArray.random method to be deterministic
// This avoids reliance on native crypto which is problematic in Hermes
if (global.CryptoJS && global.CryptoJS.lib && global.CryptoJS.lib.WordArray) {
  global.CryptoJS.lib.WordArray.random = function(nBytes) {
    const words = [];
    
    // Simple deterministic algorithm that works consistently
    for (let i = 0; i < nBytes; i += 4) {
      // Simple position-based generator
      const value = ((i * 23) + 17) % 0xFFFFFFFF;
      words.push(value);
    }
    
    return global.CryptoJS.lib.WordArray.create(words, nBytes);
  };
  
  console.log('[CryptoInit] CryptoJS patched successfully');
}

// Also ensure crypto global exists
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}

// Ensure getRandomValues is available
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = function(typedArray) {
    for (let i = 0; i < typedArray.length; i++) {
      typedArray[i] = Math.floor(Math.random() * 256);
    }
    return typedArray;
  };
}

// For msCrypto compat
if (typeof global.msCrypto === 'undefined') {
  global.msCrypto = global.crypto;
}

export default {}; 