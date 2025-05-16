import React, { useEffect, useState } from 'react';
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
  withDelay
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Calendar, Clock, Check, Calendar as CalendarIcon, AlertTriangle, Flame } from 'lucide-react-native';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import BrainMetrics from '@/components/home/BrainMetrics';
import StreakCalendar from '@/components/home/StreakCalendar';
import { setFailsafeStreakValue } from '@/utils/streakService';
import { storeData, STORAGE_KEYS, getData } from '@/utils/storage';
import { loadStreakData } from '@/utils/streakService';
import useAchievementNotification from '@/hooks/useAchievementNotification';

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
            maximumDate={new Date()}
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
  const { streak, setStreak } = useGamification();
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRelapseModalVisible, setRelapseModalVisible] = useState(false);
  const [localStreak, setLocalStreak] = useState(streak);
  const [isUpdating, setIsUpdating] = useState(false);
  const [intentionalReset, setIntentionalReset] = useState(false);
  const animation = useStreakAnimation(localStreak);
  const { showAchievement } = useAchievementNotification();
  
  // Create a persistent ref at component level to track streak values
  const streakValueRef = React.useRef(streak > 0 ? streak : localStreak);
  
  // Add a backup timestamp to help detect and prevent race conditions
  const lastUpdateTimestamp = React.useRef(Date.now());
  
  // Force a re-render if needed
  const [forceRender, setForceRender] = useState(0);
  
  // Keep local state in sync with context
  useEffect(() => {
    console.log(`Streak changed in context: ${streak}, updating local state, current ref value: ${streakValueRef.current}`);
    
    // Prevent streaks of 0 from overriding valid streak values 
    if (streak === 0 && streakValueRef.current > 0 && !intentionalReset) {
      console.log(`Preventing context reset from ${streakValueRef.current} to 0`);
      return;
    }
    
    // Only update if not in the middle of a manual update
    if (!isUpdating) {
      // Update state and ref if streak is valid
      if (streak > 0 || intentionalReset) {
        setLocalStreak(streak);
        streakValueRef.current = streak;
        lastUpdateTimestamp.current = Date.now();
        
        // Reset intentional reset flag after it's been applied
        if (intentionalReset) {
          setIntentionalReset(false);
        }
        
        // Trigger animation when streak changes
        animation.value = 0;
        animation.value = withSequence(
          withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
        );
      } else if (streakValueRef.current === 0) {
        // Only update to 0 if the ref is also 0 (legitimate reset)
        setLocalStreak(0);
      }
    }
  }, [streak, isUpdating, intentionalReset]);
  
  // Safety recovery mechanism - if streak gets reset unintentionally, restore from ref
  useEffect(() => {
    if (localStreak === 0 && streakValueRef.current > 0 && !intentionalReset) {
      console.log(`Detected streak reset - recovering from ${streakValueRef.current}`);
      
      // Schedule recovery to avoid immediate state conflicts
      const recoveryTimer = setTimeout(() => {
        setLocalStreak(streakValueRef.current);
        
        // Force a re-render after recovery
        setForceRender(prev => prev + 1);
      }, 500);
      
      return () => clearTimeout(recoveryTimer);
    }
  }, [localStreak, intentionalReset]);
  
  // Calculate the start date based on streak
  const getStreakStartDate = () => {
    // Use the ref value as the source of truth for calculations
    const streakToUse = streakValueRef.current > 0 ? streakValueRef.current : localStreak;
    const date = new Date();
    date.setDate(date.getDate() - streakToUse);
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
    
    console.log(`User selected date: ${normalizedDate.toISOString()}`);
    console.log(`Today's date: ${normalizedToday.toISOString()}`);
    console.log(`Calculated streak: ${validatedStreakDays} days`);
    
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
      
      // Backup the streak value to storage immediately for redundancy
      try {
        await storeData(STORAGE_KEYS.STREAK_DATA, {
          streak: validatedStreakDays,
          lastCheckIn: Date.now(),
          startDate: normalizedDate.getTime()
        });
      } catch (storageError) {
        console.error('Error in redundant storage update:', storageError);
      }
      
      // Update the streak in context with the specific start date timestamp
      await setStreak(validatedStreakDays, normalizedDate.getTime());
      
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
          console.log(`Streak mismatch detected, forcing restore to ${streakToRestore}`);
          setLocalStreak(streakToRestore);
          setForceRender(prev => prev + 1);
        }
        console.log(`Final streak update confirmation: ${streakToRestore} days`);
        // Only turn off updating after everything is stable
        setIsUpdating(false);
      }, 300);
      
      // Force a reload of streak data to refresh calendar after a short delay
      // But keep this outside of the alert flow to avoid racing
      setTimeout(() => {
        try {
          loadStreakData().then(() => {
            console.log('Streak data reloaded successfully after date change');
            // Only update if we're losing our value - otherwise keep the local value
            if (isUpdating && streakValueRef.current !== 0) {
              setLocalStreak(streakValueRef.current);
              setForceRender(prev => prev + 1);
            }
          }).catch(error => {
            console.error('Error reloading streak data:', error);
            if (isUpdating) {
              // Keep streak value consistent
              setLocalStreak(streakValueRef.current);
              setForceRender(prev => prev + 1);
            }
            // End update mode in case of error
            setIsUpdating(false);
          });
        } catch (error) {
          console.error('Failed to call loadStreakData:', error);
          if (isUpdating) {
            // Keep streak value consistent
            setLocalStreak(streakValueRef.current);
            setForceRender(prev => prev + 1);
          }
          // End update mode in case of error
          setIsUpdating(false);
        }
      }, 1000); // Increased from 500ms to 1000ms to avoid race conditions
      
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
    try {
      // Immediately close the modal to prevent UI lock
      setRelapseModalVisible(false);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      console.log('Starting relapse process...');
      
      // Set updating flag to prevent UI flickers
      setIsUpdating(true);
      
      // Set intentional reset flag to prevent auto-recovery
      setIntentionalReset(true);
      
      // Update local streak immediately to prevent flashing
      setLocalStreak(0);
      
      // Update the ref value to 0 to prevent recovery mechanisms
      streakValueRef.current = 0;
      
      console.log('Local state updated, calling setStreak...');
      
      // Reset streak in context - wrap in try/catch to ensure UI stays responsive
      try {
        await setStreak(0);
        console.log('Streak reset successful');
      } catch (streakError) {
        console.error('Error resetting streak:', streakError);
      }
      
      console.log('Showing feedback notification...');
      
      // Show feedback to the user - wrap in try/catch to prevent crashes
      try {
        showAchievement({
          title: "Streak Reset",
          description: "Your streak has been reset. Today is a new beginning.",
          buttonText: "Continue"
        });
      } catch (notificationError) {
        console.error('Error showing achievement notification:', notificationError);
        // Fallback to Alert if achievement notification fails
        Alert.alert(
          "Streak Reset",
          "Your streak has been reset. Today is a new beginning.",
          [{ text: "Continue" }]
        );
      }
    } catch (error) {
      console.error('Error in handleRelapseConfirm:', error);
      // Ensure UI is not stuck if there's an error
      setRelapseModalVisible(false);
    } finally {
      // Always reset updating flag, even if there's an error
      setTimeout(() => {
        setIsUpdating(false);
        console.log('Relapse process complete, UI unlocked');
      }, 500);
    }
  };
  
  // Get motivation message based on streak length
  const getMotivationMessage = () => {
    if (localStreak === 0) return "Let's start your journey today!";
    if (localStreak === 1) return "First day - you've got this!";
    if (localStreak < 7) return "Building momentum - keep going!";
    if (localStreak < 30) return "Great progress - you're developing new habits!";
    if (localStreak < 90) return "Impressive discipline - stay strong!";
    return "Extraordinary achievement - truly inspiring!";
  };
  
  // Get streak color based on length
  const getStreakColor = () => {
    if (localStreak === 0) return colors.text;
    if (localStreak < 7) return '#3498db';
    if (localStreak < 30) return '#2ecc71';
    if (localStreak < 90) return '#f39c12';
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
      <BlurView intensity={60} style={styles.modalOverlay}>
        <View style={[styles.relapseModalContainer, { backgroundColor: colors.card }]}>
          <View style={styles.relapseModalIcon}>
            <AlertTriangle size={40} color="#f39c12" />
          </View>
          
          <Text style={[styles.relapseModalTitle, { color: colors.text }]}>
            Record Relapse
          </Text>
          
          <Text style={[styles.relapseModalMessage, { color: colors.secondaryText }]}>
            This will reset your current streak to 0 days. Remember, this is part of the journey. Each setback is an opportunity to learn and grow stronger.
          </Text>
          
          <View style={styles.relapseModalActions}>
            <TouchableOpacity
              style={styles.relapseModalCancelButton}
              onPress={() => setRelapseModalVisible(false)}
            >
              <Text style={{ color: colors.secondaryText, fontWeight: '500' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.relapseModalConfirmButton}
              onPress={handleRelapseConfirm}
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
  
  return (
    <View style={styles.streakCardWrapper}>
      <LinearGradient
        colors={['rgba(30, 30, 30, 0.7)', 'rgba(18, 18, 18, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCard}
      >
        {/* Top section */}
        <View style={styles.streakCardTop}>
          <View style={styles.streakCardLabel}>
            <Flame size={20} color={getStreakColor()} />
            <Text style={[styles.streakCardLabelText, { color: colors.text }]}>
              CURRENT STREAK
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.streakCardEditButton}
            onPress={() => setDatePickerVisible(true)}
            hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
          >
            <CalendarIcon size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
        
        {/* Middle section - streak count */}
        <View style={styles.streakCardMiddle}>
          <Animated.Text style={[styles.streakCardNumber, { color: getStreakColor() }, streakNumberStyle]}>
            {localStreak}
          </Animated.Text>
          <Text style={[styles.streakCardUnit, { color: colors.secondaryText }]}>
            {localStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
        
        {/* Bottom section */}
        <View style={styles.streakCardBottom}>
          <View style={styles.streakCardDateRow}>
            <Clock size={16} color={colors.secondaryText} />
            <Text style={[styles.streakCardDate, { color: colors.secondaryText }]}>
              Since {formatDate(getStreakStartDate())}
            </Text>
          </View>
          
          <Text style={[styles.streakCardMotivation, { color: colors.text }]}>
            {getMotivationMessage()}
          </Text>
          
          {localStreak > 0 && (
            <TouchableOpacity
              style={styles.relapseButton}
              onPress={() => setRelapseModalVisible(true)}
            >
              <AlertTriangle size={16} color="#f39c12" />
              <Text style={styles.relapseButtonText}>
                Record Relapse
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
      
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

// Daily Check-in Button
const CheckInButton = () => {
  const { dailyCheckedIn, checkIn } = useGamification();
  const { colors } = useTheme();
  
  const scaleAnim = useSharedValue(1);
  
  const handlePress = () => {
    if (!dailyCheckedIn) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      scaleAnim.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );
      checkIn();
    }
  };
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }]
    };
  });
  
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.checkInButton,
          dailyCheckedIn ? styles.checkInButtonCompleted : null
        ]}
        onPress={handlePress}
        disabled={dailyCheckedIn}
      >
        <LinearGradient
          colors={dailyCheckedIn ? ['#2ecc71', '#27ae60'] : ['#3498db', '#2980b9']}
          style={styles.checkInButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {dailyCheckedIn ? (
            <Check size={20} color="#FFFFFF" />
          ) : (
            <Flame size={20} color="#FFFFFF" />
          )}
          <Text style={styles.checkInButtonText}>
            {dailyCheckedIn ? 'Checked In Today' : 'Daily Check-in'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Quote of the day
const DailyQuote = () => {
  const { colors } = useTheme();
  
  const quotes = [
    "Every day is a new opportunity to grow stronger, to live healthier, and to thrive.",
    "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    "Your future is created by what you do today, not tomorrow.",
    "The secret of change is to focus all your energy not on fighting the old, but on building the new.",
    "You don't have to be great to start, but you have to start to be great.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "The only person you should try to be better than is the person you were yesterday."
  ];
  
  // Get a consistent quote based on the day of the month
  const getQuoteOfTheDay = () => {
    const day = new Date().getDate();
    return quotes[day % quotes.length];
  };
  
  return (
    <View style={styles.quoteContainer}>
      <Text style={[styles.quoteText, { color: colors.secondaryText }]}>
        "{getQuoteOfTheDay()}"
      </Text>
    </View>
  );
};

// Main component
export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { streak, setStreak } = useGamification();

  // Add a loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Add this effect to ensure streak data is loaded properly on launch
  useEffect(() => {
    // Initialize streak data on component mount
    const initializeStreakData = async () => {
      try {
        setIsLoading(true);
        console.log('Initializing streak data on app launch');
        
        // First try to get the streak data from storage
        const streakData = await getData(STORAGE_KEYS.STREAK_DATA, { 
          streak: 0, 
          lastCheckIn: 0,
          startDate: Date.now()
        });
        
        console.log(`Loaded initial streak data:`, streakData);
        
        // If we have a valid streak, ensure it's set in the context
        if (streakData && streakData.streak > 0) {
          if (streakData.streak !== streak) {
            console.log(`Setting initial streak to ${streakData.streak} from storage`);
            
            // Use the startDate from storage if available
            const startDate = streakData.startDate || (() => {
              const date = new Date();
              date.setDate(date.getDate() - streakData.streak);
              return date.getTime();
            })();
            
            // Set the streak with the correct start date
            await setStreak(streakData.streak, startDate);
          }
        }
        
        // Also load streak data from the service as a double-check
        await loadStreakData();
        
        // Additional safety check - if the streak is 0 but should be non-zero
        // For example if this value was overridden by a race condition
        if (streak === 0) {
          const backupData = await getData(STORAGE_KEYS.STREAK_DATA, {
            streak: 0,
            lastCheckIn: 0,
            startDate: Date.now()
          });
          if (backupData && backupData.streak > 0) {
            console.log('Recovery: Found non-zero streak in storage while context has 0');
            await setStreak(backupData.streak, backupData.startDate);
          }
        }
      } catch (error) {
        console.error('Error initializing streak data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeStreakData();
  }, []);

  // Determine StatusBar style based on text color (simple heuristic for light/dark background)
  const barStyle = colors.text === '#FFFFFF' || colors.text === '#FFF' || colors.text.toLowerCase() === '#ffffff' ? 'light-content' : 'dark-content';
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          <Text style={[styles.greetingText, { color: colors.text }]}>{getGreeting()}, User!</Text>
          {/* You can add a user name here if available */}
        </View>

        <StreakCard />
        
        <BrainMetrics />

        <CheckInButton />
        
        <StreakCalendar />
        
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
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  streakCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakCardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakCardLabelText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 1,
  },
  streakCardEditButton: {
    padding: 4,
  },
  streakCardMiddle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  streakCardNumber: {
    fontSize: 80,
    fontWeight: '700',
    marginBottom: 4,
  },
  streakCardUnit: {
    fontSize: 18,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakCardBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  streakCardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakCardDate: {
    fontSize: 14,
    marginLeft: 8,
  },
  streakCardMotivation: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  relapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  relapseButtonText: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Check-in button styles
  checkInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  checkInButtonCompleted: {
    opacity: 0.8,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  relapseModalContainer: {
    width: width * 0.85,
    borderRadius: 20,
    padding: 24,
  },
  relapseModalIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  relapseModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  relapseModalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  relapseModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relapseModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  relapseModalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#f39c12',
  },
  quoteContainer: {
    marginBottom: 24,
  },
  quoteText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    lineHeight: 22,
  },
});