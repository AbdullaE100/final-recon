import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Award, CircleCheck as CheckCircle, Play } from 'lucide-react-native';
import { Challenge } from '@/types/gamification';

interface ChallengeCardProps {
  challenge: Challenge;
  isActive: boolean;
  onStart?: () => void;
  onComplete?: () => void;
}

export default function ChallengeCard({ 
  challenge, 
  isActive,
  onStart,
  onComplete 
}: ChallengeCardProps) {
  const { colors } = useTheme();
  
  // Calculate progress percentage
  const progress = challenge.progress || 0;
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
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
      
      {challenge.rewards && challenge.rewards.badgeId && (
        <View style={[styles.rewardSection, { backgroundColor: colors.cardAlt }]}>
          <Award size={18} color={colors.accent} />
          <Text style={[styles.rewardText, { color: colors.text }]}>
            Earn "{challenge.rewards.badgeName}" badge
          </Text>
        </View>
      )}
      
      {isActive && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressLabel, { color: colors.secondaryText }]}>
              Progress:
            </Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {progress}%
            </Text>
          </View>
          
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
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { 
                backgroundColor: progress >= 100 ? colors.success : colors.primary,
                opacity: progress >= 100 ? 1 : 0.5
              }
            ]}
            onPress={onComplete}
            disabled={progress < 100}
          >
            <CheckCircle size={18} color={colors.white} />
            <Text style={styles.actionText}>
              {progress >= 100 ? 'Complete Challenge' : 'In Progress'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!isActive && (
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={onStart}
        >
          <Play size={18} color={colors.white} />
          <Text style={styles.actionText}>
            Start Challenge
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  rewardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  rewardText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginLeft: 8,
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
  },
  progressValue: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  actionText: {
    color: 'white',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  }
});