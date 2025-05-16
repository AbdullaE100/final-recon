const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Node.js core modules in React Native
config.resolver.unstable_enablePackageExports = false;
// Prefer loading modern browser-compatible packages
config.resolver.unstable_conditionNames = ["browser"];

module.exports = config; 