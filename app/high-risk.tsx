import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
  UIManager,
  Linking,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Calendar,
  Zap,
  BookOpen,
  Dumbbell,
  Code,
  Brush
} from 'lucide-react-native';
import { useGamification } from '@/context/GamificationContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const activities = [
  {
    icon: <Code size={24} color="#FFFFFF" />,
    title: 'Learn Basic Coding',
    duration: '30 Hours',
    description: 'Master HTML, CSS fundamentals',
    color: '#FF7E5F',
    backgroundColor: 'rgba(255, 126, 95, 0.2)',
  },
  {
    icon: <BookOpen size={24} color="#FFFFFF" />,
    title: 'Read a Trilogy',
    duration: '25 Hours',
    description: 'Get lost in a new world',
    color: '#FEB47B',
    backgroundColor: 'rgba(254, 180, 123, 0.2)',
  },
  {
    icon: <Dumbbell size={24} color="#FFFFFF" />,
    title: 'Start a Fitness Habit',
    duration: '20 Hours',
    description: 'Build strength and endurance',
    color: '#6DD5FA',
    backgroundColor: 'rgba(109, 213, 250, 0.2)',
  },
    {
    icon: <Brush size={24} color="#FFFFFF" />,
    title: 'Learn to Paint',
    duration: '40 Hours',
    description: 'Unleash your inner artist',
    color: '#B2FEFA',
    backgroundColor: 'rgba(178, 254, 250, 0.2)',
  },
];

interface TimeStatProps {
  label: string;
  value: string;
  subtext?: string;
}

const TimeStat: React.FC<TimeStatProps> = ({ label, value, subtext }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.timeStatContainer}>
      <Text style={styles.timeStatLabel}>{label}</Text>
      <Text style={[styles.timeStatValue, { color: colors.text }]}>{value}</Text>
      {subtext && <Text style={styles.timeStatSubtext}>{subtext}</Text>}
    </View>
  );
};

interface ActivityCardProps {
  icon: React.ReactNode;
  title: string;
  duration: string;
  description: string;
  color: string;
  backgroundColor: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ icon, title, duration, description, color, backgroundColor }) => {
  return (
    <View style={[styles.activityCard, { backgroundColor }]}>
      <View style={styles.activityHeader}>
        <View style={[styles.activityIcon, { backgroundColor: color }]}>{icon}</View>
        <Text style={styles.activityTitle}>{title}</Text>
      </View>
      <Text style={styles.activityDescription}>{description}</Text>
      <View style={styles.activityFooter}>
        <Clock size={14} color="#FFFFFF80" />
        <Text style={styles.activityDuration}>{duration}</Text>
      </View>
    </View>
  );
};

// Main High Risk Screen Component
export default function HighRiskScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;

  // Dummy data - replace with actual logic
  const weeklyTime = 2.3;
  const annualProjection = 120;
  const daysOfLife = 5;

  return (
    <LinearGradient
      colors={['#0B0B1A', '#1A1A2E', '#16213E']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <AlertTriangle size={28} color="#FF7E5F" />
          <Text style={styles.title}>High Risk</Text>
        </View>

        <View style={styles.timeStatsWrapper}>
          <TimeStat
            label="WEEKLY TIME"
            value={`${weeklyTime} hrs/week`}
          />
          <View style={styles.separator} />
          <TimeStat
            label="ANNUAL PROJECTION"
            value={`${annualProjection} hrs/year`}
            subtext={`That's ${daysOfLife} days of your life`}
          />
        </View>
        
        <View style={styles.createInsteadContainer}>
            <Text style={styles.createInsteadTitle}>What You Could Create Instead</Text>
            <Text style={styles.createInsteadSubtitle}>Transform lost time into achievements</Text>
        </View>

        <View>
          <Animated.FlatList
            data={activities}
            renderItem={({ item }) => <ActivityCard {...item} />}
            keyExtractor={(item) => item.title}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={width - 60}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 10 }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          />
        </View>
        <View style={styles.pagination}>
          {activities.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.8, 1.4, 0.8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.6, 1, 0.6],
              extrapolate: 'clamp',
            });
            return <Animated.View key={i} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Choose growth over guilt.</Text>
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.back()}>
          <Text style={styles.ctaButtonText}>I&apos;m Ready</Text>
          <ChevronRight size={20} color="#1A1A2A" />
        </TouchableOpacity>
        <TouchableOpacity>
            <Text style={styles.linkText}>Tap here if button doesn&apos;t work</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingTop: 80, 
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  timeStatsWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  timeStatContainer: {
    flex: 1,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeStatLabel: {
    fontSize: 12,
    color: '#FFFFFF80',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  timeStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  timeStatSubtext: {
    fontSize: 13,
    color: '#FF7E5F',
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 126, 95, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  createInsteadContainer: {
    marginBottom: 24,
  },
  createInsteadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  createInsteadSubtitle: {
    fontSize: 14,
    color: '#FFFFFF80',
    marginBottom: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2A',
    marginRight: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#FFFFFF80',
    textDecorationLine: 'underline',
  },
    activityCard: {
    width: width - 80, // Adjust as needed
    height: 180, // Adjust as needed
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    justifyContent: 'space-between',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activityDescription: {
    fontSize: 14,
    color: '#FFFFFFB3',
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.8,
  },
  activityDuration: {
    fontSize: 13,
    color: '#FFFFFFB3',
    marginLeft: 6,
  },
}); 