#!/usr/bin/env node

/**
 * Script to add react-native-iap dependency to package.json
 * Run with: node add-iap-dependency.js
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');

try {
  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add react-native-iap dependency
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  
  packageJson.dependencies['react-native-iap'] = '^12.10.7';
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('✅ Successfully added react-native-iap to package.json');
  console.log('📦 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. For iOS: cd ios && pod install');
  console.log('   3. Uncomment the react-native-iap code in utils/inAppPurchase.ts');
  
} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
  process.exit(1);
}