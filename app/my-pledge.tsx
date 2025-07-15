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
  SlideInDown,
  Easing,
  withRepeat
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/context/ThemeContext';
import { getData, STORAGE_KEYS } from '@/utils/storage';
import { useGamification } from '@/context/GamificationContext';
const logo = require('../assets/images/newlogo.png');

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

const BlurredOrb = ({ style, color, blur = 40 }: { style?: any; color: string; blur?: number }) => (
  <View style={[{
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: color,
    opacity: 0.18,
    zIndex: 0,
    filter: `blur(${blur}px)`
  }, style]} />
);

const AnimatedGlowDot = ({ delay = 0 }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.18, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: '#6E6AFF',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  }));
  return <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#6E6AFF', marginRight: 12 }, animatedStyle]} />;
};

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
      
      {/* Animated blurred orbs */}
      <BlurredOrb style={{ top: -80, left: -60, width: 220, height: 220 }} color={'#6E6AFF'} blur={48} />
      <BlurredOrb style={{ bottom: -60, right: -40, width: 160, height: 160 }} color={'#22D37F'} blur={36} />
      
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
        {/* Logo and Title container */}
        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={{ alignItems: 'center', marginBottom: 8 }}>
          <Image source={logo} style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 8 }} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={styles.pledgeTitle}>YOUR PLEDGE</Text>
          <View style={styles.pledgeUnderline} />
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
          style={[styles.pledgeCardGlass]}
          entering={FadeInDown.delay(400).duration(700)}
        >
          <View style={styles.pledgePointsContainer}>
            {PLEDGE_STATEMENTS.map((statement, idx) => (
              <Animated.View key={idx} entering={FadeInDown.delay(200 + idx * 100).duration(600)} style={styles.pledgePointRow}>
                <AnimatedGlowDot delay={idx * 100} />
                <Text style={styles.pledgePointText}>{statement}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
        
        {/* Signature card */}
        <Animated.View style={styles.signatureCardGlass} entering={FadeInDown.delay(700).duration(700)}>
          <Text style={styles.signatureCardTitle}>SIGN TO COMMIT</Text>
          <View style={styles.signatureBoxGlass}>
            {/* Signature pad or image here */}
            {/* Add a clear button in the top right */}
            <TouchableOpacity style={styles.clearButton}>
              <Ionicons name="close-circle" size={22} color="#6E6AFF" />
            </TouchableOpacity>
            {/* ...signature pad or image... */}
          </View>
          <Text style={styles.signatureHint}>Draw your signature above</Text>
          <Text style={styles.signatureSubHint}>Use your finger or stylus to sign</Text>
        </Animated.View>
        
        {/* Commit button */}
        <Animated.View entering={FadeInDown.delay(1000).duration(700)}>
          <TouchableOpacity style={styles.commitButton}>
            <LinearGradient
              colors={["#6E6AFF", "#584EE0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.commitButtonGradient}
            >
              <Text style={styles.commitButtonText}>I COMMIT</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
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
  pledgeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  pledgeUnderline: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6E6AFF',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 18,
    opacity: 0.8,
  },
  date: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pledgeCardGlass: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.11)',
    padding: 28,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  },
  pledgePointsContainer: {
    width: '100%',
    marginTop: 4,
  },
  pledgePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  pledgePointText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '500',
    letterSpacing: -0.2,
    flex: 1,
  },
  signatureCardGlass: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    alignItems: 'center',
  },
  signatureCardTitle: {
    color: '#6E6AFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  signatureBoxGlass: {
    width: '100%',
    height: 110,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.13)',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 2,
  },
  signatureHint: {
    color: '#6E6AFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 2,
  },
  signatureSubHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 2,
  },
  commitButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#6E6AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  commitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 60,
  },
  commitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});