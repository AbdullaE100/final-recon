import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useState } from 'react';
import { Award, Info } from 'lucide-react-native';
import { Achievement } from '@/types/gamification';
import Animated, { FadeIn } from 'react-native-reanimated';

interface BadgeCardProps {
  achievement: Achievement;
}

export default function BadgeCard({ achievement }: BadgeCardProps) {
  const { colors } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  
  const toggleDetails = () => setShowDetails(!showDetails);
  
  // Color based on achievement category
  let categoryColor = colors.primary;
  
  switch (achievement.category) {
    case 'streak':
      categoryColor = colors.accent;
      break;
    case 'journal':
      categoryColor = colors.secondary;
      break;
    case 'challenge':
      categoryColor = colors.success;
      break;
  }

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.card,
          borderColor: showDetails ? categoryColor : colors.border
        }
      ]}
      onPress={toggleDetails}
      activeOpacity={0.8}
    >
      <View style={styles.badge}>
        <Award size={40} color={categoryColor} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {achievement.name}
      </Text>
      
      {showDetails && (
        <Animated.View 
          style={styles.details}
          entering={FadeIn}
        >
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            {achievement.description}
          </Text>
          
          <View style={[styles.infoBox, { backgroundColor: colors.cardAlt }]}>
            <Info size={16} color={categoryColor} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {achievement.unlockCriteria}
            </Text>
          </View>
          
          <Text style={[styles.dateUnlocked, { color: colors.secondaryText }]}>
            {achievement.dateUnlocked 
              ? `Unlocked: ${new Date(achievement.dateUnlocked).toLocaleDateString()}` 
              : 'Not yet unlocked'}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    width: '48%',
  },
  badge: {
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  details: {
    marginTop: 12,
    width: '100%',
  },
  description: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  infoBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  infoText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    flex: 1,
  },
  dateUnlocked: {
    fontFamily: 'Nunito-Regular',
    fontSize: 10,
    textAlign: 'center',
  }
});