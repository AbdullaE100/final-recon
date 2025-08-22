import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Trophy, Star, Flame, Crown, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface StreakMilestoneProps {
  visible: boolean;
  streak: number;
  onClose: () => void;
}

export default function StreakMilestone({ visible, streak, onClose }: StreakMilestoneProps) {
  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const textScale = useSharedValue(0);
  const sparkle1Scale = useSharedValue(0);
  const sparkle2Scale = useSharedValue(0);
  const sparkle3Scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Trigger celebration animation
      animateCelebration();
      
      // Strong haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-close after 4 seconds
      setTimeout(() => {
        onClose();
      }, 4000);
    } else {
      // Reset animations
      resetAnimations();
    }
  }, [visible]);

  const animateCelebration = () => {
    // Background fade in
    opacity.value = withTiming(1, { duration: 300 });
    
    // Main card bounce in
    scale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );

    // Icon animation
    iconScale.value = withDelay(200, withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    ));

    // Text animation
    textScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 300 }));

    // Sparkles animation
    sparkle1Scale.value = withDelay(600, withSequence(
      withSpring(1, { damping: 8, stiffness: 200 }),
      withDelay(1000, withTiming(0, { duration: 300 }))
    ));
    
    sparkle2Scale.value = withDelay(800, withSequence(
      withSpring(1, { damping: 8, stiffness: 200 }),
      withDelay(800, withTiming(0, { duration: 300 }))
    ));
    
    sparkle3Scale.value = withDelay(1000, withSequence(
      withSpring(1, { damping: 8, stiffness: 200 }),
      withDelay(600, withTiming(0, { duration: 300 }))
    ));
  };

  const resetAnimations = () => {
    scale.value = 0;
    opacity.value = 0;
    iconScale.value = 0;
    textScale.value = 0;
    sparkle1Scale.value = 0;
    sparkle2Scale.value = 0;
    sparkle3Scale.value = 0;
  };

  const getMilestoneData = () => {
    if (streak === 7) {
      return {
        icon: Flame,
        title: "Week Warrior!",
        subtitle: "7 days strong",
        color: '#F59E0B',
        gradient: ['#FCD34D', '#F59E0B'],
      };
    } else if (streak === 30) {
      return {
        icon: Trophy,
        title: "Monthly Master!",
        subtitle: "30 days of dedication",
        color: '#EF4444',
        gradient: ['#FCA5A5', '#EF4444'],
      };
    } else if (streak === 100) {
      return {
        icon: Crown,
        title: "Century Champion!",
        subtitle: "100 days of excellence",
        color: '#8B5CF6',
        gradient: ['#C4B5FD', '#8B5CF6'],
      };
    } else if (streak % 50 === 0) {
      return {
        icon: Star,
        title: "Milestone Achieved!",
        subtitle: `${streak} days of consistency`,
        color: '#10B981',
        gradient: ['#6EE7B7', '#10B981'],
      };
    } else {
      return {
        icon: Zap,
        title: "Streak Milestone!",
        subtitle: `${streak} days and counting`,
        color: '#6366F1',
        gradient: ['#A5B4FC', '#6366F1'],
      };
    }
  };

  const milestoneData = getMilestoneData();
  const MilestoneIcon = milestoneData.icon;

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textScale.value,
  }));

  const sparkle1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle1Scale.value }],
    opacity: sparkle1Scale.value,
  }));

  const sparkle2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle2Scale.value }],
    opacity: sparkle2Scale.value,
  }));

  const sparkle3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle3Scale.value }],
    opacity: sparkle3Scale.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, containerAnimatedStyle]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
        
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <LinearGradient
            colors={milestoneData.gradient}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
            <MilestoneIcon size={60} color="#FFFFFF" strokeWidth={2} />
          </Animated.View>

          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={styles.title}>{milestoneData.title}</Text>
            <Text style={styles.subtitle}>{milestoneData.subtitle}</Text>
          </Animated.View>

          {/* Sparkle effects */}
          <Animated.View style={[styles.sparkle, styles.sparkle1, sparkle1AnimatedStyle]}>
            <Star size={20} color="#FFD700" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle2, sparkle2AnimatedStyle]}>
            <Star size={16} color="#FFD700" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle3, sparkle3AnimatedStyle]}>
            <Star size={18} color="#FFD700" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 30,
    right: 30,
  },
  sparkle2: {
    top: 60,
    left: 40,
  },
  sparkle3: {
    bottom: 40,
    right: 50,
  },
});
