import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { Brain, TrendingUp, Zap, Focus, HeartPulse } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Simplified MetricDataPoint interface
interface MetricDataPoint {
  day: number;
  level: number;
}

// Simplified recovery path data structure
const RECOVERY_DATA = {
  dopamine: [
    { day: 1, level: 20 },
    { day: 7, level: 30 },
    { day: 14, level: 45 },
    { day: 30, level: 60 },
    { day: 60, level: 75 },
    { day: 90, level: 85 },
    { day: 180, level: 95 },
    { day: 365, level: 99 },
  ],
  clarity: [
    { day: 1, level: 10 },
    { day: 7, level: 25 },
    { day: 14, level: 40 },
    { day: 30, level: 60 },
    { day: 60, level: 80 },
    { day: 90, level: 90 },
    { day: 180, level: 95 },
    { day: 365, level: 98 },
  ],
  energy: [
    { day: 1, level: 30 },
    { day: 7, level: 40 },
    { day: 14, level: 55 },
    { day: 30, level: 70 },
    { day: 60, level: 80 },
    { day: 90, level: 90 },
    { day: 180, level: 95 },
    { day: 365, level: 98 },
  ],
  focus: [
    { day: 1, level: 25 },
    { day: 7, level: 35 },
    { day: 14, level: 45 },
    { day: 30, level: 65 },
    { day: 60, level: 80 },
    { day: 90, level: 85 },
    { day: 180, level: 95 },
    { day: 365, level: 98 },
  ],
  mental: [
    { day: 1, level: 30 },
    { day: 7, level: 40 },
    { day: 14, level: 50 },
    { day: 30, level: 65 },
    { day: 60, level: 75 },
    { day: 90, level: 85 },
    { day: 180, level: 90 },
    { day: 365, level: 95 },
  ],
};

// Recovery categories with static data that won't cause animation issues
const RECOVERY_CATEGORIES = [
  {
    id: 'dopamine',
    name: 'Dopamine Sensitivity',
    description: 'Restoration of normal dopamine receptor sensitivity and natural reward pathways',
    color: '#3498db',
    Icon: Zap,
  },
  {
    id: 'clarity',
    name: 'Mental Clarity',
    description: 'Reduction in brain fog and improved cognitive processing',
    color: '#9b59b6',
    Icon: Brain,
  },
  {
    id: 'energy',
    name: 'Energy Levels',
    description: 'Increase in overall energy, motivation and drive',
    color: '#2ecc71',
    Icon: TrendingUp,
  },
  {
    id: 'focus',
    name: 'Focus & Concentration',
    description: 'Enhanced ability to concentrate and reduced distractibility',
    color: '#f39c12',
    Icon: Focus,
  },
  {
    id: 'mental',
    name: 'Mental Well-being',
    description: 'Reduction in anxiety, depression and improved mood stability',
    color: '#e74c3c',
    Icon: HeartPulse,
  },
];

// Helper function to calculate progress based on streak
const calculateProgress = (dataArray: MetricDataPoint[], streak: number): number => {
  // Fallback to prevent crashes
  if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
    return 0;
  }
  
  try {
    // Find the appropriate level for current streak
    for (let i = dataArray.length - 1; i >= 0; i--) {
      if (dataArray[i] && streak >= dataArray[i].day) {
        return dataArray[i].level;
      }
    }
    // Default to first level if streak is less than any milestone
    return dataArray[0]?.level || 0;
  } catch (error) {
    console.error('Error calculating progress:', error);
    return 0;
  }
};

// Simple BrainMetrics component without complex animations
export default function BrainMetrics() {
  const { colors } = useTheme();
  const { streak } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState('dopamine');
  
  // Safely get the selected category
  const getSelectedCategory = () => {
    return RECOVERY_CATEGORIES.find(cat => cat.id === selectedCategory) || RECOVERY_CATEGORIES[0];
  };
  
  // Calculate current progress for selected category
  const calculateCurrentProgress = () => {
    try {
      const category = getSelectedCategory();
      const data = RECOVERY_DATA[category.id as keyof typeof RECOVERY_DATA] || RECOVERY_DATA.dopamine;
      return calculateProgress(data, streak || 0);
    } catch (error) {
      console.error('Error in calculateCurrentProgress:', error);
      return 0;
    }
  };
  
  // Get current progress percentage
  const progress = calculateCurrentProgress();
  
  // Safe getter for current category data
  const getCurrentCategory = () => {
    try {
      return getSelectedCategory();
    } catch (error) {
      console.error('Error getting current category:', error);
      return RECOVERY_CATEGORIES[0];
    }
  };
  
  const currentCategory = getCurrentCategory();
  
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Brain Recovery Metrics
      </Text>
      
      {/* Category selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categorySelector}
        contentContainerStyle={styles.categorySelectorContent}
      >
        {RECOVERY_CATEGORIES.map((category) => (
          <TouchableOpacity 
            key={category.id}
            style={[
              styles.categoryButton,
              { borderColor: category.color },
              selectedCategory === category.id && { backgroundColor: `${category.color}20` }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <category.Icon 
              size={20} 
              color={category.color} 
              style={styles.categoryIcon} 
            />
            <Text 
              style={[
                styles.categoryName, 
                { color: category.color }
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Category metrics display */}
      <View style={styles.metricsContainer}>
        <View style={styles.headerRow}>
          <currentCategory.Icon size={24} color={currentCategory.color} />
          <Text style={[styles.metricTitle, { color: colors.text }]}>
            {currentCategory.name}
          </Text>
        </View>
        
        <Text style={[styles.metricDescription, { color: colors.secondaryText }]}>
          {currentCategory.description}
        </Text>
        
        {/* Progress circle */}
        <View style={styles.progressRow}>
          <Svg width={160} height={160} viewBox="0 0 180 180">
            <G rotation={-90} originX={90} originY={90}>
              <Circle
                cx={90}
                cy={90}
                r={80}
                stroke={`${currentCategory.color}30`}
                strokeWidth={15}
                fill="transparent"
              />
              <Circle
                cx={90}
                cy={90}
                r={80}
                stroke={currentCategory.color}
                strokeWidth={15}
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 80 * (progress / 100)} ${2 * Math.PI * 80}`}
              />
            </G>
            <SvgText
              x={90}
              y={90}
              textAnchor="middle"
              alignmentBaseline="middle"
              fill={colors.text}
              fontWeight="bold"
              fontSize={28}
              fontFamily="Nunito-Bold"
            >
              {`${progress}%`}
            </SvgText>
          </Svg>
          
          <View style={styles.streakInfo}>
            <Text style={[styles.progressLabel, { color: colors.secondaryText }]}>
              YOUR CURRENT PROGRESS:
            </Text>
            <Text style={[styles.streakCount, { color: colors.text }]}>
              Day {streak || 0}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: `${colors.card}80` }]}>
        <Text style={[styles.disclaimerText, { color: colors.secondaryText }]}>
          Based on research studies and reported experiences. Individual results may vary.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  categorySelector: {
    marginVertical: 12,
  },
  categorySelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  metricDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  streakInfo: {
    flex: 1,
    paddingLeft: 16,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  disclaimer: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
}); 