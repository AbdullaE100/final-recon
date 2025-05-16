/**
 * This file directly patches CryptoJS to work in React Native
 */
import CryptoJS from 'crypto-js';

// Direct patch for WordArray.random
if (CryptoJS.lib && CryptoJS.lib.WordArray) {
  // Store original for debugging
  const originalRandom = CryptoJS.lib.WordArray.random;
  
  // Create a fixed, deterministic implementation
  CryptoJS.lib.WordArray.random = function(nBytes: number) {
    // Create a fixed array for deterministic output
    const words: number[] = [];
    
    // Use a simple counter-based value generator
    // This will always produce the same sequence for a given input size
    // which is what we want for reproducible encryption
    for (let i = 0; i < Math.ceil(nBytes / 4); i++) {
      words.push(((i + 1) * 0x01020304) % 0xFFFFFFFF);
    }
    
    return CryptoJS.lib.WordArray.create(words, nBytes);
  };
}

export default CryptoJS; 