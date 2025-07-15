import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Button,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  withSequence,
  withDelay,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Calendar, Clock, Check, Calendar as CalendarIcon, AlertTriangle, Flame, MoreVertical, Sparkles, Zap } from 'lucide-react-native';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { useStreak } from '@/context/StreakContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import BrainMetrics from '@/components/home/BrainMetrics';
import RecoveryCalendar from '@/components/home/RecoveryCalendar';
import { resetAllStreakData, resetStreakToOne } from '@/utils/resetStreakData';
import { storeData, STORAGE_KEYS, getData } from '@/utils/storage';
import useAchievementNotification from '@/hooks/useAchievementNotification';
import LottieView from 'lottie-react-native';
import CompanionChatPrompt from '@/components/home/CompanionChatPrompt';
import { CompanionChatProvider } from '@/context/CompanionChatContext';
import { useAuth } from '@/context/AuthContext';
import { format, addDays, differenceInDays, startOfToday, isBefore, parseISO } from 'date-fns';
import { acquireLock, releaseLock } from '@/utils/processingLock';

const { width, height } = Dimensions.get('window');

const getGreeting = () => {
  const hours = new Date().getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  return 'Good evening';
};

// Custom hook for streak animation
const useStreakAnimation = (value: number, delay = 0) => {
  const animation = useSharedValue(0);
  
  useEffect(() => {
    animation.value = 0;
    animation.value = withDelay(
      delay,
      withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
      )
    );
  }, [value, delay]);
  
  return animation;
};

// Date selection modal for editing streak start date
const DatePickerModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  currentDate = new Date() 
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  currentDate?: Date;
}) => {
  const [date, setDate] = useState(currentDate);
  const { colors } = useTheme();
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={60} style={styles.modalOverlay}>
        <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.datePickerTitle, { color: colors.text }]}>
            Select Start Date
          </Text>
          
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={(_, selectedDate) => {
              if (selectedDate) setDate(selectedDate);
            }}
            style={{ height: 150 }}
            textColor={colors.text}
          />
          
          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: 'transparent' }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.secondaryText, fontWeight: '500' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: colors.primary }]}
              onPress={() => onConfirm(date)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

// Card that shows streak info and allows editing
const StreakCard = () => {
  const { colors } = useTheme();
  const gamification = useGamification();
  const { setStreakStartDate, recordRelapse, forceRefresh } = useStreak();
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRelapseModalVisible, setRelapseModalVisible] = useState(false);
  const [localStreak, setLocalStreak] = useState(gamification?.streak ?? 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [intentionalReset, setIntentionalReset] = useState(false);
  const animation = useStreakAnimation(localStreak);
  const { showAchievement } = useAchievementNotification();
  const streakValueRef = React.useRef(gamification?.streak ?? 0);
  const lastUpdateTimestamp = React.useRef(Date.now());
  const [forceRender, setForceRender] = useState(0);
  const prevStreakRef = React.useRef(gamification?.streak ?? 0);
  const appState = React.useRef(AppState.currentState);
  const lastRefreshDate = React.useRef(new Date());

  // Safely access gamification properties
  const streak = gamification?.streak ?? 0;
  const setStreak = gamification?.setStreak ?? (() => Promise.resolve());
  const companion = gamification?.companion;
  const achievements = gamification?.achievements ?? [];
  
  // Add direct date check to ensure streak is always up to date
  useEffect(() => {
    // This effect runs on mount and ensures the streak is correct based on the current system date
    const checkCurrentDate = async () => {
      try {
        console.log('StreakCard: Performing direct date check');
        
        // Get the current system date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        const todayStr = today.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        
        console.log(`StreakCard: Current system date: ${todayStr}`);
        
        // Force a refresh to ensure we're using the latest system date
        await forceRefresh();
        
        // Get the current streak from context - force a re-render by getting it directly
        const currentStreak = gamification?.streak ?? 0;
        
        console.log(`StreakCard: Current streak from context: ${currentStreak}, local streak: ${localStreak}`);
        
        // Always update the local streak to match the context
        if (currentStreak !== localStreak) {
          console.log(`StreakCard: Direct date check updating streak from ${localStreak} to ${currentStreak}`);
          setLocalStreak(currentStreak);
          streakValueRef.current = currentStreak;
          
          // Trigger animation when streak changes
          animation.value = 0;
          animation.value = withSequence(
            withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
          );
        }
        
        // Force a re-render regardless of whether the streak changed
        setForceRender(prev => prev + 1);
      } catch (error) {
        console.error('StreakCard: Error in checkCurrentDate:', error);
      }
    };
    
    // Run the check immediately
    checkCurrentDate();
    
    // Also set up an interval to check periodically - critical for manual date changes
    const checkInterval = setInterval(checkCurrentDate, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(checkInterval);
  }, [forceRefresh, gamification?.streak, localStreak, animation, setForceRender]);
  
  // Add AppState listener to refresh streak when app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only run this when the app comes to the foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('StreakCard: App has come to the foreground, refreshing streak');
        
        // Always force a refresh when app comes to foreground
        await forceRefresh();
        
        // Get the current streak from context
        const currentStreak = gamification?.streak ?? 0;
        
        // Update local streak if needed
        if (currentStreak !== localStreak) {
          console.log(`StreakCard: AppState change updating streak from ${localStreak} to ${currentStreak}`);
          setLocalStreak(currentStreak);
          streakValueRef.current = currentStreak;
          
          // Trigger animation when streak changes
          animation.value = 0;
          animation.value = withSequence(
            withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
          );
        }
        
        // Update last refresh date
        lastRefreshDate.current = new Date();
      }
      
      appState.current = nextAppState;
    };
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Run an immediate check when this effect is first setup
    handleAppStateChange('active');
    
    // Cleanup subscription
    return () => {
      subscription.remove();
    };
  }, [forceRefresh, gamification?.streak, localStreak, animation]);
  
  // Get companion stage - directly calculate based on badge count for most reliable results
  const unlockedBadgesCount = achievements.filter(badge => badge.unlocked).length;
  const companionStage = unlockedBadgesCount >= 30 ? 3 : unlockedBadgesCount >= 15 ? 2 : 1;
  const companionType = companion?.type || 'water';
  
  // Get companion animation source based on stage and type
  const getCompanionSource = () => {
    if (companionType === 'plant') {
      // Drowsi (Panda) animations
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/panda/panda_stage3.json');
        case 2:
          return require('@/assets/lottie/panda/panda_stage2.json');
        default:
          return require('@/assets/lottie/baby_panda_stage1.json');
      }
    } else if (companionType === 'fire') {
      // Snuglur animations
      switch (companionStage) {
        case 3:
          return require('../../baby monster stage 3.json');
        case 2:
          return require('../../baby monster stage 2.json');
        default:
          return require('../../baby monster stage 1.json');
      }
    } else {
      // Stripes (Tiger) animations
      switch (companionStage) {
        case 3:
          return require('../../baby tiger stage 3.json');
        case 2:
          return require('../../baby tiger stage 2.json');
        default:
          return require('../../baby tiger stage 1.json');
      }
    }
  };
  
  // Keep local state in sync with context
  useEffect(() => {
    const newStreak = gamification?.streak ?? 0;
    
    console.log(`StreakCard: Context streak changed to ${newStreak}, local streak is ${localStreak}`);
    
    // Always update local state to reflect the gamification context's streak
    if (newStreak !== localStreak) {
      console.log(`StreakCard: Updating local streak from ${localStreak} to ${newStreak}`);
      setLocalStreak(newStreak);
      streakValueRef.current = newStreak;
      lastUpdateTimestamp.current = Date.now();
      
      // Trigger animation when streak changes to a non-zero value or from a non-zero to zero
      if (newStreak > 0 || prevStreakRef.current > 0) {
        animation.value = 0;
        animation.value = withSequence(
          withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
        );
      }
      prevStreakRef.current = newStreak; // Update the ref for next comparison
      
      // Force a re-render to ensure the UI updates
      setForceRender(prev => prev + 1);
    }
    
    // Reset intentional reset flag if it was set (it's handled by recordRelapse now)
    if (intentionalReset) {
      setIntentionalReset(false);
    }
    
    // Force a refresh every time this effect runs to ensure we have the latest streak
    const refreshTimer = setTimeout(async () => {
      await forceRefresh();
    }, 1000);
    
    return () => clearTimeout(refreshTimer);
    
  }, [gamification?.streak, localStreak, isUpdating, intentionalReset, animation, forceRefresh, forceRender]);
  
  // Safety recovery mechanism - if streak gets reset unintentionally, restore from ref
  useEffect(() => {
    // This mechanism should only trigger if the local streak becomes 0 unexpectedly
    // and the context streak is still positive, and it's not an intentional reset
    if (localStreak === 0 && (gamification?.streak ?? 0) > 0 && !intentionalReset) {
      console.log('StreakCard: Triggering recovery, localStreak was 0 but context is positive');
      const recoveryTimer = setTimeout(() => {
        setLocalStreak(gamification?.streak ?? 0);
        
        // Force a re-render after recovery
        setForceRender(prev => prev + 1);
      }, 500);
      
      return () => clearTimeout(recoveryTimer);
    }
  }, [localStreak, gamification?.streak, intentionalReset]);
  
  // Calculate the start date based on streak
  const getStreakStartDate = () => {
    // Use streak from context if possible, otherwise use local state
    const streakToUse = gamification?.streak || localStreak;
    
    // Try to get start date from the context first (most accurate)
    if (gamification?.startDate) {
      return new Date(gamification.startDate);
    }
    
    // Fallback calculation - calculate from today
    const date = new Date();
    if (streakToUse > 0) {
      date.setHours(0, 0, 0, 0);  // Start of day
      date.setDate(date.getDate() - (streakToUse - 1));
    }
    return date;
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Animation styles
  const streakNumberStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: animation.value }]
    };
  });
  
  // Handle date selection confirm
  const handleDateConfirm = async (date: Date) => {
    const today = new Date();
    
    // Reset hours/minutes/seconds for proper calculation
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const normalizedToday = new Date();
    normalizedToday.setHours(0, 0, 0, 0);
    
    // Calculate days between the dates (inclusive of start date)
    // Ensure we're using the correct calculation for dates across different years
    const diffTime = Math.abs(normalizedToday.getTime() - normalizedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Ensure streak is calculated correctly (can't be negative)
    const validatedStreakDays = Math.max(0, diffDays);
    
    try {
      // Close the date picker first to prevent visual glitches
      setDatePickerVisible(false);
      
      // Set updating flag to prevent UI flickers
      setIsUpdating(true);
      
      // CRITICAL: Update local UI state IMMEDIATELY for instant feedback
      setLocalStreak(validatedStreakDays);
      
      // Store validated streak in our component-level ref as source of truth
      streakValueRef.current = validatedStreakDays;
      lastUpdateTimestamp.current = Date.now();
      
      // Trigger animation immediately
      animation.value = 0;
      animation.value = withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
      );
      
      // Update the streak in context with the specific start date timestamp
      await setStreak(validatedStreakDays, normalizedDate.getTime());
      
      // IMPORTANT: Also update the streak start date in the StreakContext
      // This ensures the recovery calendar is in sync with the main streak
      try {
        // Update the streak start date in the StreakContext
        await setStreakStartDate(normalizedDate);
        
        console.log(`Synced recovery calendar with streak start date: ${normalizedDate.toISOString()}`);
      } catch (syncError) {
        console.error('Error syncing recovery calendar:', syncError);
      }
      
      // Show immediate visual feedback through haptics
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Replace the Alert with the custom achievement notification
      showAchievement({
        title: 'Streak Updated',
        description: `Your streak has been updated to ${validatedStreakDays} day${validatedStreakDays !== 1 ? 's' : ''}.`,
        buttonText: 'OK'
      });
      
      // CRITICAL: Force streak value to stay at validatedStreakDays
      const streakToRestore = streakValueRef.current;
      setLocalStreak(streakToRestore);
      
      // Force a re-render to ensure UI is updated
      setForceRender(prev => prev + 1);
      
      // Small delay to ensure UI updates after animation completes
      setTimeout(() => {
        if (localStreak !== streakToRestore) {
          setLocalStreak(streakToRestore);
          setForceRender(prev => prev + 1);
        }
        
        // Only turn off updating after everything is stable
        setIsUpdating(false);
      }, 300);
      
    } catch (error) {
      console.error('Error updating streak date:', error);
      // End update mode in case of error
      setIsUpdating(false);
      
      // Replace error Alert with custom notification
      showAchievement({
        title: 'Error',
        description: 'There was a problem updating your streak. Please try again.',
        buttonText: 'OK'
      });
    }
  };
  
  // Handle relapse confirmation
  const handleRelapseConfirm = async () => {
    if (!acquireLock()) {
      console.log('handleRelapseConfirm: Could not acquire lock, aborting.');
      Alert.alert(
        'Processing',
        'Another operation is already in progress. Please wait a moment and try again.'
      );
      return;
    }

    console.log('handleRelapseConfirm: Lock acquired. Starting relapse process...');
    setRelapseModalVisible(false);

    try {
      setLocalStreak(0);
      streakValueRef.current = 0;
      animation.value = withTiming(0.9, { duration: 300 });

      const { resetAllStreakData } = require('@/utils/resetStreakData');
      await resetAllStreakData();

      showAchievement({
        title: 'Streak Reset',
        description: 'Your streak has been reset. Today is a new beginning.',
        buttonText: 'Continue',
      });

      setTimeout(async () => {
        try {
          const { storeData, STORAGE_KEYS } = require('@/utils/storage');
          const { format, startOfToday, addDays } = require('date-fns');
          
          const today = startOfToday();
          const tomorrow = addDays(today, 1);
          
          const history = {
            [format(today, 'yyyy-MM-dd')]: 'relapse',
            [format(tomorrow, 'yyyy-MM-dd')]: 'clean',
          };

          await storeData(STORAGE_KEYS.CALENDAR_HISTORY, history);
          await storeData(STORAGE_KEYS.STREAK_START_DATE, tomorrow.toISOString());
          
          setLocalStreak(1);
          streakValueRef.current = 1;
          animation.value = withTiming(1, { duration: 400 });
          setForceRender((p) => p + 1);

        } catch (error) {
          console.error('handleRelapseConfirm: Error in inner timeout:', error);
        } finally {
          console.log('handleRelapseConfirm: Releasing lock after operation.');
          releaseLock();
        }
      }, 1500);

    } catch (error) {
      console.error('handleRelapseConfirm: Error recording relapse:', error);
      Alert.alert('Error', 'There was a problem recording your relapse.');
      releaseLock();
    }
  };
  
  // Get motivation message based on streak length
  const getMotivationMessage = (streak: number) => {
    if (streak === 0) return "Let's start your journey today!";
    if (streak === 1) return "First day - you've got this!";
    if (streak < 7) return "Building momentum - keep going!";
    if (streak < 30) return "Great progress - you're developing new habits!";
    if (streak < 90) return "Impressive discipline - stay strong!";
    return "Extraordinary achievement - truly inspiring!";
  };
  
  // Get streak color based on length
  const getStreakColor = () => {
    const currentStreak = gamification?.streak ?? 0;
    if (currentStreak === 0) return colors.text;
    if (currentStreak < 7) return '#3498db';
    if (currentStreak < 30) return '#2ecc71';
    if (currentStreak < 90) return '#f39c12';
    return '#e74c3c';
  };
  
  // Relapse confirmation modal
  const RelapseModal = () => (
    <Modal
      transparent
      visible={isRelapseModalVisible}
      animationType="fade"
      onRequestClose={() => setRelapseModalVisible(false)}
    >
      <BlurView intensity={30} tint="dark" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: 320,
          borderRadius: 20,
          padding: 28,
          alignItems: 'center',
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <LinearGradient colors={['#23272F', '#181A20']} style={StyleSheet.absoluteFillObject} />
          <AlertTriangle size={40} color="#FBBF24" style={{ marginBottom: 18 }} />
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' }}>
            Record Relapse
          </Text>
          <Text style={{ fontSize: 15, color: '#D1D5DB', textAlign: 'center', marginBottom: 28, marginTop: 2 }}>
            This will reset your current streak to 0 days. Remember, this is part of the journey. Each setback is an opportunity to learn and grow stronger.
          </Text>
          <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#23272F',
                borderRadius: 10,
                paddingVertical: 12,
                marginRight: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
              onPress={() => setRelapseModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FBBF24',
                borderRadius: 10,
                paddingVertical: 12,
                marginLeft: 8,
                alignItems: 'center',
              }}
              onPress={handleRelapseConfirm}
            >
              <Text style={{ color: '#23272F', fontWeight: '700', fontSize: 16 }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
  
  // If gamification is not available, show a loading state
  if (!gamification) {
    return (
      <View style={styles.streakCardWrapper}>
        <View style={styles.streakCard}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.streakCardWrapper}>
      <View style={styles.streakCard}>
        {/* Top section */}
        <View style={styles.streakCardTop}>
          <View style={styles.streakCardLabel}>
            <Flame 
              size={20} 
              color={getStreakColor()} 
              style={styles.flameIcon} 
              key={`flame-${gamification.streak}-${forceRender}`}
            />
            <Text style={styles.streakCardLabelText}>
              CURRENT STREAK
            </Text>
          </View>
          
          <View style={styles.topRightControls}>
            {/* Companion icon without blue background */}
            {companion && (
              <View style={styles.companionContainer}>
                <LottieView
                  source={getCompanionSource()}
                  autoPlay
                  loop
                  style={styles.companionIcon}
                />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.streakCardEditButton}
              onPress={() => setDatePickerVisible(true)}
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
            >
              <CalendarIcon size={18} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Middle section - clean streak display */}
        <View style={styles.streakCardMiddle}>
            <Animated.Text 
              key={`streak-${forceRender}-${gamification.streak}`}
              style={[
                styles.streakCardNumber, 
              { color: getStreakColor() }, 
                streakNumberStyle
              ]}
            >
              {gamification.streak}
            </Animated.Text>
          <Text style={styles.streakCardUnit}>
              {gamification.streak === 1 ? 'DAY' : 'DAYS'}
            </Text>
        </View>
        
        {/* Bottom section with improved layout */}
        <View style={styles.streakCardBottom}>
          <View style={styles.streakCardDateRow}>
            <Clock size={14} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.streakCardDate}>
              Since {formatDate(getStreakStartDate())}
            </Text>
          </View>
          
          <Text style={styles.streakCardMotivation}>
            {getMotivationMessage(gamification.streak)}
          </Text>
          
          {gamification.streak > 0 && (
            <TouchableOpacity
              style={styles.relapseButton}
              onPress={() => setRelapseModalVisible(true)}
            >
              <Text style={styles.relapseButtonText}>
                Record Relapse
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Date picker modal */}
      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={handleDateConfirm}
        currentDate={getStreakStartDate()}
      />
      
      {/* Relapse confirmation modal */}
      <RelapseModal />
    </View>
  );
};

// Quote of the day
const DailyQuote = () => {
  const { colors } = useTheme();
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  
  const quotes = [
    "Every day is a new opportunity to grow stronger, to live healthier, and to thrive.",
    "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    "Your future is created by what you do today, not tomorrow.",
    "The secret of change is to focus all your energy not on fighting the old, but on building the new.",
    "You don't have to be great to start, but you have to start to be great.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "The only person you should try to be better than is the person you were yesterday.",
    "Strength does not come from what you can do. It comes from overcoming the things you thought you couldn't.",
    "Don't count the days, make the days count.",
    "Discipline is choosing between what you want now and what you want most.",
    "The harder the battle, the sweeter the victory.",
    "It's not about perfect. It's about effort. When you bring that effort every day, that's where transformation happens.",
    "What you resist persists. What you embrace dissolves.",
    "The difference between who you are and who you want to be is what you do.",
    "The man who moves a mountain begins by carrying away small stones.",
    "The pain you feel today will be the strength you feel tomorrow.",
    "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    "It always seems impossible until it's done.",
    "Every accomplishment begins with the decision to try."
  ];
  
  // Get a consistent quote based on the day of the month
  useEffect(() => {
    try {
    const day = new Date().getDate();
      const index = day % quotes.length;
      setQuoteIndex(index >= 0 && index < quotes.length ? index : 0);
    } catch (error) {
      console.error('Error setting initial quote index:', error);
      setQuoteIndex(0);
    }
  }, []);

  // Simple quote rotation without animations
  const rotateQuote = () => {
    try {
      // Simple tap feedback
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch (error) {}
      }
      
      // Update quote index (simple approach)
      setQuoteIndex((prev) => {
        const next = (prev + 1) % quotes.length;
        return next;
      });
    } catch (error) {
      console.error('Error rotating quote:', error);
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={rotateQuote} 
      activeOpacity={0.8}
      style={styles.quoteCardWrapper}
    >
      <LinearGradient
        colors={['rgba(30, 30, 35, 0.8)', 'rgba(20, 20, 25, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quoteCardGradient}
      >
        <View style={styles.quoteInnerBorder}>
      <Text style={[styles.quoteText, { color: colors.secondaryText }]}>
            {`"${quotes[quoteIndex] || quotes[0]}"`}
      </Text>
          
          <View style={styles.quoteActionHint}>
            <Text style={styles.quoteActionText}>Tap for more inspiration</Text>
    </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Main component
export default function HomeScreen() {
  const { colors } = useTheme();
  const gamification = useGamification();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [isUsernameModalVisible, setUsernameModalVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { setStreakStartDate, recordRelapse, forceRefresh } = useStreak();

  useEffect(() => {
    const loadUserData = async () => {
      if (!gamification) return;
      try {
        const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {});
        if (userPreferences && (userPreferences as any).username) {
          setUsername((userPreferences as any).username);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, [gamification]);

  if (!gamification || (gamification as any).isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const {
    getPersonalizedGreeting,
  } = gamification;

  const barStyle = colors.text === '#FFFFFF' || colors.text === '#FFF' || colors.text.toLowerCase() === '#ffffff' ? 'light-content' : 'dark-content';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle={barStyle} />
        
        <View style={styles.headerContainer}>
          <Text style={[styles.greetingText, { color: colors.text }]}>
            {getPersonalizedGreeting(username)}
          </Text>
        </View>

        <StreakCard />
        
        <CompanionChatPrompt />
        
        <BrainMetrics />
        
        <RecoveryCalendar />
        
        <DailyQuote />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  streakCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  streakCard: {
    borderRadius: 20,
    padding: 32,
    backgroundColor: '#181820',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  streakCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  streakCardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameIcon: {
    marginRight: 10,
  },
  streakCardLabelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  streakCardEditButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakCardMiddle: {
    alignItems: 'center',
    marginBottom: 40,
  },
  streakCardNumber: {
    fontSize: 120,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -4,
    lineHeight: 120,
  },
  streakCardUnit: {
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 6,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  streakCardBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 24,
  },
  streakCardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  streakCardDate: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  streakCardMotivation: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 30,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  relapseButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 65, 65, 0.15)',
  },
  relapseButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 80, 80, 0.8)',
    textAlign: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    width: width * 0.85,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  datePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
  },
  quoteCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  quoteCardGradient: {
    borderRadius: 20,
    padding: 2,
  },
  quoteInnerBorder: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(25, 25, 30, 0.7)',
    padding: 20,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  quoteActionHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
    alignItems: 'center',
  },
  quoteActionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companionContainer: {
    width: 42,
    height: 42, 
    marginRight: 4,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  companionIcon: {
    width: 50,
    height: 50,
  },
});