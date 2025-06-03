import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolate, 
  Extrapolate,
  withSequence,
  withDelay,
  runOnJS,
  FadeIn,
  FadeInDown,
  SlideInDown
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/context/ThemeContext';
import { getData, STORAGE_KEYS } from '@/utils/storage';
import { useGamification } from '@/context/GamificationContext';

const { width, height } = Dimensions.get('window');

// Define the type for the user preferences
interface UserPreferences {
  signature?: string;
  pledgeDate?: number;
  quizAnswers?: Record<string, any>;
  companion?: any;
}

const PLEDGE_STATEMENTS = [
  "I pledge to prioritize my mental health and well-being.",
  "I commit to breaking free from habits that no longer serve me.",
  "I will practice self-compassion during moments of challenge.",
  "I will celebrate each victory, no matter how small.",
  "I deserve freedom, peace, and control over my own life."
];

export default function MyPledgeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { streak } = useGamification();
  
  const [signature, setSignature] = useState<string | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [pledgeDate, setPledgeDate] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [animationLoaded, setAnimationLoaded] = useState(false);
  
  // Animation values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const signatureScale = useSharedValue(0.95);
  
  // Refs
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const lottieRef = useRef<LottieView>(null);
  
  // Load signature from storage
  useEffect(() => {
    const loadSignature = async () => {
      try {
        setLoadingSignature(true);
        
        const preferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
        
        if (preferences && preferences.signature) {
          
          setSignature(preferences.signature);
          
          // Calculate pledge date based on stored date or fallback to current date
          const date = preferences.pledgeDate 
            ? new Date(preferences.pledgeDate) 
            : new Date();
            
          setPledgeDate(date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }));
        } else {
          
          // Don't set a placeholder signature, keep it null
          setSignature(null);
          setPledgeDate(new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }));
        }
      } catch (error) {
        console.error('Error loading signature:', error);
        setSignature(null);
      } finally {
        setLoadingSignature(false);
      }
    };

    loadSignature();
    
    // Rotate pledge statements every 5 seconds
    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PLEDGE_STATEMENTS.length);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Animate signature scale when loaded
  useEffect(() => {
    if (signature) {
      signatureScale.value = withTiming(1, { duration: 1000 });
    }
  }, [signature]);
  
  // Header animation based on scroll
  const headerAnimatedStyle = useAnimatedStyle(() => {
    headerOpacity.value = interpolate(
      scrollY.value,
      [0, 100],
      [0, 1],
      Extrapolate.CLAMP
    );
    
    return {
      opacity: headerOpacity.value,
    };
  });
  
  // Handle scroll events
  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };
  
  // Animated style for signature container
  const signatureAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: signatureScale.value }],
    };
  });

  // Handle animation loading error
  const handleAnimationError = () => {
    console.warn("Could not load animation");
    setAnimationLoaded(false);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      
      {/* Animated header */}
      <Animated.View 
        style={[
          styles.header,
          headerAnimatedStyle,
          { paddingTop: insets.top || 40, backgroundColor: colors.card }
        ]}
      >
        <BlurView intensity={80} tint="dark" style={styles.blurView}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Pledge</Text>
        </BlurView>
      </Animated.View>
      
      {/* Back button */}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top || 40 }]} 
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </TouchableOpacity>
      
      <Animated.ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        entering={FadeIn.duration(500)}
      >
        {/* Title container */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          {/* Try to load animation, fallback to icon if it fails */}
          <View style={styles.titleAnimation}>
            {/* Fallback icon if animation doesn't load */}
            {!animationLoaded && (
              <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
            )}
            <LottieView
              ref={lottieRef}
              source={require('@/assets/animations/pledge.json')}
              autoPlay
              loop
              style={[styles.lottieAnimation, {opacity: animationLoaded ? 1 : 0}]}
              onAnimationFailure={handleAnimationError}
              onAnimationFinish={() => setAnimationLoaded(true)}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>My Personal Pledge</Text>
        </Animated.View>
        
        {/* Date display */}
        <Animated.Text 
          style={[styles.date, { color: colors.secondaryText }]}
          entering={FadeInDown.delay(300).duration(600)}
        >
          {pledgeDate || 'Today'}
        </Animated.Text>
        
        {/* Main pledge card */}
        <Animated.View 
          style={[styles.pledgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          entering={FadeInDown.delay(400).duration(600)}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.cardHeader}
          >
            <Text style={styles.cardHeaderText}>The Pledge</Text>
          </LinearGradient>
          
          {/* Rotating pledge statements */}
          <View style={styles.statementContainer}>
            {PLEDGE_STATEMENTS.map((statement, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.pledgeStatement,
                  { color: colors.text, opacity: activeIndex === index ? 1 : 0 }
                ]}
              >
                "{statement}"
              </Animated.Text>
            ))}
          </View>
          
          {/* Signature section */}
          <View style={styles.signatureSection}>
            <Text style={[styles.signatureLabel, { color: colors.secondaryText }]}>
              My Signature
            </Text>
            
            {loadingSignature ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : signature ? (
              <Animated.View style={[styles.signatureBox, signatureAnimatedStyle]}>
                <Image 
                  source={{ uri: signature }} 
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </Animated.View>
            ) : (
              <View style={[styles.noSignature, { borderColor: colors.border }]}>
                <Text style={[styles.noSignatureText, { color: colors.secondaryText }]}>
                  No signature found. Please complete the onboarding process.
                </Text>
              </View>
            )}
          </View>
          
          {/* Current streak display */}
          <View style={[styles.streakSection, { backgroundColor: colors.cardAlt }]}>
            <Text style={[styles.streakLabel, { color: colors.secondaryText }]}>
              Current Streak
            </Text>
            <Text style={[styles.streakValue, { color: colors.primary }]}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </Animated.View>
        
        {/* Renew button */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)}>
          <TouchableOpacity 
            style={[styles.renewButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              // Animate the lottie animation to completion
              if (lottieRef.current) {
                lottieRef.current.play(0, 100);
              }
            }}
          >
            <Text style={styles.renewButtonText}>Renew My Commitment</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.ScrollView>
    </View>
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
    height: 100,
    zIndex: 10,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    width: 40,
    height: 40,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  titleAnimation: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 120,
    height: 120,
    position: 'absolute',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pledgeCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
  },
  cardHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  statementContainer: {
    height: 120,
    padding: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  pledgeStatement: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    textAlign: 'center',
    lineHeight: 24,
    position: 'absolute',
    width: '100%',
    left: 20,
    right: 20,
  },
  signatureSection: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  signatureLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: 10,
  },
  signatureBox: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  noSignature: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
  },
  noSignatureText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
  },
  streakSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  streakLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
  },
  streakValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  renewButton: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginTop: 10,
  },
  renewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
  },
});