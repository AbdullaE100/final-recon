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
  const animation = useStreakAnimation(streak);
  
  // Calculate the start date based on streak
  const getStreakStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - streak);
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
  
  // Handle relapse confirmation
  const handleRelapseConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStreak(0);
    setRelapseModalVisible(false);
  };
  
  // Handle date selection confirm
  const handleDateConfirm = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStreak(diffDays);
    setDatePickerVisible(false);
  };
  
  // Get motivation message based on streak length
  const getMotivationMessage = () => {
    if (streak === 0) return "Let's start your journey today!";
    if (streak === 1) return "First day - you've got this!";
    if (streak < 7) return "Building momentum - keep going!";
    if (streak < 30) return "Great progress - you're developing new habits!";
    if (streak < 90) return "Impressive discipline - stay strong!";
    return "Extraordinary achievement - truly inspiring!";
  };
  
  // Get streak color based on length
  const getStreakColor = () => {
    if (streak === 0) return colors.text;
    if (streak < 7) return '#3498db';
    if (streak < 30) return '#2ecc71';
    if (streak < 90) return '#f39c12';
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
            {streak}
          </Animated.Text>
          <Text style={[styles.streakCardUnit, { color: colors.secondaryText }]}>
            {streak === 1 ? 'day' : 'days'}
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
          
          {streak > 0 && (
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