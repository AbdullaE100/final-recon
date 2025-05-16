import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Award, SquareCheck as CheckSquare } from 'lucide-react-native';
import { Challenge } from '@/types/gamification';

interface ChallengePreviewProps {
  challenge: Challenge;
}

export default function ChallengePreview({ challenge }: ChallengePreviewProps) {
  const { colors } = useTheme();
  
  // Progress percentage
  const progress = challenge.progress ? challenge.progress : 0;
  
  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        {challenge.isDaily ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>Daily</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Text style={styles.badgeText}>Weekly</Text>
          </View>
        )}
        
        <View style={styles.pointsContainer}>
          <Text style={[styles.pointsText, { color: colors.primary }]}>
            +{challenge.points} pts
          </Text>
        </View>
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {challenge.title}
      </Text>
      
      <Text style={[styles.description, { color: colors.secondaryText }]}>
        {challenge.description}
      </Text>
      
      <View style={styles.footer}>
        <View style={[styles.progressContainer, { backgroundColor: colors.progressTrack }]}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progress}%`,
                backgroundColor: colors.primary 
              }
            ]} 
          />
        </View>
        
        <View style={styles.progressTextContainer}>
          <Text style={[styles.progressText, { color: colors.secondaryText }]}>
            {progress}% Complete
          </Text>
          
          {challenge.rewards && challenge.rewards.badgeId && (
            <View style={styles.rewardIndicator}>
              <Award size={16} color={colors.accent} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: 'white',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  },
  title: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18,
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    marginBottom: 16,
  },
  footer: {
    marginTop: 'auto',
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
  },
  rewardIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});