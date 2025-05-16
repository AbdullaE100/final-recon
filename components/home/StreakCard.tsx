import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Clock } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface StreakCardProps {
  streak: number;
}

export default function StreakCard({ streak }: StreakCardProps) {
  const { colors } = useTheme();
  
  // Animated style for the streak counter to bounce when it changes
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(1.05, { damping: 10 }) }],
    };
  });

  let streakMessage = 'Keep going!';
  let streakColor = colors.primary;
  
  if (streak === 0) {
    streakMessage = 'Start your journey today!';
    streakColor = colors.text;
  } else if (streak >= 90) {
    streakMessage = 'Incredible discipline!';
    streakColor = colors.success;
  } else if (streak >= 30) {
    streakMessage = 'Amazing progress!';
    streakColor = colors.success;
  } else if (streak >= 7) {
    streakMessage = 'Building strong habits!';
    streakColor = colors.primary;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.streakHeader}>
        <Clock size={24} color={streakColor} />
        <Text style={[styles.streakLabel, { color: colors.secondaryText }]}>
          Current Streak
        </Text>
      </View>
      
      <View style={styles.streakContent}>
        <Animated.Text 
          style={[
            styles.streakCounter, 
            { color: streakColor },
            animatedStyle
          ]}
        >
          {streak}
        </Animated.Text>
        <Text style={[styles.streakUnit, { color: colors.secondaryText }]}>
          {streak === 1 ? 'Day' : 'Days'}
        </Text>
      </View>
      
      <Text style={[styles.streakMessage, { color: colors.text }]}>
        {streakMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  streakCounter: {
    fontFamily: 'Nunito-Bold',
    fontSize: 48,
    lineHeight: 56,
  },
  streakUnit: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    marginLeft: 4,
    marginBottom: 8,
  },
  streakMessage: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
  }
});