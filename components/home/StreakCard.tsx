import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { getData, STORAGE_KEYS } from '@/utils/storage';
import { useStreak } from '@/context/StreakContext';

interface StreakCardProps {
  streak?: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak: propStreak }) => {
  const gamification = useGamification() || { streak: 0 };
  const { streak: contextStreak, forceRefresh } = useStreak();
  const { colors } = useTheme();
  
  // Add loading state to prevent flash of incorrect values
  const [isLoading, setIsLoading] = useState(true);
  
  // Single source of truth for streak display
  const [displayStreak, setDisplayStreak] = useState(0); // Start at 0 until we're sure
  const prevStreakRef = useRef(displayStreak);
  
  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Check for new user status
  const checkIsNewUser = async () => {
    try {
      const isOnboardingCompleted = await getData(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
      return isOnboardingCompleted === false;
    } catch (e) {
      console.error('StreakCard: Failed to check onboarding status', e);
      return false;
    }
  };
  
  // Initialize streak value once we have data from props/context
  useEffect(() => {
    const initializeStreak = async () => {
      try {
        // Force a refresh to ensure we have the latest streak data
        await forceRefresh();
        
        // Check if this is a new user
        const isNewUser = await checkIsNewUser();
        
        // Use the streak from context or props
        let initialStreak = propStreak ?? contextStreak ?? 0;
        
        // New users always have streak 0
        if (isNewUser) {
          console.log('StreakCard: New user detected - forcing streak to 0');
          initialStreak = 0;
        }
        
        console.log(`StreakCard: Initializing with streak=${initialStreak}, isNewUser=${isNewUser}`);
        
        setDisplayStreak(initialStreak);
        prevStreakRef.current = initialStreak;
        
        // Fade in with the correct value after a short delay
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            })
          ]).start(() => {
            setIsLoading(false);
          });
        }, 500);
      } catch (e) {
        console.error('StreakCard: Failed to initialize streak', e);
        setIsLoading(false);
      }
    };
    
    initializeStreak();
  }, [forceRefresh, propStreak, contextStreak]);
  
  // Handle streak updates from context or props
  useEffect(() => {
    if (!isLoading) {
      (async () => {
        try {
          // Check if this is a new user
          const isNewUser = await checkIsNewUser();
          
          // Get the latest streak value
          let newStreak = propStreak ?? contextStreak ?? 0;
          
          // New users always have a streak of 0
          if (isNewUser) {
            newStreak = 0;
          }
          
          // Only animate if the streak has actually changed
          if (newStreak !== displayStreak) {
            console.log(`StreakCard: Streak changed from ${displayStreak} to ${newStreak}`);
            
            // Different animations for incrementing vs decrementing
            if (newStreak < displayStreak) {
              // For decrements (relapse), fade out and back in with scale down
              Animated.sequence([
                Animated.timing(fadeAnim, {
                  toValue: 0.2,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                  toValue: 0.8,
                  duration: 200,
                  useNativeDriver: true,
                })
              ]).start(() => {
                // Update the value
                setDisplayStreak(newStreak);
                
                // Then animate back in
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                  }),
                  Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                  })
                ]).start();
              });
            } else {
              // For increments, use a bounce effect
              Animated.sequence([
                Animated.timing(fadeAnim, {
                  toValue: 0.5,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                  }),
                  Animated.sequence([
                    Animated.timing(scaleAnim, {
                      toValue: 1.2,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                      toValue: 1,
                      friction: 5,
                      tension: 40,
                      useNativeDriver: true,
                    })
                  ])
                ])
              ]).start(() => {
                // Update the value after animation starts
                setDisplayStreak(newStreak);
              });
            }
            
            // Update ref for next comparison
            prevStreakRef.current = newStreak;
          }
        } catch (error) {
          console.error('StreakCard: Error updating streak:', error);
        }
      })();
    }
  }, [propStreak, contextStreak, isLoading, displayStreak, fadeAnim, scaleAnim]);
  
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

  // Animated style for the number
  const animatedNumberStyle = {
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }]
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
          <View style={styles.streakCountContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <Animated.Text 
                style={[
                  styles.streakCount, 
                  getStreakStyle(),
                  { color: colors.text },
                  animatedNumberStyle,
                ]}
              >
                {displayStreak}
              </Animated.Text>
            )}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>
            Day{displayStreak !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },
  streakCountContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCount: {
    fontSize: 72,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  streakStart: {
    color: '#FFA726', // Gentle orange
  },
  streakBeginner: {
    color: '#66BB6A', // Gentle green
  },
  streakIntermediate: {
    color: '#29B6F6', // Light blue
  },
  streakAdvanced: {
    color: '#AB47BC', // Purple
  },
  streakMaster: {
    color: '#F44336', // Red
  },
  loader: {
    marginVertical: 20,
  }
});