import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface LevelProgressProps {
  level: number;
  progress: number; // 0 to 1
  pointsToNextLevel: number;
  totalPoints: number;
}

export default function LevelProgress({ 
  level, 
  progress, 
  pointsToNextLevel,
  totalPoints 
}: LevelProgressProps) {
  const { colors } = useTheme();
  
  // Animation for progress bar
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress * 100}%`,
      backgroundColor: colors.primary,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.levelHeader}>
        <Text style={[styles.levelLabel, { color: colors.secondaryText }]}>
          Current Level
        </Text>
        <Text style={[styles.levelValue, { color: colors.primary }]}>
          {level}
        </Text>
      </View>
      
      <View style={[styles.progressContainer, { backgroundColor: colors.progressTrack }]}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>
      
      <View style={styles.pointsInfo}>
        <Text style={[styles.pointsText, { color: colors.secondaryText }]}>
          {pointsToNextLevel} points to level {level + 1}
        </Text>
        <Text style={[styles.totalPoints, { color: colors.primary }]}>
          {totalPoints} pts
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
  },
  levelValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  pointsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
  },
  totalPoints: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  }
});