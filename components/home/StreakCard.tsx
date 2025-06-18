import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakCardProps {
  streak?: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak: propStreak }) => {
  const { streak: contextStreak } = useGamification();
  const { colors } = useTheme();
  
  // Single source of truth for streak display
  const [displayStreak, setDisplayStreak] = useState(propStreak ?? contextStreak ?? 0);
  const prevStreakRef = useRef(displayStreak);
  const animatedValue = useRef(new Animated.Value(1)).current;
  
  // Consolidate streak update logic into a single effect
  useEffect(() => {
    const newStreak = propStreak ?? contextStreak ?? 0;
    
    if (newStreak !== displayStreak) {
      // Animate the change
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
      
      setDisplayStreak(newStreak);
      prevStreakRef.current = newStreak;
    }
  }, [propStreak, contextStreak]);
  
  // Determine streak level and colors
  const getStreakStyle = () => {
    if (displayStreak === 0) {
      return styles.streakStart;
    } else if (displayStreak >= 90) {
      return styles.streakMaster;
    } else if (displayStreak >= 30) {
      return styles.streakAdvanced;
    } else if (displayStreak >= 7) {
      return styles.streakIntermediate;
    }
    return styles.streakBeginner;
  };

  return (
    <BlurView intensity={20} tint="dark" style={[styles.container, { borderColor: colors.border }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>
            Clean Streak
        </Text>
          <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
            <Text style={[styles.streakCount, getStreakStyle(), { color: colors.text }]}>
              {displayStreak}
        </Text>
          </Animated.View>
          <Text style={[styles.label, { color: colors.text }]}>
            {displayStreak === 1 ? 'Day' : 'Days'}
      </Text>
    </View>
      </LinearGradient>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  gradient: {
    borderRadius: 15,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    opacity: 0.8,
  },
  streakCount: {
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  streakStart: {
    color: '#FFA500',
  },
  streakBeginner: {
    color: '#4CAF50',
  },
  streakIntermediate: {
    color: '#2196F3',
  },
  streakAdvanced: {
    color: '#9C27B0',
  },
  streakMaster: {
    color: '#F44336',
  },
});