import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  StatusBar,
  ColorValue,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { 
  ArrowRight, 
  Clock, 
  Book, 
  Globe, 
  Code, 
  Activity, 
  ChevronLeft,
  ChevronRight,
  Podcast,
  FileText,
  Monitor,
  Music,
  Smartphone,
  Camera,
  Coffee,
  AlertTriangle
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  withDelay,
  withRepeat,
  withSequence,
  BounceIn,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';

const { width, height } = Dimensions.get('window');
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

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
  gradient: [string, string];
}

// Pool of all possible achievements with varying time requirements
const ALL_ACHIEVEMENTS: AchievementCard[] = [
  // Small achievements (under 100 hours)
  {
    id: 'blog',
    title: 'Start a Blog – 40 Hours',
    subtitle: 'Launch your own platform to share ideas',
    hours: 40,
    icon: <FileText size={24} color="#FFFFFF" />,
    gradient: ['#FF6B6B', '#ee0979']
  },
  {
    id: 'basic_coding',
    title: 'Learn Basic Coding – 30 Hours',
    subtitle: 'Master HTML, CSS fundamentals',
    hours: 30,
    icon: <Code size={24} color="#FFFFFF" />,
    gradient: ['#4267B2', '#2b5876']
  },
  {
    id: 'books',
    title: 'Read 10 Books – 50 Hours',
    subtitle: 'Expand your knowledge and perspective',
    hours: 50,
    icon: <Book size={24} color="#FFFFFF" />,
    gradient: ['#FF9800', '#F7971E']
  },
  {
    id: 'website',
    title: 'Design Your Website – 80 Hours',
    subtitle: 'Create your personal professional site',
    hours: 80,
    icon: <Monitor size={24} color="#FFFFFF" />,
    gradient: ['#9C27B0', '#673AB7']
  },
  {
    id: 'podcast',
    title: 'Launch a Podcast – 60 Hours',
    subtitle: 'Share your voice with the world',
    hours: 60,
    icon: <Podcast size={24} color="#FFFFFF" />,
    gradient: ['#E91E63', '#FC466B']
  },
  
  // Medium achievements (100-200 hours)
  {
    id: 'simple_app',
    title: 'Build a Simple App – 100 Hours',
    subtitle: 'Create something useful people can download',
    hours: 100,
    icon: <Smartphone size={24} color="#FFFFFF" />,
    gradient: ['#4CAF50', '#43a047']
  },
  {
    id: 'photography',
    title: 'Master Photography – 120 Hours',
    subtitle: 'Learn professional techniques and editing',
    hours: 120,
    icon: <Camera size={24} color="#FFFFFF" />,
    gradient: ['#607D8B', '#455a64']
  },
  {
    id: 'facebook',
    title: 'Built Facebook – 2 Weeks',
    subtitle: 'Mark Zuckerberg created the first version at Harvard',
    hours: 200,
    icon: <Code size={24} color="#FFFFFF" />,
    gradient: ['#4267B2', '#2b5876']
  },
  {
    id: 'book',
    title: 'Wrote a Book – 200 Hours',
    subtitle: 'Draft a 100,000-word novel',
    hours: 200,
    icon: <Book size={24} color="#FFFFFF" />,
    gradient: ['#FF6B6B', '#ee0979']
  },
  
  // Larger achievements (over 200 hours)
  {
    id: 'coding',
    title: 'Learned to Code – 300 Hours',
    subtitle: 'Become proficient in JavaScript within 6-12 months',
    hours: 300,
    icon: <Code size={24} color="#FFFFFF" />,
    gradient: ['#FF9800', '#F7971E']
  },
  {
    id: 'coffee_shop',
    title: 'Start a Coffee Shop – 350 Hours',
    subtitle: 'From business plan to opening day',
    hours: 350,
    icon: <Coffee size={24} color="#FFFFFF" />,
    gradient: ['#795548', '#5D4037']
  },
  {
    id: 'marathon',
    title: 'Trained for a Marathon – 400 Hours',
    subtitle: '16-20 weeks of dedicated training',
    hours: 400,
    icon: <Activity size={24} color="#FFFFFF" />,
    gradient: ['#2196F3', '#1565C0']
  },
  {
    id: 'music_album',
    title: 'Record a Music Album – 500 Hours',
    subtitle: 'Write, record and produce your own songs',
    hours: 500,
    icon: <Music size={24} color="#FFFFFF" />,
    gradient: ['#673AB7', '#512DA8']
  },
  {
    id: 'language',
    title: 'Learned a New Language – 600 Hours',
    subtitle: 'Achieve conversational fluency in Spanish or French',
    hours: 600,
    icon: <Globe size={24} color="#FFFFFF" />,
    gradient: ['#4CAF50', '#2E7D32']
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
  const buttonScale = useSharedValue(1);
  const riskPulse = useSharedValue(1);
  const timeCardOpacity = useSharedValue(0);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    
    // Verify that onContinue is a function
    if (typeof onContinue !== 'function') {
      console.error('TimeImpactScreen: onContinue prop is not a function');
    }
    
    return () => {
      StatusBar.setBarStyle('default');
    };
  }, [onContinue]);
  
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
        return ['#4CAF50', '#8BC34A'] as [string, string];
      case 'Medium Risk':
        return ['#FFC107', '#FFB300'] as [string, string];
      case 'High Risk':
        return ['#FF5722', '#E64A19'] as [string, string];
      case 'Urgent Risk':
      case 'Very High Risk':
        return ['#F44336', '#C62828'] as [string, string];
      default:
        return ['#4CAF50', '#8BC34A'] as [string, string];
    }
  };

  const getRiskGradient = () => {
    switch (riskLevel) {
      case 'Low Risk':
        return ['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0)'] as [string, string];
      case 'Medium Risk':
        return ['rgba(255, 193, 7, 0.2)', 'rgba(255, 193, 7, 0)'] as [string, string];
      case 'High Risk':
        return ['rgba(255, 87, 34, 0.3)', 'rgba(255, 87, 34, 0)'] as [string, string];
      case 'Urgent Risk':
      case 'Very High Risk':
        return ['rgba(244, 67, 54, 0.4)', 'rgba(244, 67, 54, 0)'] as [string, string];
      default:
        return ['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0)'] as [string, string];
    }
  };

  // Animated effects
  useEffect(() => {
    // Pulsing animation for swipe hint
    swipeHintOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      3,
      false
    );

    // Pulsing animation for risk level
    riskPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.ease }),
        withTiming(1, { duration: 1000, easing: Easing.ease })
      ),
      -1, // Loop indefinitely
      true
    );
    
    // Fade in time card
    timeCardOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));

    // Scale button on press
    buttonScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(1.05, { duration: 400 }),
        withTiming(1, { duration: 400 })
      ),
      -1, // Loop indefinitely
      true
    );
  }, [currentCardIndex]);

  // Get emotional time projection text
  const getTimeProjectionText = () => {
    if (daysWasted >= 30) {
      const months = Math.floor(daysWasted / 30);
      return `That's ${months} month${months > 1 ? 's' : ''} of your life`;
    } else {
      return `That's ${daysWasted} day${daysWasted !== 1 ? 's' : ''} of your life`;
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
        entering={SlideInUp.delay(100 * index).springify()}
        style={[
          styles.achievementCard,
          {
            opacity: isActive ? 1 : 0.7,
            transform: [{ scale: isActive ? 1 : 0.92 }],
          }
        ]}
      >
        <BlurView intensity={20} tint="dark" style={styles.achievementCardInner}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          <View style={styles.achievementHeader}>
            <LinearGradient
              colors={item.gradient}
              style={styles.achievementIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {item.icon}
            </LinearGradient>
            <View style={styles.achievementTitleContainer}>
              <Text style={styles.achievementTitle}>{item.title}</Text>
              <Text style={styles.achievementSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
          
          <View style={styles.achievementTimeContainer}>
            <Clock size={12} color="#FFFFFF" style={styles.timeIcon} />
            <Text style={styles.achievementTimeText}>~{item.hours} hrs</Text>
          </View>
          
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonLine}>
              <LinearGradient
                colors={annualHours >= item.hours ? ['#4CAF50', '#8BC34A'] : ['#F44336', '#FF5722']}
                style={[styles.comparisonFill, { width: `${percentComplete}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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

  // Risk pulse animated style
  const riskPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: riskPulse.value }
      ]
    };
  });

  // Button scale animated style
  const buttonScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value }
      ]
    };
  });

  // Time card animated style
  const timeCardStyle = useAnimatedStyle(() => {
    return {
      opacity: timeCardOpacity.value,
      transform: [
        { translateY: interpolate(timeCardOpacity.value, [0, 1], [20, 0]) }
      ]
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
      
      {/* Add a subtle glow effect based on risk level */}
      <LinearGradient
        colors={getRiskGradient()}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
      />

      {/* Background pattern */}
      <View style={styles.patternContainer} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.patternDot,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                opacity: Math.random() * 0.5 + 0.1,
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
              }
            ]}
          />
        ))}
      </View>
      
      <View 
        style={[
          styles.contentContainer,
          { 
            paddingBottom: insets.bottom + 10,
            paddingTop: insets.top + 10,
          }
        ]}
      >
        {/* Warning Icon for High Risk */}
        {(riskLevel === 'High Risk' || riskLevel === 'Urgent Risk' || riskLevel === 'Very High Risk') && (
          <Animated.View
            entering={ZoomIn.duration(600)}
            style={[styles.warningIconContainer, riskPulseStyle]}
          >
            <AlertTriangle size={24} color={getRiskLevelColor()[0]} />
          </Animated.View>
        )}
        
        {/* Risk Level Header */}
        <MaskedView
          maskElement={
            <Text style={styles.riskLevelTextMask}>
              {getHumanizedRiskLevel(riskLevel)}
            </Text>
          }
        >
          <LinearGradient 
            colors={getRiskLevelColor()}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.gradientFill}
          />
        </MaskedView>
        
        {/* Time Impact Card */}
        <Animated.View
          style={[styles.timeCardContainer, timeCardStyle]}
        >
          <BlurView intensity={15} tint="dark" style={styles.timeCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            
            <View style={styles.timeContent}>
              <View style={styles.timeGroup}>
                <Text style={styles.timeLabel}>Weekly Time</Text>
                <View style={styles.timeValueContainer}>
                  <Text style={styles.timeValue}>{weeklyHours}</Text>
                  <Text style={styles.timeUnit}>hrs/week</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.timeGroup}>
                <Text style={styles.timeLabel}>Annual Projection</Text>
                <View style={styles.timeValueContainer}>
                  <Text style={styles.timeValue}>{annualHours}</Text>
                  <Text style={styles.timeUnit}>hrs/year</Text>
                </View>
                <LinearGradient
                  colors={['rgba(244, 67, 54, 0.7)', 'rgba(233, 30, 99, 0.7)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.timeSublabelContainer}
                >
                  <Text style={styles.timeSublabel}>
                    {getTimeProjectionText()}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </BlurView>
        </Animated.View>
        
        {/* Achievements Slider Section */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>What You Could Create Instead</Text>
              <Text style={styles.sectionSubtitle}>Transform lost time into achievements</Text>
            </View>
            
            <Animated.View style={[styles.swipeHintContainer, swipeHintStyle]}>
              <ChevronLeft size={14} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.swipeHintText}>Swipe</Text>
              <ChevronRight size={14} color="rgba(255, 255, 255, 0.7)" />
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
              snapToInterval={width * 0.85}
              decelerationRate="fast"
              contentContainerStyle={styles.flatListContent}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (width * 0.85));
                handleSlideChange(index);
              }}
            />
            
            {/* Pagination dots */}
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
          
          <Animated.View style={buttonScaleStyle}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                console.log("Continue button pressed");
                // Make sure we handle the navigation callback correctly
                if (typeof onContinue === 'function') {
                  onContinue();
                } else {
                  console.error("onContinue is not a function");
                }
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Continue to next screen"
              accessibilityHint="Navigates to the next screen in the onboarding process"
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <LinearGradient
                colors={['#5E5CFF', '#4A40FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
              />
              <Text style={styles.buttonText}>I&apos;m Ready</Text>
              <ArrowRight size={18} color="#FFFFFF" style={styles.buttonIcon} />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Backup navigation option */}
          <TouchableOpacity 
            onPress={() => {
              console.log("Backup navigation pressed");
              if (typeof onContinue === 'function') {
                onContinue();
              }
            }}
            style={styles.backupNavigationContainer}
          >
            <Text style={styles.backupNavigationText}>
              Tap here if button doesn&apos;t work
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternDot: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 5,
  },
  riskLevelContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  riskLevelText: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  riskLevelTextMask: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    alignSelf: 'center',
    marginBottom: 10,
  },
  gradientFill: {
    height: 40,
    width: width,
  },
  timeCardContainer: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  timeCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(32, 35, 72, 0.5)',
  },
  timeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  timeGroup: {
    alignItems: 'center',
    paddingVertical: 5,
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timeUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 5,
    marginBottom: 4,
  },
  timeSublabelContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  timeSublabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sectionContainer: {
    flex: 1,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 14,
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
    borderRadius: 12,
  },
  swipeHintText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: 3,
  },
  achievementsContainer: {
    flex: 1,
    marginBottom: 5,
  },
  flatListContent: {
    paddingRight: 20,
  },
  achievementCard: {
    width: width * 0.85,
    marginRight: 10,
    marginVertical: 5,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    height: Math.min(200, height * 0.28), // Restrict height to a percentage of screen height
  },
  achievementCardInner: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(32, 35, 72, 0.7)',
    height: '100%',
    justifyContent: 'space-between',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementTitleContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
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
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  timeIcon: {
    marginRight: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  comparisonFill: {
    height: '100%',
    borderRadius: 3,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },
  ctaContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  motivationalText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#5E5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 20,
    minHeight: 52,
    zIndex: 100,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  backupNavigationContainer: {
    marginTop: 8,
    padding: 6,
  },
  backupNavigationText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default TimeImpactScreen;