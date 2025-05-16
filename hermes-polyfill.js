/**
 * Comprehensive Hermes Engine Polyfill
 * 
 * This file provides polyfills to ensure compatibility with code that uses
 * Node.js or browser-specific features not natively available in Hermes.
 */

// Detect Hermes engine
const isHermes = () => !!global.HermesInternal;

// Log the JavaScript engine being used
console.log(`JavaScript Engine: ${isHermes() ? 'Hermes' : 'JSC'}`);

// Polyfill require - a common source of errors in Hermes
if (typeof global.require === 'undefined') {
  // Create a more sophisticated require polyfill that handles common modules
  const requireCache = {};
  
  global.require = function(modulePath) {
    // If the module was already requested, return it from cache
    if (requireCache[modulePath]) {
      return requireCache[modulePath];
    }
    
    console.warn(`Dynamic require("${modulePath}") called - not supported in Hermes`);
    
    // Handle some common module patterns
    if (modulePath === 'crypto') {
      // Provide basic crypto functionality
      requireCache[modulePath] = {
        randomBytes: (size) => {
          const array = new Uint8Array(size);
          for (let i = 0; i < size; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        },
        // Add other crypto methods as needed
      };
    } else if (modulePath === 'path') {
      // Minimal path module implementation
      requireCache[modulePath] = {
        join: (...parts) => parts.join('/').replace(/\/{2,}/g, '/'),
        resolve: (path) => path,
        // Add other path methods as needed
      };
    } else if (modulePath === 'fs') {
      // Empty fs module (most operations will fail safely)
      requireCache[modulePath] = {
        readFileSync: () => {
          throw new Error('fs.readFileSync is not available in React Native');
        },
        // Add other fs methods that return empty results
      };
    } else {
      // Default empty module
      requireCache[modulePath] = {};
    }
    
    return requireCache[modulePath];
  };
}

// Add other missing globals that might be expected
if (typeof global.process === 'undefined') {
  global.process = {
    env: {
      NODE_ENV: __DEV__ ? 'development' : 'production',
    },
    // Add other process properties as needed
  };
}

// Export a sentinel value to confirm this has been loaded
export default { loaded: true }; 