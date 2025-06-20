import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type AnimationStep = 'Breathe In' | 'Hold' | 'Breathe Out';

interface AnimationCycle {
  current: AnimationStep;
  next?: AnimationCycle;
}

const BoxBreathing = () => {
  const { colors } = useTheme();
  const [step, setStep] = useState<AnimationStep>('Breathe In');
  const size = new Animated.Value(100);
  const opacity = new Animated.Value(0.8);

  useEffect(() => {
    const cycle: AnimationCycle = {
      current: 'Breathe In',
      next: {
        current: 'Hold',
        next: {
          current: 'Breathe Out',
          next: {
            current: 'Hold',
          },
        },
      },
    };
    cycle.next!.next!.next!.next = cycle;

    const animate = (currentCycle: AnimationCycle) => {
      setStep(currentCycle.current);
      Animated.parallel([
        Animated.timing(size, {
          toValue: currentCycle.current === 'Hold' ? 150 : 100,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: currentCycle.current === 'Hold' ? 1 : 0.8,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (currentCycle.next) {
          animate(currentCycle.next);
        }
      });
    };
    
    animate(cycle);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.box, 
        { 
          width: size, 
          height: size, 
          backgroundColor: colors.primary,
          opacity: opacity 
        }
      ]} />
      <Text style={[styles.instruction, { color: '#FFFFFF' }]}>{step}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    height: 250,
  },
  box: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute',
  },
});

export default BoxBreathing; 