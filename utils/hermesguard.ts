/**
 * Hermes compatibility guard
 * This file provides runtime checks and safe fallbacks for Hermes-specific issues
 */

// Safe check for crypto availability
export const isCryptoAvailable = (): boolean => {
  try {
    return typeof globalThis !== 'undefined' && 
           typeof globalThis.crypto === 'object' && 
           typeof globalThis.crypto.getRandomValues === 'function';
  } catch (error) {
    return false;
  }
};

// Safe check for global object availability
export const isGlobalSafe = (): boolean => {
  try {
    return typeof globalThis !== 'undefined' && globalThis !== null;
  } catch (error) {
    return false;
  }
};

// Runtime guard for Hermes-specific issues
export const hermesRuntimeGuard = (): void => {
  try {
    // Check if we're in a Hermes environment
    const isHermes = typeof HermesInternal !== 'undefined';
    
    if (isHermes) {
      console.log('[HermesGuard] Running in Hermes environment');
      
      // Ensure crypto is available
      if (!isCryptoAvailable()) {
        console.warn('[HermesGuard] Crypto not available, initializing fallback');
        // Import and initialize our safe crypto
        require('./hermescompatiblecrypto').initializeSafeCrypto();
      }
    }
    
    // Additional safety checks
    if (!isGlobalSafe()) {
      console.warn('[HermesGuard] Global object not safe');
      return;
    }
    
    console.log('[HermesGuard] Runtime checks passed');
  } catch (error) {
    // Never crash on guard checks
    console.warn('[HermesGuard] Runtime guard completed with warnings:', error);
  }
};

// Export a one-liner for easy use in _layout.tsx
export const initializeHermesGuard = (): void => {
  hermesRuntimeGuard();
};

export default {
  isCryptoAvailable,
  isGlobalSafe,
  hermesRuntimeGuard,
  initializeHermesGuard
};