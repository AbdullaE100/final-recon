import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Achievement } from '@/types/gamification';
import BadgeCard from './BadgeCard';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface BadgeCategoryGridProps {
  category: string;
  badges: Achievement[];
  index?: number;
}

export default function BadgeCategoryGrid({ category, badges, index = 0 }: BadgeCategoryGridProps) {
  // Get category color gradient based on category type
  const getCategoryGradient = (category: string): [string, string] => {
    switch (category) {
      case 'streak':
        return ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']; // Gold tint for streak
      case 'journal':
        return ['rgba(102, 204, 153, 0.15)', 'rgba(102, 204, 153, 0.05)']; // Green tint
      case 'challenge':
        return ['rgba(255, 102, 102, 0.15)', 'rgba(255, 102, 102, 0.05)']; // Red tint
      case 'meditation':
        return ['rgba(147, 112, 219, 0.15)', 'rgba(147, 112, 219, 0.05)']; // Purple tint
      case 'workout':
        return ['rgba(70, 130, 180, 0.15)', 'rgba(70, 130, 180, 0.05)']; // Steel blue tint
      default:
        return ['rgba(103, 114, 255, 0.15)', 'rgba(103, 114, 255, 0.05)']; // Default blue tint
    }
  };

  const categoryGradient = getCategoryGradient(category);
  const unlockedCount = badges.filter(badge => badge.unlocked).length;

  return (
    <Animated.View 
      entering={FadeInDown.delay(300 + (index * 100)).duration(400)} 
      style={styles.categoryContainer}
    >
      <LinearGradient
        colors={categoryGradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.categoryHeader}
      >
        <Text style={styles.categoryTitle}>
          {category.charAt(0).toUpperCase() + category.slice(1)} Badges
        </Text>
        <View style={styles.categoryBadgeCount}>
          <Text style={styles.categoryCountText}>
            {unlockedCount}/{badges.length}
          </Text>
        </View>
      </LinearGradient>
      
      <View style={styles.badgesGrid}>
        {badges.map((badge, badgeIndex) => (
          <BadgeCard
            key={badge.id}
            achievement={badge}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  categoryContainer: {
    marginBottom: 20,
    width: '100%',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  categoryTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  categoryBadgeCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCountText: {
    fontFamily: 'Nunito-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  }
}); 