/**
 * Safe crypto initialization for Hermes compatibility
 * This file replaces crypto-init.js with a safer implementation that doesn't cause crashes
 */

import { initializeSafeCrypto } from './utils/hermescompatiblecrypto';
import './utils/safecryptojspolyfill';

// Initialize crypto safely without causing Hermes crashes
const initializeCrypto = (): void => {
  try {
    // Initialize our safe crypto implementation
    initializeSafeCrypto();
    
    console.log('[SafeCryptoInit] Crypto initialized safely for Hermes');
  } catch (error) {
    // Never crash on crypto initialization
    console.warn('[SafeCryptoInit] Crypto initialization completed with warnings:', error);
  }
};

// Run initialization immediately
initializeCrypto();

export default {};