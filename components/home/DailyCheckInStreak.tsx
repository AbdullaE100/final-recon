import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Calendar, Check, Flame, Star, Zap } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { getData, storeData, STORAGE_KEYS } from '@/utils/storage';
import StreakMilestone from './StreakMilestone';

const { width } = Dimensions.get('window');

interface DailyCheckInStreakProps {
  onCheckIn?: (streak: number) => void;
}

interface CheckInData {
  lastCheckIn: string; // ISO date string
  currentStreak: number;
  totalCheckIns: number;
  hasCheckedInToday: boolean;
}

export default function DailyCheckInStreak({ onCheckIn }: DailyCheckInStreakProps) {
  const { colors } = useTheme();
  const [checkInData, setCheckInData] = useState<CheckInData>({
    lastCheckIn: '',
    currentStreak: 0,
    totalCheckIns: 0,
    hasCheckedInToday: false,
  });
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneStreak, setMilestoneStreak] = useState(0);

  // Animation values
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const streakCounterScale = useSharedValue(1);
  const flameRotation = useSharedValue(0);
  const sparkleScale = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  useEffect(() => {
    loadCheckInData();
    
    // Listen for app state changes to refresh when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadCheckInData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const loadCheckInData = async () => {
    try {
      const today = new Date();
      const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const savedData = await getData<CheckInData>(STORAGE_KEYS.DAILY_CHECKIN_STREAK, {
        lastCheckIn: '',
        currentStreak: 0,
        totalCheckIns: 0,
        hasCheckedInToday: false,
      });

      // Check if user has already checked in today
      const hasCheckedInToday = savedData.lastCheckIn === todayDateString;
      
      // If it's a new day, reset the daily flag and check streak continuity
      if (savedData.lastCheckIn !== todayDateString) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDateString = yesterday.toISOString().split('T')[0];
        
        // If last check-in wasn't yesterday and there was a previous check-in, reset streak
        if (savedData.lastCheckIn !== yesterdayDateString && savedData.lastCheckIn !== '') {
          console.log('Streak broken - last check-in was not yesterday');
          savedData.currentStreak = 0;
        }
        
        savedData.hasCheckedInToday = false;
      }

      setCheckInData({ ...savedData, hasCheckedInToday });
    } catch (error) {
      console.error('Error loading check-in data:', error);
    }
  };

  const handleCheckIn = async () => {
    if (checkInData.hasCheckedInToday) return;

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const newStreak = checkInData.currentStreak + 1;
    const newTotalCheckIns = checkInData.totalCheckIns + 1;

    const newCheckInData: CheckInData = {
      lastCheckIn: todayDateString,
      currentStreak: newStreak,
      totalCheckIns: newTotalCheckIns,
      hasCheckedInToday: true,
    };

    try {
      await storeData(STORAGE_KEYS.DAILY_CHECKIN_STREAK, newCheckInData);
      setCheckInData(newCheckInData);
      
      // Trigger animations
      animateCheckIn(newStreak);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Check for milestone
      if (newStreak === 7 || newStreak === 30 || newStreak === 100 || newStreak % 50 === 0) {
        setTimeout(() => {
          setMilestoneStreak(newStreak);
          setShowMilestone(true);
        }, 1000);
      }
      
      // Callback
      onCheckIn?.(newStreak);
    } catch (error) {
      console.error('Error saving check-in data:', error);
    }
  };

  const animateCheckIn = (streak: number) => {
    // Reset all animations
    checkScale.value = 0;
    checkOpacity.value = 0;
    rippleScale.value = 0;
    rippleOpacity.value = 0;
    sparkleScale.value = 0;

    // Ripple effect
    rippleOpacity.value = withTiming(0.6, { duration: 300 });
    rippleScale.value = withTiming(2, { duration: 600 });
    rippleOpacity.value = withDelay(300, withTiming(0, { duration: 300 }));

    // Check mark animation
    checkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    checkScale.value = withDelay(200, withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    ));

    // Card bounce
    cardScale.value = withSequence(
      withTiming(1.05, { duration: 200 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );

    // Streak counter animation
    streakCounterScale.value = withDelay(400, withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    ));

    // Flame rotation for milestones
    if (streak % 7 === 0 || streak % 30 === 0) {
      flameRotation.value = withSequence(
        withTiming(360, { duration: 1000 }),
        withTiming(0, { duration: 0 })
      );
    }

    // Sparkles for special milestones
    if (streak === 7 || streak === 30 || streak === 100) {
      sparkleScale.value = withDelay(600, withSequence(
        withSpring(1, { damping: 8, stiffness: 200 }),
        withDelay(1000, withTiming(0, { duration: 300 }))
      ));
    }
  };

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const streakCounterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakCounterScale.value }],
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flameRotation.value}deg` }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: sparkleScale.value,
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const getStreakMessage = () => {
    if (checkInData.currentStreak === 0) return "Start your daily streak!";
    if (checkInData.currentStreak === 1) return "Great start!";
    if (checkInData.currentStreak < 7) return "Building momentum!";
    if (checkInData.currentStreak < 30) return "On fire! 🔥";
    if (checkInData.currentStreak < 100) return "Incredible dedication!";
    return "Legendary streak! 🌟";
  };

  const getStreakColor = () => {
    if (checkInData.currentStreak === 0) return '#6B7280';
    if (checkInData.currentStreak < 7) return '#10B981';
    if (checkInData.currentStreak < 30) return '#F59E0B';
    if (checkInData.currentStreak < 100) return '#EF4444';
    return '#8B5CF6';
  };



  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.15)', 'rgba(6, 182, 212, 0.1)', 'rgba(239, 68, 68, 0.05)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Ripple effect */}
      <Animated.View style={[styles.ripple, rippleAnimatedStyle]} />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Calendar size={20} color="#8B5CF6" />
          <Text style={styles.title}>Daily Check-in</Text>
        </View>
        
        <Animated.View style={[styles.streakContainer, streakCounterAnimatedStyle]}>
          <Animated.View style={flameAnimatedStyle}>
            <Flame size={18} color={getStreakColor()} />
          </Animated.View>
          <Text style={[styles.streakCount, { color: getStreakColor() }]}>
            {checkInData.currentStreak}
          </Text>
        </Animated.View>
      </View>

      <Text style={styles.message}>{getStreakMessage()}</Text>

      <TouchableOpacity
        style={[
          styles.checkInButton,
          {
            backgroundColor: checkInData.hasCheckedInToday ? '#10B981' : 'rgba(139, 92, 246, 0.2)',
            borderColor: checkInData.hasCheckedInToday ? '#10B981' : '#8B5CF6',
          }
        ]}
        onPress={handleCheckIn}
        disabled={checkInData.hasCheckedInToday}
        activeOpacity={0.8}
      >
        {checkInData.hasCheckedInToday ? (
          <Animated.View style={[styles.checkMark, checkAnimatedStyle]}>
            <Check size={24} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        ) : (
          <View style={styles.checkInContent}>
            <Text style={styles.checkInText}>Check In Today</Text>
            <Zap size={18} color="#8B5CF6" />
          </View>
        )}
      </TouchableOpacity>

      {/* Sparkles for milestones */}
      <Animated.View style={[styles.sparkle, styles.sparkle1, sparkleAnimatedStyle]}>
        <Star size={16} color="#FFD700" />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkle2, sparkleAnimatedStyle]}>
        <Star size={12} color="#FFD700" />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkle3, sparkleAnimatedStyle]}>
        <Star size={14} color="#FFD700" />
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.totalCheckIns}>
          Total check-ins: {checkInData.totalCheckIns}
        </Text>
        {checkInData.lastCheckIn && (
          <Text style={styles.debugText}>
            Last: {checkInData.lastCheckIn}
          </Text>
        )}

      </View>

      {/* Milestone celebration */}
      <StreakMilestone
        visible={showMilestone}
        streak={milestoneStreak}
        onClose={() => setShowMilestone(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  checkInButton: {
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 15,
    minHeight: 56,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    marginRight: 8,
  },
  checkMark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  totalCheckIns: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  debugText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 4,
  },

  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 20,
    right: 30,
  },
  sparkle2: {
    top: 40,
    left: 30,
  },
  sparkle3: {
    bottom: 30,
    right: 40,
  },
});
