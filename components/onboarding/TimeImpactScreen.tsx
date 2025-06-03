import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { 
  ArrowRight, 
  Clock, 
  Award, 
  Book, 
  Globe, 
  Code, 
  Activity, 
  ChevronLeft,
  Podcast,
  FileText,
  Monitor,
  Music,
  Smartphone,
  Camera,
  Coffee
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface TimeImpactScreenProps {
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Urgent Risk' | 'Very High Risk';
  weeklyHours: number;
  onContinue: () => void;
}

interface AchievementCard {
  id: string;
  title: string;
  subtitle: string;
  hours: number;
  icon: React.ReactNode;
}

// Pool of all possible achievements with varying time requirements
const ALL_ACHIEVEMENTS: AchievementCard[] = [
  // Small achievements (under 100 hours)
  {
    id: 'blog',
    title: 'Start a Blog – 40 Hours',
    subtitle: 'Launch your own platform to share ideas',
    hours: 40,
    icon: <FileText size={24} color="#FF6B6B" />
  },
  {
    id: 'basic_coding',
    title: 'Learn Basic Coding – 30 Hours',
    subtitle: 'Master HTML, CSS fundamentals',
    hours: 30,
    icon: <Code size={24} color="#4267B2" />
  },
  {
    id: 'books',
    title: 'Read 10 Books – 50 Hours',
    subtitle: 'Expand your knowledge and perspective',
    hours: 50,
    icon: <Book size={24} color="#FF9800" />
  },
  {
    id: 'website',
    title: 'Design Your Website – 80 Hours',
    subtitle: 'Create your personal professional site',
    hours: 80,
    icon: <Monitor size={24} color="#9C27B0" />
  },
  {
    id: 'podcast',
    title: 'Launch a Podcast – 60 Hours',
    subtitle: 'Share your voice with the world',
    hours: 60,
    icon: <Podcast size={24} color="#E91E63" />
  },
  
  // Medium achievements (100-200 hours)
  {
    id: 'simple_app',
    title: 'Build a Simple App – 100 Hours',
    subtitle: 'Create something useful people can download',
    hours: 100,
    icon: <Smartphone size={24} color="#4CAF50" />
  },
  {
    id: 'photography',
    title: 'Master Photography – 120 Hours',
    subtitle: 'Learn professional techniques and editing',
    hours: 120,
    icon: <Camera size={24} color="#607D8B" />
  },
  {
    id: 'facebook',
    title: 'Built Facebook – 2 Weeks',
    subtitle: 'Mark Zuckerberg created the first version at Harvard',
    hours: 200,
    icon: <Code size={24} color="#4267B2" />
  },
  {
    id: 'book',
    title: 'Wrote a Book – 200 Hours',
    subtitle: 'Draft a 100,000-word novel',
    hours: 200,
    icon: <Book size={24} color="#FF6B6B" />
  },
  
  // Larger achievements (over 200 hours)
  {
    id: 'coding',
    title: 'Learned to Code – 300 Hours',
    subtitle: 'Become proficient in JavaScript within 6-12 months',
    hours: 300,
    icon: <Code size={24} color="#FF9800" />
  },
  {
    id: 'coffee_shop',
    title: 'Start a Coffee Shop – 350 Hours',
    subtitle: 'From business plan to opening day',
    hours: 350,
    icon: <Coffee size={24} color="#795548" />
  },
  {
    id: 'marathon',
    title: 'Trained for a Marathon – 400 Hours',
    subtitle: '16-20 weeks of dedicated training',
    hours: 400,
    icon: <Activity size={24} color="#2196F3" />
  },
  {
    id: 'music_album',
    title: 'Record a Music Album – 500 Hours',
    subtitle: 'Write, record and produce your own songs',
    hours: 500,
    icon: <Music size={24} color="#673AB7" />
  },
  {
    id: 'language',
    title: 'Learned a New Language – 600 Hours',
    subtitle: 'Achieve conversational fluency in Spanish or French',
    hours: 600,
    icon: <Globe size={24} color="#4CAF50" />
  },
];

// Function to get humanized risk level text
const getHumanizedRiskLevel = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Low Risk':
      return "Moderate concern";
    case 'Medium Risk':
      return "Medium Risk";
    case 'High Risk':
      return "High Risk";
    case 'Urgent Risk':
    case 'Very High Risk':
      return "Critical risk - immediate action required";
    default:
      return "Risk assessment needed";
  }
};

const TimeImpactScreen: React.FC<TimeImpactScreenProps> = ({ 
  riskLevel, 
  weeklyHours,
  onContinue 
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const swipeHintOpacity = useSharedValue(1);
  
  // Calculate annual hours
  const annualHours = Math.round(weeklyHours * 52);
  // Calculate days wasted
  const daysWasted = Math.round(annualHours / 24);
  
  // Filter and select achievement cards based on user's annual time
  const achievementCards = useMemo(() => {
    // Allow up to 120% of the user's time to include "almost achievable" goals
    const maxAllowedTime = annualHours * 1.2;
    
    // Filter achievements based on time criteria
    let filteredAchievements = ALL_ACHIEVEMENTS.filter(achievement => {
      // For low usage users (less than 150 hours/year), cap high-effort tasks
      if (annualHours < 150 && achievement.hours > 200) {
        return false;
      }
      
      // Only include achievements that are achievable or almost achievable
      return achievement.hours <= maxAllowedTime;
    });
    
    // If no achievements match, include at least the smallest achievements
    if (filteredAchievements.length === 0) {
      filteredAchievements = ALL_ACHIEVEMENTS
        .sort((a, b) => a.hours - b.hours)
        .slice(0, 3);
    }
    
    // Sort by hours required (ascending)
    filteredAchievements.sort((a, b) => a.hours - b.hours);
    
    // Ensure we have at least one 100% achievable task
    const hasAchievableTask = filteredAchievements.some(task => task.hours <= annualHours);
    
    if (!hasAchievableTask && ALL_ACHIEVEMENTS.some(task => task.hours <= annualHours)) {
      // Find the most significant achievable task
      const achievableTask = ALL_ACHIEVEMENTS
        .filter(task => task.hours <= annualHours)
        .sort((a, b) => b.hours - a.hours)[0];
        
      // Add it to the beginning of our list
      filteredAchievements.unshift(achievableTask);
    }
    
    // Limit to 5 achievements maximum
    return filteredAchievements.slice(0, 5);
  }, [annualHours]);

  // Get risk level color
  const getRiskLevelColor = () => {
    switch (riskLevel) {
      case 'Low Risk':
        return '#4CAF50';
      case 'Medium Risk':
        return '#FFC107';
      case 'High Risk':
        return '#FF5722';
      case 'Urgent Risk':
        return '#F44336';
      case 'Very High Risk':
        return '#F44336';
      default:
        return '#4CAF50';
    }
  };

  // Animated swipe hint
  React.useEffect(() => {
    // Pulsing animation for swipe hint
    swipeHintOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      3,
      false
    );
  }, [currentCardIndex]);

  // Get emotional time projection text
  const getTimeProjectionText = () => {
    if (daysWasted >= 30) {
      const months = Math.floor(daysWasted / 30);
      return `That's ${months} month${months > 1 ? 's' : ''} you never get back`;
    } else {
      return `That's ${daysWasted} day${daysWasted !== 1 ? 's' : ''} you never get back`;
    }
  };

  // Get achievement feasibility message
  const getAchievementFeasibilityMessage = (item: AchievementCard) => {
    const percentComplete = Math.min(100, (annualHours / item.hours) * 100);
    
    if (annualHours >= item.hours) {
      const timesAchievable = Math.floor(annualHours / item.hours);
      
      if (timesAchievable === 1) {
        return "You already have the time for this";
      } else if (timesAchievable === 2) {
        return `You could do this twice in a year`;
      } else {
        return `You could do this ${timesAchievable}×`;
      }
    }
    
    // Not fully achievable with current time
    if (percentComplete >= 80) {
      return `So close! ${Math.round(percentComplete)}% there`;
    } else if (percentComplete >= 50) {
      return `Halfway to unlocking this: ${Math.round(percentComplete)}%`;
    } else {
      return `Only ${Math.round(percentComplete)}% = Just getting started`;
    }
  };

  // Render achievement card
  const renderAchievementCard = ({ item, index }: { item: AchievementCard, index: number }) => {
    const isActive = index === currentCardIndex;
    const percentComplete = Math.min(100, (annualHours / item.hours) * 100);
    
    return (
      <Animated.View
        entering={FadeInUp.delay(100 * index).springify()}
        style={[
          styles.achievementCard,
          {
            opacity: isActive ? 1 : 0.7,
            transform: [{ scale: isActive ? 1 : 0.9 }],
          }
        ]}
      >
        <BlurView intensity={20} tint="dark" style={styles.achievementCardInner}>
          <View style={styles.achievementHeader}>
            <View style={styles.achievementIconContainer}>
              {item.icon}
            </View>
            <View style={styles.achievementTitleContainer}>
              <Text style={styles.achievementTitle}>{item.title}</Text>
              <Text style={styles.achievementSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
          
          <View style={styles.achievementTimeContainer}>
            <Clock size={14} color="#FFFFFF" style={styles.timeIcon} />
            <Text style={styles.achievementTimeText}>~{item.hours} hrs</Text>
          </View>
          
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonLine}>
              <View 
                style={[
                  styles.comparisonFill, 
                  { 
                    width: `${percentComplete}%`,
                    backgroundColor: annualHours >= item.hours ? '#4CAF50' : '#F44336'
                  }
                ]} 
              />
            </View>
            
            <Text style={styles.comparisonText}>
              {getAchievementFeasibilityMessage(item)}
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  // Handle slide change
  const handleSlideChange = (index: number) => {
    setCurrentCardIndex(index);
  };

  // Swipe hint animated style
  const swipeHintStyle = useAnimatedStyle(() => {
    return {
      opacity: swipeHintOpacity.value
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#161D3F', '#0C1429', '#060A18']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingBottom: insets.bottom + 20,
            paddingTop: insets.top + 10,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Risk Level Header */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={styles.riskLevelContainer}
        >
          <Text 
            style={[
              styles.riskLevelText, 
              { color: getRiskLevelColor() }
            ]}
          >
            {riskLevel === 'Medium Risk' ? 'Medium Risk' : getHumanizedRiskLevel(riskLevel)}
          </Text>
        </Animated.View>
        
        {/* Time Impact Card */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(100)}
          style={styles.timeCardContainer}
        >
          <BlurView intensity={20} tint="dark" style={styles.timeCard}>
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>Weekly Time Spent</Text>
              <Text style={styles.timeValue}>{weeklyHours} hours/week</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>Annual Projection</Text>
              <Text style={styles.timeValue}>{annualHours} hours/year</Text>
              <Text style={styles.timeSublabel}>
                {getTimeProjectionText()}
              </Text>
            </View>
          </BlurView>
        </Animated.View>
        
        {/* Achievements Slider Section */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What You Could've Built</Text>
            
            <Animated.View style={[styles.swipeHintContainer, swipeHintStyle]}>
              <ChevronLeft size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.swipeHintText}>Swipe</Text>
            </Animated.View>
          </View>
          
          {/* Achievement Cards Slider */}
          <View style={styles.achievementsContainer}>
            <FlatList
              ref={flatListRef}
              data={achievementCards}
              renderItem={renderAchievementCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.9}
              decelerationRate="fast"
              contentContainerStyle={styles.flatListContent}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (width * 0.9));
                handleSlideChange(index);
              }}
            />
            
            {/* Pagination dots instead of numbers */}
            <View style={styles.paginationContainer}>
              {achievementCards.map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentCardIndex === index ? styles.paginationDotActive : {}
                  ]}
                />
              ))}
            </View>
          </View>
        </Animated.View>
        
        {/* CTA Button Section */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(300)}
          style={styles.ctaContainer}
        >
          <Text style={styles.motivationalText}>Choose growth over guilt.</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>I'm Ready</Text>
            <ArrowRight size={18} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  riskLevelContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  riskLevelText: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  timeCardContainer: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeCard: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(32, 35, 72, 0.5)',
  },
  timeGroup: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timeSublabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  achievementsContainer: {
    marginBottom: 16,
  },
  flatListContent: {
    paddingRight: 20,
  },
  achievementCard: {
    width: width * 0.9,
    marginRight: 10,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  achievementCardInner: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(32, 35, 72, 0.5)',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementTitleContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  achievementSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
  achievementTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  timeIcon: {
    marginRight: 6,
  },
  achievementTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  comparisonContainer: {
    marginTop: 4,
  },
  comparisonLine: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  comparisonFill: {
    height: '100%',
    borderRadius: 3,
  },
  comparisonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  ctaContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  motivationalText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E5CFF',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#5E5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default TimeImpactScreen;