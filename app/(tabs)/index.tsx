import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  AppState,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { useStreak } from '@/context/StreakContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Brain,
  Zap,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react-native';
import useAchievementNotification from '@/hooks/useAchievementNotification';
import CompanionCard from '@/components/home/CompanionCard';
import ChallengePreview from '@/components/home/ChallengePreview';
import BrainMetrics from '@/components/home/BrainMetrics';
import CompanionChatPrompt from '@/components/home/CompanionChatPrompt';
import { useAuth } from '@/context/AuthContext';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const { streak: contextStreak, performRelapse } = useStreak();
  const { user } = useAuth();
  const { showAchievement } = useAchievementNotification();
  const { activeChallenges } = useGamification() || {}; // Get active challenges

  const [localStreak, setLocalStreak] = useState(contextStreak);
  const [isRelapseModalVisible, setRelapseModalVisible] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  const streakValueRef = useRef(contextStreak);
  const animation = useSharedValue(1);

  useEffect(() => {
    setLocalStreak(contextStreak);
    streakValueRef.current = contextStreak;
  }, [contextStreak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animation.value }],
  }));

  const handleRelapseConfirm = async () => {
    console.log('handleRelapseConfirm: Initiating relapse process.');
    setRelapseModalVisible(false);

    setLocalStreak(0);
    animation.value = withTiming(0, { duration: 400 });

    try {
      await performRelapse();
      console.log('handleRelapseConfirm: Centralized relapse function has completed.');
      showAchievement({
        title: 'Streak Reset',
        description: 'A new journey begins now.',
        buttonText: 'Continue',
      });
    } catch (error) {
      console.error('handleRelapseConfirm: Error during performRelapse call', error);
      Alert.alert('Error', 'An unexpected error occurred while resetting your streak.');
    }
  };

  const getMotivationMessage = (streak: number) => {
    if (streak === 0) return "Let's start your journey today!";
    if (streak === 1) return "First day - you've got this!";
    if (streak < 7) return 'Building momentum - keep going!';
    if (streak < 30) return "Great progress - you're developing new habits!";
    if (streak < 90) return 'Impressive discipline - stay strong!';
    return 'Extraordinary achievement - truly inspiring!';
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.background]} // Use background as fallback
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.greeting, { color: colors.text }]}>
          {getGreeting()}, {user?.email || 'User'}
        </Text>

        <TouchableOpacity onPress={() => setRelapseModalVisible(true)}>
          <Animated.View style={[styles.streakCardWrapper, animatedStyle]}>
            <BlurView intensity={30} tint="dark" style={styles.streakCard}>
              <Text style={[styles.streakLabel, { color: colors.text }]}>Current Streak</Text>
              <Text style={[styles.streakCount, { color: colors.primary }]}>{localStreak}</Text>
              <Text style={[styles.streakLabel, { color: colors.text }]}>
                {localStreak === 1 ? 'Day' : 'Days'}
              </Text>
            </BlurView>
          </Animated.View>
        </TouchableOpacity>

        <Text style={[styles.motivation, { color: colors.text }]}>
          {getMotivationMessage(localStreak)}
        </Text>

        <CompanionCard />
        {activeChallenges && activeChallenges.length > 0 && (
          <ChallengePreview challenge={activeChallenges[0]} />
        )}
        <BrainMetrics />
        <CompanionChatPrompt />
      </ScrollView>

      <Modal
        transparent
        visible={isRelapseModalVisible}
        animationType="fade"
        onRequestClose={() => setRelapseModalVisible(false)}
      >
        <BlurView intensity={30} tint="dark" style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <AlertTriangle size={40} color="#FBBF24" style={{ marginBottom: 18 }} />
            <Text style={styles.modalTitle}>Record Relapse</Text>
            <Text style={styles.modalDescription}>
              This will reset your current streak to 0 days. Remember, this is part of the journey.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setRelapseModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleRelapseConfirm}>
                <Text style={styles.modalButtonTextPrimary}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  streakCardWrapper: {
    marginBottom: 16,
  },
  streakCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  streakLabel: {
    fontSize: 16,
    opacity: 0.8,
  },
  streakCount: {
    fontSize: 80,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  motivation: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 28,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#FBBF24',
    borderRadius: 10,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalButtonTextPrimary: {
    color: '#23272F',
    fontWeight: '700',
    fontSize: 16,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#23272F',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalButtonTextSecondary: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});