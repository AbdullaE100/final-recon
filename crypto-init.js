/**
 * This file explicitly initializes CryptoJS and ensures it's patched correctly
 */

// Import CryptoJS directly
import CryptoJS from 'crypto-js';

// Make CryptoJS available globally
if (typeof global.CryptoJS === 'undefined') {
  global.CryptoJS = CryptoJS;
}

// Only patch the random function if needed, without global modifications
if (CryptoJS && CryptoJS.lib && CryptoJS.lib.WordArray) {
  // Store original function
  const originalRandom = CryptoJS.lib.WordArray.random;
  
  // Only patch if the original doesn't work properly
  try {
    originalRandom(16); // Test if it works
  } catch (error) {
    // Only patch if the original fails
    CryptoJS.lib.WordArray.random = function(nBytes) {
      const words = [];
      for (let i = 0; i < nBytes; i += 4) {
        const randomValue = Math.floor(Math.random() * 0x100000000);
        words.push(randomValue);
      }
      
      return CryptoJS.lib.WordArray.create(words, nBytes);
    };
    
    console.log('[CryptoInit] CryptoJS random function patched');
  }
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