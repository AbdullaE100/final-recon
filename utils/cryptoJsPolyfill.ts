/**
 * This file provides a safe CryptoJS import for React Native
 */
import CryptoJS from 'crypto-js';

// Only patch if absolutely necessary
if (CryptoJS.lib && CryptoJS.lib.WordArray) {
  try {
    // Test if the original random function works
    CryptoJS.lib.WordArray.random(16);
  } catch (error) {
    // Only patch if the original fails
    CryptoJS.lib.WordArray.random = function(nBytes: number) {
      const words = [];
      for (let i = 0; i < nBytes; i += 4) {
        const randomValue = Math.floor(Math.random() * 0x100000000);
        words.push(randomValue);
      }
      
      return CryptoJS.lib.WordArray.create(words, nBytes);
    };
  }
}

export default CryptoJS;