import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, TextInput, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { getData, STORAGE_KEYS, storeData } from '@/utils/storage';
import { useStreak } from '@/context/StreakContext';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Flame, Edit } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  withDelay,
  interpolateColor
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays } from 'date-fns';
import useAchievementNotification from '@/hooks/useAchievementNotification';

const { width } = Dimensions.get('window');

// Change from named export to default export
const StreakCardNew: React.FC = () => {
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
  const colorAnim = useSharedValue(0);
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
      
      // Animate color change
      colorAnim.value = withSequence(
        withTiming(1, { duration: 400 }),
        withDelay(
          1000,
          withTiming(0, { duration: 800 })
        )
      );
      
      prevStreakRef.current = streak;
      
      // Haptic feedback for streak changes
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(
            streak > prevStreakRef.current 
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          ).catch(() => {});
        } catch (error) {}
      }
    }
  }, [streak]);

  // Update streak edit value when streak changes
  useEffect(() => {
    // setStreakEditValue(String(streak || 0)); // This line is removed as per the new_code
  }, [streak]);

  // Animated style for the number
  const animatedNumberStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }]
  }));
  
  // Animated gradient style
  const animatedGradientStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isLoading ? 0.6 : 1, { duration: 300 }),
  }));

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
    try {
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
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
  
  // Handle direct streak edit
  const handleStreakEdit = async () => {
    try {
      // Close the edit modal first
      // setStreakEditModalVisible(false); // This line is removed as per the new_code
      setDatePickerVisible(true); // Open date picker instead
      setIsLoading(true);
      
      // const newStreakValue = parseInt(streakEditValue, 10); // This line is removed as per the new_code
      
      // if (isNaN(newStreakValue) || newStreakValue < 0) { // This line is removed as per the new_code
      //   showAchievement({ // This line is removed as per the new_code
      //     title: 'Invalid Value', // This line is removed as per the new_code
      //     description: 'Please enter a valid number of days.', // This line is removed as per the new_code
      //     buttonText: 'OK' // This line is removed as per the new_code
      //   }); // This line is removed as per the new_code
      //   setIsLoading(false); // This line is removed as per the new_code
      //   return; // This line is removed as per the new_code
      // } // This line is removed as per the new_code
      
      // // Set the new streak value // This line is removed as per the new_code
      // await setStreak(newStreakValue); // This line is removed as per the new_code
      
      // // Show haptic feedback // This line is removed as per the new_code
      // if (Platform.OS !== 'web') { // This line is removed as per the new_code
      //   try { // This line is removed as per the new_code
      //     await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // This line is removed as per the new_code
      //   } catch (error) { // This line is removed as per the new_code
      //     console.error('Error with haptic feedback:', error); // This line is removed as per the new_code
      //   } // This line is removed as per the new_code
      // } // This line is removed as per the new_code
      
      // // Show achievement notification // This line is removed as per the new_code
      // showAchievement({ // This line is removed as per the new_code
      //   title: 'Streak Updated', // This line is removed as per the new_code
      //   description: `Your streak has been set to ${newStreakValue} day${newStreakValue !== 1 ? 's' : ''}.`, // This line is removed as per the new_code
      //   buttonText: 'OK' // This line is removed as per the new_code
      // }); // This line is removed as per the new_code
      
      // // Force refresh to update UI // This line is removed as per the new_code
      // await forceRefresh(); // This line is removed as per the new_code
      // setIsLoading(false); // This line is removed as per the new_code
    } catch (error) {
      console.error('Error updating streak value:', error);
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

  // Date picker modal component
  const DatePickerModal = () => (
    <Modal
      transparent
      visible={isDatePickerVisible}
      animationType="fade"
      onRequestClose={() => setDatePickerVisible(false)}
    >
      <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
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
              if (selectedDate) {
                // Direct confirmation when date is selected
                handleDateConfirm(selectedDate).catch(console.error);
              }
            }}
            style={{ height: 150, width: '100%' }}
            textColor={colors.text}
            maximumDate={new Date()}
          />
          
          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
  
  // Streak edit modal
  const StreakEditModal = () => (
    <Modal
      transparent
      visible={false} // This modal is removed as per the new_code
      animationType="fade"
      onRequestClose={() => {}} // This modal is removed as per the new_code
    >
      <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
        <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.datePickerTitle, { color: colors.text }]}>
            Edit Streak Count
          </Text>
          
          <TextInput
            style={[
              styles.streakInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
            ]}
            value={String(streak || 0)} // This line is removed as per the new_code
            onChangeText={() => {}} // This line is removed as per the new_code
            keyboardType="number-pad"
            placeholder="Enter days"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            autoFocus
          />
          
          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
              onPress={() => {}} // This line is removed as per the new_code
            >
              <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: colors.primary }]}
              onPress={handleStreakEdit} // This line is removed as per the new_code
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
  
  // Relapse confirmation modal
  const RelapseModal = () => (
    <Modal
      transparent
      visible={isRelapseModalVisible}
      animationType="fade"
      onRequestClose={() => setRelapseModalVisible(false)}
    >
      <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
        <View style={styles.relapseModalContainer}>
          <Text style={styles.relapseModalTitle}>
            Reset Streak?
          </Text>
          
          <Text style={styles.relapseModalDescription}>
            This will reset your current streak to 0 and mark today as a relapse day.
          </Text>
          
          <View style={styles.relapseModalActions}>
            <TouchableOpacity
              style={styles.relapseModalCancelButton}
              onPress={() => setRelapseModalVisible(false)}
            >
              <Text style={styles.relapseModalCancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.relapseModalConfirmButton}
              onPress={handleRelapseConfirm}
            >
              <Text style={styles.relapseModalConfirmText}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
  
  // Main render
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.cardWrapper, animatedGradientStyle]}>
        <LinearGradient
          colors={[
            'rgba(30,30,40,0.95)',
            'rgba(20,20,30,0.95)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Flame size={18} color={getStreakColor()} style={styles.flameIcon} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  CURRENT STREAK
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.editButton]}
                onPress={() => setDatePickerVisible(true)}
              >
                <CalendarIcon size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Streak display */}
            <View style={styles.content}>
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  <Animated.Text
                    style={[
                      styles.streakCount,
                      { color: getStreakColor() },
                      animatedNumberStyle
                    ]}
                  >
                    {typeof streak === 'number' ? streak : 0}
                  </Animated.Text>
                  <Text style={[styles.streakUnit, { color: colors.text }]}>
                    {streak === 1 ? 'day' : 'days'}
                  </Text>
                </>
              )}
            </View>

            {/* Footer section */}
            <View style={styles.footer}>
              <View style={styles.dateRow}>
                <CalendarIcon size={18} color={colors.secondaryText} />
                <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                  <Text style={[styles.dateText, { color: colors.secondaryText }]}>
                    Started {formatDate(getStreakStartDate())}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.motivationText, { color: colors.text }]}>
                {getMotivationMessage()}
              </Text>
              <TouchableOpacity
                style={styles.relapseButton}
                onPress={() => setRelapseModalVisible(true)}
              >
                <Text style={styles.relapseButtonText}>
                  Record a Setback
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Modals */}
      <DatePickerModal />
      <RelapseModal />
    </View>
  );
};

export default StreakCardNew;

// Keep the named export for backward compatibility
export { StreakCardNew };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  gradientBackground: {
    borderRadius: 20,
    padding: 1.5,
  },
  card: {
    backgroundColor: 'rgba(25, 25, 35, 0.5)',
    borderRadius: 18.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  headerButtons: {
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
  editStreakButton: {
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  editStreakButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    marginVertical: 12,
  },
  streakCount: {
    fontSize: 96,
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
  streakInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    marginVertical: 16,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  datePickerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relapseModalContainer: {
    width: width * 0.85,
    maxWidth: 340,
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
    gap: 16,
  },
  relapseModalCancelButton: {
    flex: 1,
    backgroundColor: '#23272F',
    borderRadius: 10,
    paddingVertical: 14,
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
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  relapseModalConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
}); 