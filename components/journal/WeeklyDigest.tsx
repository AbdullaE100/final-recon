import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, BarChart2, Smile, Sparkles, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { WeeklyDigestData } from '@/utils/journalInsights';

const { width } = Dimensions.get('window');

interface WeeklyDigestProps {
  onBack: () => void;
  digestData: WeeklyDigestData;
}

const WeeklyDigest: React.FC<WeeklyDigestProps> = ({ onBack, digestData }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#121212', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Weekly Digest</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.dateRange}>{digestData.dateRange}</Text>

        <View style={styles.card}>
          <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          <View style={styles.cardHeader}>
            <Star size={24} color="#EC4899" />
            <Text style={styles.cardTitle}>Highlight of the Week</Text>
          </View>
          <Text style={styles.cardContent}>{digestData.highlight}</Text>
        </View>

        <View style={styles.card}>
          <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          <View style={styles.cardHeader}>
            <Sparkles size={24} color="#6366F1" />
            <Text style={styles.cardTitle}>Common Themes</Text>
          </View>
          <View style={styles.themesContainer}>
            {digestData.themes.map((theme, index) => (
              <BlurView key={index} intensity={20} tint="dark" style={styles.themeChip}>
                <Text style={styles.themeText}>{theme}</Text>
              </BlurView>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          <View style={styles.cardHeader}>
            <Smile size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Mood Overview</Text>
          </View>
          <Text style={styles.cardContent}>{digestData.moodSummary}</Text>
          {/* Placeholder for a chart */}
          <BlurView intensity={20} tint="dark" style={styles.chartPlaceholder}>
            <BarChart2 size={40} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.chartText}>Mood chart coming soon</Text>
          </BlurView>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dateRange: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
    color: '#FFFFFF',
  },
  cardContent: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  themeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  themeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  chartPlaceholder: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  }
});

export default WeeklyDigest; 