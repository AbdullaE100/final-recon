/**
 * Safe CryptoJS polyfill for Hermes compatibility
 * This replaces the existing cryptoJsPolyfill.ts with a safer implementation
 */

import CryptoJS from 'crypto-js';
import { getRandomValues } from './hermescompatiblecrypto';

// Safe random function that doesn't cause Hermes crashes
const safeRandomFunction = (nBytes: number) => {
  const words = [];
  const bytesPerWord = 4;
  const wordsNeeded = Math.ceil(nBytes / bytesPerWord);
  
  for (let i = 0; i < wordsNeeded; i++) {
    // Use our safe random implementation
    const randomArray = new Uint8Array(4);
    getRandomValues(randomArray);
    
    // Convert bytes to 32-bit word
    const word = (randomArray[0] << 24) | 
                 (randomArray[1] << 16) | 
                 (randomArray[2] << 8) | 
                 randomArray[3];
    words.push(word);
  }
  
  return CryptoJS.lib.WordArray.create(words, nBytes);
};

// Safely patch CryptoJS without causing Hermes issues
const initializeSafeCryptoJS = (): typeof CryptoJS => {
  try {
    // Only patch if CryptoJS exists and has the expected structure
    if (CryptoJS && CryptoJS.lib && CryptoJS.lib.WordArray) {
      // Test if the original random function works
      let needsPatch = false;
      
      try {
        const testResult = CryptoJS.lib.WordArray.random(16);
        // If we get here without crashing, the original might work
        if (!testResult || testResult.words.length === 0) {
          needsPatch = true;
        }
      } catch (error) {
        // Original function failed, we need to patch
        needsPatch = true;
      }
      
      if (needsPatch) {
        // Safely replace the random function
        CryptoJS.lib.WordArray.random = safeRandomFunction;
        console.log('[SafeCryptoJS] Successfully patched CryptoJS.lib.WordArray.random');
      }
    }
  } catch (error) {
    // Never crash on initialization
    console.warn('[SafeCryptoJS] Failed to patch CryptoJS safely:', error);
  }
  
  return CryptoJS;
};

// Initialize and export the safe CryptoJS
const safeCryptoJS = initializeSafeCryptoJS();

export default safeCryptoJS;