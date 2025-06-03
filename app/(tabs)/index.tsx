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
import LottieView from 'lottie-react-native';
import CompanionChatPrompt from '@/components/home/CompanionChatPrompt';
import { CompanionChatProvider } from '@/context/CompanionChatContext';

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
  const { streak, setStreak, companion, getCompanionStage, achievements } = useGamification();
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
    
    
    // Prevent streaks of 0 from overriding valid streak values 
    if (streak === 0 && streakValueRef.current > 0 && !intentionalReset) {
      
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
          
          setLocalStreak(streakToRestore);
          setForceRender(prev => prev + 1);
        }
        
        // Only turn off updating after everything is stable
        setIsUpdating(false);
      }, 300);
      
      // Force a reload of streak data to refresh calendar after a short delay
      // But keep this outside of the alert flow to avoid racing
      setTimeout(() => {
        try {
          loadStreakData().then(() => {
            
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
      // Add protection against redundant calls
      const currentTimestamp = Date.now();
      const lastRelapseKey = 'clearmind:last-ui-relapse-time';
      
      try {
        // Use correct type for getData
        const lastRelapseTimeStr = await getData<string>(lastRelapseKey, '0');
        const lastRelapseTime = parseInt(lastRelapseTimeStr, 10) || 0;
        
        // If we've processed a relapse in the last 5 seconds, skip this one
        if (currentTimestamp - lastRelapseTime < 5000) {
          
          // Still close the modal to avoid UI being stuck
          setRelapseModalVisible(false);
          return;
        }
        
        // Store this relapse time with string conversion
        await storeData(lastRelapseKey, currentTimestamp.toString());
      } catch (e) {
        console.error('Error checking recent UI relapses:', e);
        // Continue execution even if this check fails
      }
      
      // If streak is already 0, don't process again
      if (localStreak === 0) {
        
        setRelapseModalVisible(false);
        return;
      }
      
      // Immediately close the modal to prevent UI lock
      setRelapseModalVisible(false);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      
      
      // Get the current date to use as relapse date
      const relapseDate = new Date();
      
      // Set updating flag to prevent UI flickers
      setIsUpdating(true);
      
      // Set intentional reset flag to prevent auto-recovery
      setIntentionalReset(true);
      
      // Store the relapse date in storage for the calendar to pick up
      try {
        // Store an explicit flag indicating an intentional relapse has occurred
        await storeData(STORAGE_KEYS.INTENTIONAL_RELAPSE, {
          date: relapseDate.getTime(),
          timestamp: Date.now()
        });
        
        // Get existing relapse dates if any
        const relapseHistoryKey = `${STORAGE_KEYS.RELAPSE_HISTORY}`;
        const existingRelapses = await getData<Date[]>(relapseHistoryKey, []);
        
        // Add today's date to the relapse history
        const updatedRelapses = [...existingRelapses, relapseDate];
        
        // Save back to storage
        await storeData(relapseHistoryKey, updatedRelapses);
        
      } catch (historyError) {
        console.error('Error storing relapse history:', historyError);
      }
      
      // Update local streak immediately to prevent flashing
      setLocalStreak(0);
      
      // Update the ref value to 0 to prevent recovery mechanisms
      streakValueRef.current = 0;
      
      
      
      // Reset streak in context - wrap in try/catch to ensure UI stays responsive
      try {
        // Pass the current date to ensure the relapse is recorded with the right date
        await setStreak(0, relapseDate.getTime());
        
      } catch (streakError) {
        console.error('Error resetting streak:', streakError);
      }
      
      
      
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
      <View style={styles.streakCard}>
        {/* Top section */}
        <View style={styles.streakCardTop}>
          <View style={styles.streakCardLabel}>
            <Flame size={20} color={getStreakColor()} style={styles.flameIcon} />
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
              style={[
                styles.streakCardNumber, 
              { color: getStreakColor() }, 
                streakNumberStyle
              ]}
            >
              {localStreak}
            </Animated.Text>
          <Text style={styles.streakCardUnit}>
              {localStreak === 1 ? 'DAY' : 'DAYS'}
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
            {getMotivationMessage()}
          </Text>
          
          {localStreak > 0 && (
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
            "{quotes[quoteIndex] || quotes[0]}"
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
  const insets = useSafeAreaInsets();
  const { streak, setStreak } = useGamification();

  // Add state for username
  const [username, setUsername] = useState<string>('');
  // Add a loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Load username and streak data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Load user preferences to get username
        interface UserPreferences {
          username?: string;
          [key: string]: any;
        }
        
        const userPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
        if (userPreferences && userPreferences.username) {
          setUsername(userPreferences.username);
        }
        
        
        
        // First try to get the streak data from storage
        const streakData = await getData(STORAGE_KEYS.STREAK_DATA, { 
          streak: 0, 
          lastCheckIn: 0,
          startDate: Date.now()
        });
        
        
        
        // If we have a valid streak, ensure it's set in the context
        if (streakData && typeof streakData.streak === 'number' && !isNaN(streakData.streak) && streakData.streak > 0) {
          if (streakData.streak !== streak) {
            
            
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
          if (backupData && typeof backupData.streak === 'number' && !isNaN(backupData.streak) && backupData.streak > 0) {
            
            await setStreak(backupData.streak, backupData.startDate);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Get personalized greeting
  const getPersonalizedGreeting = () => {
    const greeting = getGreeting();
    return `${greeting}, ${username || 'Friend'}!`;
  };

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
          <Text style={[styles.greetingText, { color: colors.text }]}>
            {getPersonalizedGreeting()}
          </Text>
        </View>

        <StreakCard />
        
        <CompanionChatPrompt />
        
        <BrainMetrics />
        
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