import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Clock, ArrowRight, Calendar, Flame } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSpring,
  interpolate,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { CompanionChoice } from '@/components/onboarding/CompanionSelectionScreen';
import { useGamification } from '@/context/GamificationContext';
import { ActivityIndicator } from 'react-native';

const { width, height } = Dimensions.get('window');

interface StreakRevealProps {
  companionChoice: CompanionChoice;
  onContinue: () => void;
}

export default function StreakReveal({ companionChoice, onContinue }: StreakRevealProps) {
  const { colors } = useTheme();
  const gamification = useGamification() || { streak: 0, companion: null };
  const { streak = 0, companion = null } = gamification;
  const lottieRef = useRef<LottieView>(null);
  
  // Add loading state
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const streakCounterValue = useSharedValue(0); // Always start at 0
  const streakCounterOpacity = useSharedValue(0);
  const companionOpacity = useSharedValue(0);
  const companionY = useSharedValue(20);
  
  // Get companion animation source based on selection
  const getCompanionAnimation = (choice: CompanionChoice) => {
    switch (choice) {
      case 'tiger': return require('@/assets/lottie/baby_tiger_stage1.json');
      case 'monster': return require('@/assets/lottie/baby_monster_stage1.json');
      case 'pumpkin': return require('@/assets/lottie/baby_panda_stage1.json');
      default: return require('@/assets/lottie/baby_panda_stage1.json');
    }
  };
  
  // Determine color based on companion choice
  const getCompanionColor = (choice: CompanionChoice): string => {
    switch (choice) {
      case 'tiger': return '#4FC3F7'; // Light blue
      case 'monster': return '#FF8A65'; // Orange
      case 'pumpkin': return '#81C784'; // Green
      default: return '#9C27B0'; // Purple
    }
  };
  
  const companionAnimation = getCompanionAnimation(companionChoice);
  const accentColor = getCompanionColor(companionChoice);

  useEffect(() => {
    // First, ensure we have a longer delay before showing anything
    const initialDelay = 1200; // longer delay to ensure all data is loaded properly
    
    setTimeout(() => {
      // Begin revealing card
      cardOpacity.value = withTiming(1, { duration: 600 });
      cardScale.value = withDelay(200, withSpring(1, { damping: 12 }));
      
      // Animate companion
      companionOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
      companionY.value = withDelay(300, withSpring(0, { damping: 8 }));
      
      // Wait until the card and companion are visible before showing the streak
      setTimeout(() => {
        // Now that we've delayed long enough, first fade in the counter container
        streakCounterOpacity.value = withTiming(1, { duration: 400 });
        
        // Then after the container is visible, start counting up (but only if streak > 0)
        setTimeout(() => {
          setIsLoading(false);
          // For new users with streak = 0, we don't need any counting animation
          // Just immediately show 0
          streakCounterValue.value = withTiming(streak, { 
            duration: streak > 0 ? 1500 : 300, 
            easing: Easing.out(Easing.cubic) 
          });
        }, 400);
      }, 800);

      // Play Lottie animation
      if (lottieRef.current) {
        setTimeout(() => {
          lottieRef.current?.play();
        }, 500);
      }
    }, initialDelay);
  }, []);
  
  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      transform: [{ scale: cardScale.value }],
    };
  });
  
  const animatedCompanionStyle = useAnimatedStyle(() => {
    return {
      opacity: companionOpacity.value,
      transform: [{ translateY: companionY.value }]
    };
  });
  
  const animatedCounterStyle = useAnimatedStyle(() => {
    return {
      fontSize: interpolate(cardScale.value, [0.9, 1], [60, 90]),
      opacity: streakCounterOpacity.value,
    };
  });
  
  // Dynamic messaging based on streak length
  let streakMessage = 'Start your journey today!';
  
  if (streak >= 90) {
    streakMessage = 'Incredible discipline - stay strong!';
  } else if (streak >= 30) {
    streakMessage = 'Amazing progress - stay committed!';
  } else if (streak >= 7) {
    streakMessage = 'Building strong habits!';
  } else if (streak > 0) {
    streakMessage = 'Keep going!';
  }

  const getCompanionName = () => {
    // Use stored companion name if available, otherwise fall back to defaults
    if (companion?.name) {
      return companion.name;
    }
    switch (companionChoice) {
      case 'tiger': return 'Stripes';
      case 'monster': return 'Snuglur';
      case 'pumpkin': return 'Drowsi';
      default: return 'Companion';
    }
  };
  
  const companionName = getCompanionName();
  
  // Calculate a date to display (just for visual purposes)
  const getFormattedDate = () => {
    const date = new Date();
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#121212', '#0C0C0C']}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View 
        style={[styles.content]}
        entering={FadeIn.duration(500)}
      >
        <Text style={[styles.subtitle, { color: colors.secondaryText, marginTop: 50 }]}>
          Track your progress with your streak
        </Text>
        
        {/* Companion animation in a colored box */}
        <Animated.View 
          style={[
            styles.companionContainer, 
            { backgroundColor: accentColor },
            animatedCompanionStyle
          ]}
        >
          <LottieView
            ref={lottieRef}
            source={companionAnimation}
            autoPlay={false}
            loop
            style={styles.companionAnimation}
          />
        </Animated.View>
        
        {/* Main streak card */}
        <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
          <BlurView intensity={15} tint="dark" style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Flame size={20} color={accentColor} style={styles.flameIcon} />
                <Text style={styles.currentStreakLabel}>CURRENT STREAK</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={[styles.companionName, { color: accentColor }]}>{companionName}</Text>
              </View>
            </View>
            
            <View style={styles.streakContent}>
              <Animated.View style={[styles.counterContainer, { opacity: streakCounterOpacity.value }]}>
                {isLoading ? (
                  <ActivityIndicator size="large" color={accentColor} style={styles.loadingIndicator} />
                ) : streak === 0 ? (
                  <Animated.Text 
                    style={[styles.streakCounter, { color: accentColor }]}
                  >
                    {streak}
                  </Animated.Text>
                ) : (
                  <Animated.Text 
                    style={[styles.streakCounter, animatedCounterStyle, { color: accentColor }]}
                  >
                    {Math.round(streakCounterValue.value)}
                  </Animated.Text>
                )}
              </Animated.View>
              <Text style={styles.streakUnit}>
                {streak === 1 ? 'DAY' : 'DAYS'}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.cardFooter}>
              <View style={styles.dateContainer}>
                <Clock size={16} color="#9E9E9E" />
                <Text style={styles.dateText}>Since {getFormattedDate()}</Text>
              </View>
              
              <Text style={styles.streakMessage}>
                {streakMessage}
              </Text>
            </View>
          </BlurView>
        </Animated.View>
        
        {/* Continue button moved higher */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: accentColor }]}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 36,
    textAlign: 'center',
    color: '#AAAAAA',
  },
  companionContainer: {
    width: 170,
    height: 170,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  companionAnimation: {
    width: 140,
    height: 140,
  },
  cardWrapper: {
    width: width * 0.88,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardContent: {
    padding: 28,
    paddingBottom: 24,
    paddingTop: 28,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {},
  flameIcon: {
    marginRight: 8,
  },
  currentStreakLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  streakCounter: {
    fontWeight: '800',
    fontSize: 90,
    lineHeight: 100,
  },
  streakUnit: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
    marginTop: -5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  cardFooter: {
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: '#9E9E9E',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  streakMessage: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  counterContainer: {
    minHeight: 90, // Maintain consistent height during loading
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginBottom: 8,
  },
});