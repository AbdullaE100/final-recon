# Hermes JavaScript Engine Crash Fix

## Problem Analysis
The TestFlight build is crashing due to a Hermes JavaScript engine memory allocation failure during garbage collection. The crash occurs in `hermes::vm::HadesGC::youngGenCollection()` when trying to create string primitives.

## Root Causes Identified

1. **Large Lottie Animation Files**: Multiple 66KB+ Lottie files are being loaded simultaneously
2. **Memory Leak Warning**: Package-lock.json shows a deprecated module that "leaks memory"
3. **Multiple Animation Components**: Several components load Lottie animations concurrently
4. **New Architecture Enabled**: `newArchEnabled: true` in app.json may increase memory pressure

## Immediate Fixes

### 1. Optimize Lottie Animations

```bash
# Check current Lottie file sizes
ls -la assets/lottie/
# Large files found: panda.json (66KB), panda2.json (38KB), panda3.json (35KB)
```

**Action**: Reduce Lottie file sizes by:
- Simplifying animations
- Reducing frame count
- Optimizing vector paths
- Using lower precision values

### 2. Implement Lazy Loading for Lottie Components

Modify Lottie components to load animations on-demand:

```typescript
// Example for PlantCompanion.tsx
const [animationSource, setAnimationSource] = useState(null);

useEffect(() => {
  // Load animation only when component is visible
  const loadAnimation = async () => {
    const source = getAnimationSource();
    setAnimationSource(source);
  };
  loadAnimation();
}, [stage]);

// Only render LottieView when source is loaded
{animationSource && (
  <LottieView
    source={animationSource}
    autoPlay
    loop
    speed={getAnimationSpeed()}
    style={[styles.lottieView, { transform: [{ scale: getAnimationScale() }] }]}
  />
)}
```

### 3. Add Memory Management

Create a Lottie manager to control memory usage:

```typescript
// utils/LottieManager.ts
class LottieManager {
  private static instance: LottieManager;
  private loadedAnimations = new Map();
  private maxConcurrentAnimations = 3;

  static getInstance() {
    if (!LottieManager.instance) {
      LottieManager.instance = new LottieManager();
    }
    return LottieManager.instance;
  }

  loadAnimation(key: string, source: any) {
    if (this.loadedAnimations.size >= this.maxConcurrentAnimations) {
      // Unload oldest animation
      const firstKey = this.loadedAnimations.keys().next().value;
      this.loadedAnimations.delete(firstKey);
    }
    this.loadedAnimations.set(key, source);
    return source;
  }

  unloadAnimation(key: string) {
    this.loadedAnimations.delete(key);
  }
}
```

### 4. Update Metro Configuration

Add memory optimization to metro.config.js:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Node.js core modules in React Native
config.resolver.unstable_enablePackageExports = false;
// Prefer loading modern browser-compatible packages
config.resolver.unstable_conditionNames = ["browser"];

// Add memory optimization
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Optimize asset handling
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
```

### 5. Disable New Architecture Temporarily

In app.json, temporarily disable the new architecture:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": false
          },
          "android": {
            "newArchEnabled": false
          }
        }
      ]
    ]
  }
}
```

### 6. Add Error Boundaries

Wrap Lottie components with error boundaries:

```typescript
// components/LottieErrorBoundary.tsx
import React from 'react';
import { View, Text } from 'react-native';

class LottieErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Lottie Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Animation unavailable</Text>
        </View>
      );
    }

    return this.props.children;
  }
}
```

## Testing Steps

1. **Reduce Lottie file sizes** to under 20KB each
2. **Implement lazy loading** for all Lottie components
3. **Add memory management** with the LottieManager
4. **Disable new architecture** temporarily
5. **Test locally** with development build
6. **Create new production build** with `eas build --platform ios --profile production`
7. **Test on TestFlight** with the optimized build

## Monitoring

After implementing fixes:
- Monitor memory usage in development
- Test on older devices with limited memory
- Use React DevTools Profiler to identify memory leaks
- Check for any remaining Hermes crashes in crash logs

## Long-term Solutions

1. **Replace large Lottie files** with simpler alternatives or static images
2. **Implement animation pooling** to reuse animation instances
3. **Add memory pressure detection** to automatically reduce animations
4. **Consider using React Native Skia** for more efficient animations
5. **Gradually re-enable new architecture** after optimizations

## Emergency Fallback

If crashes persist, temporarily replace all Lottie animations with static images:

```typescript
// Fallback component
const StaticCompanion = ({ stage, type }) => {
  const imageSource = getStaticImageSource(stage, type);
  return <Image source={imageSource} style={styles.companionImage} />;
};
```