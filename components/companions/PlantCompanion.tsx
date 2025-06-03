import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing 
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useLottieManager } from '../../utils/LottieManager';

interface PlantCompanionProps {
  stage: 1 | 2 | 3;
  size?: number;
  animate?: boolean;
}

export const PlantCompanion: React.FC<PlantCompanionProps> = ({ 
  stage = 1,
  size = 100,
  animate = true 
}) => {
  const [animationSource, setAnimationSource] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lottieRef = useRef<LottieView>(null);
  const { loadAnimation, unloadAnimation, registerRef, isMemoryPressureHigh } = useLottieManager();
  
  // Basic bouncing animation for all stages
  const bounceValue = useSharedValue(1);

  useEffect(() => {
    // Create a subtle bouncing animation
    bounceValue.value = withRepeat(
      withSequence(
        withTiming(1.05, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, [bounceValue]);

  // Animated style for bouncing
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bounceValue.value }],
    };
  });

  // Load animation with memory management
  useEffect(() => {
    const loadAnimationAsync = async () => {
      try {
        setIsLoading(true);
        const animationKey = `panda_stage_${stage}`;
        
        // Check if memory pressure is high
        if (isMemoryPressureHigh()) {
          console.warn('[PlantCompanion] High memory pressure, skipping animation load');
          setAnimationSource(null);
          setIsLoading(false);
          return;
        }

        // Get animation source based on stage
        let source;
        switch (stage) {
          case 1:
            source = require('../../assets/lottie/baby_panda_stage1.json');
            break;
          case 2:
            source = require('../../assets/lottie/baby_panda_stage2.json');
            break;
          case 3:
            source = require('../../assets/lottie/baby_panda_stage3.json');
            break;
          default:
            source = require('../../assets/lottie/baby_panda_stage1.json');
        }

        // Load through LottieManager
        const managedSource = loadAnimation(animationKey, source);
        setAnimationSource(managedSource);
        
        // Register ref for cleanup
        if (lottieRef.current) {
          registerRef(animationKey, lottieRef);
        }
        
      } catch (error) {
        console.error('[PlantCompanion] Error loading animation:', error);
        setAnimationSource(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimationAsync();

    // Cleanup on unmount
    return () => {
      const animationKey = `panda_stage_${stage}`;
      unloadAnimation(animationKey);
    };
  }, [stage, loadAnimation, unloadAnimation, registerRef, isMemoryPressureHigh]);

  // Determine animation speed based on stage
  const getAnimationSpeed = () => {
    switch(stage) {
      case 1:
        return 0.7; // Normal speed
      case 2:
        return 0.6; // Slightly slower
      case 3:
        return 0.5; // Even slower (more mature)
      default:
        return 0.7;
    }
  };

  // Determine animation scale based on stage
  const getAnimationScale = () => {
    switch(stage) {
      case 1:
        return 0.8; // Smaller for baby stage
      case 2:
        return 0.9; // Medium for juvenile stage
      case 3:
        return 1.0; // Full size for adult stage
      default:
        return 0.8;
    }
  };
  
  // Determine progress based on stage (to show different parts of the animation)
  const getAnimationProgress = () => {
    switch(stage) {
      case 1:
        return { fromFrame: 0, toFrame: 40 }; // Show beginning part
      case 2:
        return { fromFrame: 30, toFrame: 70 }; // Show middle part
      case 3:
        return { fromFrame: 60, toFrame: 120 }; // Show ending part
      default:
        return { fromFrame: 0, toFrame: 40 };
    }
  };

  const { fromFrame, toFrame } = getAnimationProgress();
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.animationContainer, animatedStyle]}>
        {animationSource && !isLoading ? (
          <LottieView
            ref={lottieRef}
            source={animationSource}
            autoPlay={animate}
            loop={true}
            speed={getAnimationSpeed()}
            style={[
              styles.lottieView,
              { transform: [{ scale: getAnimationScale() }] }
            ]}
            // Use specific frames based on the stage
            {...(stage > 1 ? { 
              progress: undefined,
              // The frame properties below are used when not auto-playing
              // If autoPlay is true, these are ignored
              fromFrame: fromFrame,
              toFrame: toFrame
            } : {})}
            onAnimationFailure={(error) => {
              console.error('[PlantCompanion] Animation failed:', error);
              setAnimationSource(null);
            }}
          />
        ) : (
          // Fallback view when animation is loading or failed
          <View style={[styles.lottieView, styles.fallbackView]}>
            {/* You can add a static image or placeholder here */}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieView: {
    width: '100%',
    height: '100%',
  },
  fallbackView: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlantCompanion;