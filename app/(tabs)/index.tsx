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
import StreakCardNew from '@/components/home/StreakCardNew';

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

        <StreakCardNew />
        
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