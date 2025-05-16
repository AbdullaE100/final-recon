import React, { useEffect } from 'react';
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

interface PlantCompanionProps {
  stage: 1 | 2 | 3;
  size?: number;
  animate?: boolean;
}

export const PlantCompanion: React.FC<PlantCompanionProps> = ({ 
  stage = 1,
  size = 200,
  animate = true 
}) => {
  const translateY = useSharedValue(0);
  
  useEffect(() => {
    if (animate) {
      // Basic bouncing animation for all stages
      translateY.value = withRepeat(
        withSequence(
          withTiming(-size * 0.02, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(size * 0.02, { duration: 800, easing: Easing.in(Easing.cubic) })
        ),
        -1,
        true
      );
    }
  }, [animate, size, translateY]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value }
      ]
    };
  });

  // Get animation source based on stage
  const getAnimationSource = () => {
    switch(stage) {
      case 1:
        return require('../../assets/lottie/baby_panda_stage1.json');
      case 2:
        return require('../../assets/lottie/baby_panda_stage2.json');
      case 3:
        return require('../../assets/lottie/baby_panda_stage3.json');
      default:
        return require('../../assets/lottie/baby_panda_stage1.json');
    }
  };

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
        <LottieView
          source={getAnimationSource()}
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
        />
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
  }
});

export default PlantCompanion; 