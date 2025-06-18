const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Reset to default behavior for package exports
config.resolver.unstable_enablePackageExports = true;

// Simple resolver configuration
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

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