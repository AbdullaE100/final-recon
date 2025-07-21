import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { useStreak } from '@/context/StreakContext';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Flame } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays } from 'date-fns';
import useAchievementNotification from '@/hooks/useAchievementNotification';

export const StreakCard: React.FC = () => {
  // Contexts
  const { streak, forceRefresh, setStreakStartDate, recordRelapse, setStreak } = useStreak();
  const { colors } = useTheme();
  const gamification = useGamification();
  const { showAchievement } = useAchievementNotification();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRelapseModalVisible, setRelapseModalVisible] = useState(false);
  
  // Animation
  const fadeAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);
  const prevStreakRef = useRef(streak);
  
  // Animate on streak change
  useEffect(() => {
    if (prevStreakRef.current !== streak) {
      // Animate number change
      fadeAnim.value = withSequence(
        withTiming(0.5, { duration: 200 }),
        withTiming(1, { duration: 400 })
      );
      
      scaleAnim.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withSpring(1, { damping: 12, stiffness: 100 })
      );
      
      prevStreakRef.current = streak;
    }
  }, [streak]);

  // Animated style for the number
  const animatedNumberStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ scale: scaleAnim.value }]
    };
  });

  // Determine streak level and colors
  const getStreakColor = () => {
    if (typeof streak !== 'number' || streak === 0) return colors.text;
    if (streak < 7) return '#3498db'; // Blue
    if (streak < 30) return '#2ecc71'; // Green
    if (streak < 90) return '#f39c12'; // Orange
    return '#e74c3c'; // Red
  };
  
  // Get motivation message based on streak length
  const getMotivationMessage = () => {
    if (typeof streak !== 'number' || streak === 0) return "Let's start your journey today!";
    if (streak === 1) return "First day - you've got this!";
    if (streak < 7) return "Building momentum - keep going!";
    if (streak < 30) return "Great progress - you're developing new habits!";
    if (streak < 90) return "Impressive discipline - stay strong!";
    return "Extraordinary achievement - truly inspiring!";
  };
  
  // Calculate the start date based on streak
  const getStreakStartDate = () => {
    if (gamification?.startDate) {
      return new Date(gamification.startDate);
    }
    
    // Fallback calculation - calculate from today
    const date = new Date();
    if (typeof streak === 'number' && streak > 0) {
      date.setHours(0, 0, 0, 0);  // Start of day
      date.setDate(date.getDate() - (streak - 1));
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
  
  // Handle date selection confirm
  const handleDateConfirm = async (date: Date) => {
    try {
      // Close the date picker first
      setDatePickerVisible(false);
      setIsLoading(true);
      
      // Reset hours/minutes/seconds for proper calculation
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      
      const normalizedToday = new Date();
      normalizedToday.setHours(0, 0, 0, 0);
      
      // Calculate days between the dates (inclusive of start date)
      const diffTime = Math.abs(normalizedToday.getTime() - normalizedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Update the streak start date in the StreakContext
      await setStreakStartDate(normalizedDate);
      
      // Show haptic feedback
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error('Error with haptic feedback:', error);
        }
      }
      
      // Show achievement notification
      showAchievement({
        title: 'Streak Updated',
        description: `Your streak has been updated to ${diffDays} day${diffDays !== 1 ? 's' : ''}.`,
        buttonText: 'OK'
      });
      
      // Force refresh to update UI
      await forceRefresh();
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating streak date:', error);
      setIsLoading(false);
      
      // Show error notification
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
      setRelapseModalVisible(false);
      setIsLoading(true);
      
      // Provide haptic feedback
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (error) {
          console.error('Error with haptic feedback:', error);
        }
      }
      
      // Record relapse for today
      const relapseDate = new Date();
      await recordRelapse(relapseDate);
      
      // Show achievement notification
      showAchievement({
        title: "Streak Reset",
        description: "Your streak has been reset. Today is a new beginning.",
        buttonText: "Continue"
      });
      
      // Force refresh to update UI
      await forceRefresh();
      setIsLoading(false);
    } catch (error) {
      console.error('Error recording relapse:', error);
      setIsLoading(false);
      
      // Show error notification
      showAchievement({
        title: 'Error',
        description: 'There was a problem recording your relapse. Please try again.',
        buttonText: 'OK'
      });
    }
  };
  
  // Date picker modal
  const DatePickerModal = () => (
    <Modal
      transparent
      visible={isDatePickerVisible}
      animationType="fade"
      onRequestClose={() => setDatePickerVisible(false)}
    >
      <BlurView intensity={60} style={styles.modalOverlay}>
        <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.datePickerTitle, { color: colors.text }]}>
            Set Streak Start Date
          </Text>
          <Text style={styles.datePickerSubtitle}>
            Select when your streak began
          </Text>
          
          <DateTimePicker
            value={getStreakStartDate()}
            mode="date"
            display="spinner"
            onChange={(_, selectedDate) => {
              if (selectedDate && handleDateConfirm) handleDateConfirm(selectedDate);
            }}
            style={{ height: 150 }}
            textColor={colors.text}
            maximumDate={new Date()}
          />
          
          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: 'transparent' }]}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={{ color: colors.secondaryText, fontWeight: '500' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
  
  // Relapse confirmation modal
  const RelapseModal = () => (
    <Modal
      transparent
      visible={isRelapseModalVisible}
      animationType="fade"
      onRequestClose={() => setRelapseModalVisible(false)}
    >
      <BlurView intensity={30} tint="dark" style={styles.modalOverlay}>
        <View style={styles.relapseModalContainer}>
          <LinearGradient colors={['#23272F', '#181A20']} style={StyleSheet.absoluteFillObject} />
          <AlertTriangle size={40} color="#FBBF24" style={{ marginBottom: 18 }} />
          <Text style={styles.relapseModalTitle}>
            Record Relapse
          </Text>
          <Text style={styles.relapseModalDescription}>
            This will reset your current streak to 0 days. Remember, this is part of the journey. Each setback is an opportunity to learn and grow stronger.
          </Text>
          <View style={styles.relapseModalActions}>
            <TouchableOpacity
              style={styles.relapseModalCancelButton}
              onPress={() => setRelapseModalVisible(false)}
            >
              <Text style={styles.relapseModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.relapseModalConfirmButton}
              onPress={handleRelapseConfirm}
            >
              <Text style={styles.relapseModalConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}> 
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={styles.gradient}
      >
        {/* Top section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Flame 
              size={20} 
              color={getStreakColor()} 
              style={styles.flameIcon} 
            />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Clean Streak</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setDatePickerVisible(true)}
            hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
          >
            <CalendarIcon size={18} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        </View>
        
        {/* Middle section - streak number */}
        <View style={styles.content}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <Animated.Text 
              style={[
                styles.streakCount,
                { color: getStreakColor() },
                animatedNumberStyle,
              ]}
            >
              {typeof streak === 'number' && !isNaN(streak) ? streak : 0}
            </Animated.Text>
          )}
          <Text style={[styles.streakUnit, { color: colors.text }]}>
            {(typeof streak === 'number' && streak === 1) ? 'DAY' : 'DAYS'}
          </Text>
        </View>
        
        {/* Bottom section */}
        <View style={styles.footer}>
          <View style={styles.dateRow}>
            <Clock size={14} color="rgba(255, 255, 255, 0.5)" />
            <Text style={[styles.dateText, { color: colors.secondaryText }]}>
              Since {formatDate(getStreakStartDate())}
            </Text>
          </View>
          
          <Text style={[styles.motivationText, { color: colors.text }]}>
            {getMotivationMessage()}
          </Text>
          
          {typeof streak === 'number' && streak > 0 && (
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
      </LinearGradient>
      
      {/* Modals */}
      <DatePickerModal />
      <RelapseModal />
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.7,
  },
  editButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginVertical: 12,
  },
  streakCount: {
    fontSize: 80,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  streakUnit: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 4,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 22,
  },
  relapseButton: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,65,65,0.15)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  relapseButtonText: {
    color: '#ff6b6b',
    fontWeight: '600',
    fontSize: 15,
  },
  loader: {
    marginVertical: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    width: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  datePickerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  datePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  relapseModalContainer: {
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
    position: 'relative',
    overflow: 'hidden',
  },
  relapseModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  relapseModalDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 2,
  },
  relapseModalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  relapseModalCancelButton: {
    flex: 1,
    backgroundColor: '#23272F',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  relapseModalCancelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  relapseModalConfirmButton: {
    flex: 1,
    backgroundColor: '#FBBF24',
    borderRadius: 10,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  relapseModalConfirmText: {
    color: '#23272F',
    fontWeight: '700',
    fontSize: 16,
  },
});