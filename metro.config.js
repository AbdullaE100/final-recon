const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Node.js core modules in React Native
config.resolver.unstable_enablePackageExports = false;
// Prefer loading modern browser-compatible packages
config.resolver.unstable_conditionNames = ["browser"];

// Memory optimization for Hermes
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Optimize asset handling to reduce memory pressure
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Reduce bundle size and memory usage
config.transformer.enableBabelRCLookup = false;
config.transformer.enableBabelRuntime = false;

module.exports = config;