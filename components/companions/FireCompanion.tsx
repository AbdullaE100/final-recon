import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

interface FireCompanionProps {
  stage: 1 | 2 | 3;
  size?: number;
  animate?: boolean;
}

// Define Lottie sources for all stages
const fireLottieSources = {
  1: require('../../assets/lottie/baby_monster_stage1.json'),
  2: require('../../assets/lottie/baby_monster_stage2.json'),
  3: require('../../assets/lottie/baby_monster_stage3.json'),
};

export const FireCompanion: React.FC<FireCompanionProps> = ({ 
  stage = 1,
  size = 200,
  animate = true
}) => {
  // Get animation speed based on stage
  const getAnimationSpeed = () => {
    switch(stage) {
      case 1:
        return 0.7;
      case 2:
        return 0.6;
      case 3:
        return 0.5;
      default:
        return 0.7;
    }
  };
  
  const lottieSource = fireLottieSources[stage];
  
  // Check if source exists
  if (!lottieSource) { 
    return (
      <View style={[styles.container, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{color: 'red'}}>Lottie Error!</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={lottieSource}
        autoPlay={animate}
        loop
        style={{ width: '100%', height: '100%' }}
        speed={getAnimationSpeed()}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default FireCompanion; 