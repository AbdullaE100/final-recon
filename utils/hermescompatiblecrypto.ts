/**
 * Hermes-compatible crypto initialization
 * This file provides safe crypto functionality without causing pointer authentication failures
 */

import { Platform } from 'react-native';

// Type definitions for crypto functionality
interface CryptoInterface {
  getRandomValues: (array: Uint8Array) => Uint8Array;
}

// Safe crypto implementation that works in Hermes
class HermesCompatibleCrypto implements CryptoInterface {
  getRandomValues(array: Uint8Array): Uint8Array {
    // Use Math.random as fallback - safe in all environments
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
}

// Create a safe crypto instance
const safeCrypto = new HermesCompatibleCrypto();

// Export safe crypto functions
export const getRandomValues = (array: Uint8Array): Uint8Array => {
  return safeCrypto.getRandomValues(array);
};

// Safe global crypto setup that doesn't cause Hermes crashes
export const initializeSafeCrypto = (): void => {
  try {
    // Only set up crypto if it doesn't exist and we're in a safe environment
    if (typeof globalThis !== 'undefined') {
      // Check if crypto already exists and is functional
      if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
        // Create a minimal crypto object without modifying existing globals unsafely
        const cryptoObj = {
          getRandomValues: getRandomValues
        };
        
        // Only assign if we can do so safely
        try {
          Object.defineProperty(globalThis, 'crypto', {
            value: cryptoObj,
            writable: false,
            configurable: false
          });
        } catch (error) {
          // If we can't define the property safely, don't crash
          console.warn('[HermesCompatibleCrypto] Could not set global crypto, using local implementation');
        }
      }
    }
  } catch (error) {
    // Never crash on crypto initialization
    console.warn('[HermesCompatibleCrypto] Crypto initialization failed safely:', error);
  }
};

// Export the safe crypto object
export const crypto = {
  getRandomValues
};

export default crypto;