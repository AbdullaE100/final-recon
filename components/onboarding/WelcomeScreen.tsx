import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  FadeInDown
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { colors } = useTheme();
  const lottieRef = React.useRef<LottieView>(null);
  
  // Subtle background animation values
  const backgroundPosition = useSharedValue(0);
  const highlightOpacity = useSharedValue(0);
  
  // Start animations
  useEffect(() => {
    // Subtle background movement
    backgroundPosition.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-5, { duration: 8000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    // Highlight animations
    highlightOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 1200 })
    );
    
    // Play the subtle particle animation
    setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }, 300);
  }, []);
  
  // Animated styles
  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: backgroundPosition.value }]
  }));
  
  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value
  }));
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Refined gradient background with sophisticated color theory */}
      <LinearGradient
        colors={['#0A0B1A', '#151B33', '#1A2140']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Subtle background pattern */}
      <Animated.View style={[styles.backgroundPattern, backgroundAnimatedStyle]}>
    <LinearGradient
          colors={['rgba(41, 66, 132, 0.03)', 'rgba(41, 66, 132, 0.06)']}
          style={styles.patternGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      
      {/* Subtle particle animation */}
      <LottieView
        ref={lottieRef}
        source={require('@/assets/animations/welcome-particles.json')}
        style={styles.particles}
        loop
        speed={0.3}
      />
      
      {/* Top branding section */}
      <Animated.View 
        style={styles.brandSection}
        entering={FadeIn.duration(800)}
      >
        {/* Logo mark */}
        <Animated.View 
          style={styles.logoMark}
          entering={FadeIn.delay(400).duration(800)}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.logoMarkInner}
          >
            <Text style={styles.logoMarkText}>P</Text>
          </LinearGradient>
        </Animated.View>
        
        {/* Brand name with high contrast */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(800)}
          style={styles.brandNameContainer}
        >
          <Text style={styles.brandName}>PLEDGE</Text>
          <Animated.View 
            style={[styles.brandUnderline, highlightAnimatedStyle]} 
          />
        </Animated.View>
        
        {/* Brand tagline with improved readability */}
        <Animated.View 
          entering={FadeInDown.delay(800).duration(800)}
          style={styles.taglineWrapper}
        >
          <BlurView intensity={30} tint="dark" style={styles.taglineBackground}>
            <Text style={styles.brandTagline}>Break the Cycle. Reclaim Control.</Text>
          </BlurView>
        </Animated.View>
      </Animated.View>
      
      {/* Main content card with sophisticated blur effects */}
      <Animated.View 
        style={styles.contentCard}
        entering={FadeInDown.delay(400).duration(1000)}
      >
        <BlurView intensity={15} tint="dark" style={styles.contentCardBlur}>
          <View style={styles.contentInner}>
            {/* Content card highlight accent */}
            <View style={styles.cardAccent} />
            
            {/* Main headline with proper typography hierarchy */}
            <Text style={styles.headline}>Ready for a Reset?</Text>
            
            {/* Subheadline with improved readability and spacing */}
            <Text style={styles.subheadline}>
              We're about to build your escape plan. No judgments, just results. Let's make this the time that sticks.
          </Text>
            
            {/* Call to action button with refined design */}
        <TouchableOpacity
              style={styles.ctaButton}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#E94C89', '#D91860']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
        >
                <Text style={styles.ctaText}>Let's Do This</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#FFFFFF" />
              </LinearGradient>
        </TouchableOpacity>
      </View>
        </BlurView>
      </Animated.View>
      
      {/* Decorative elements with subtle animation */}
      <Animated.View 
        entering={FadeIn.delay(1000).duration(1500)}
        style={styles.decorativeElements}
      >
        <View style={styles.circleDecor1} />
        <View style={styles.circleDecor2} />
        <View style={styles.circleDecor3} />
      </Animated.View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1A',
  },
  backgroundPattern: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.6,
  },
  patternGradient: {
    width: '100%',
    height: '100%',
  },
  particles: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.25,
  },
  brandSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: height * 0.15,
    position: 'relative',
  },
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoMarkInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
  },
  logoMarkText: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 26,
    color: '#FFFFFF',
  },
  brandNameContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 38,
    fontFamily: 'System',
    fontWeight: '800',
    letterSpacing: 8,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  brandUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#E94C89',
    borderRadius: 1.5,
  },
  taglineWrapper: {
    overflow: 'hidden',
    borderRadius: 20,
    marginTop: 12,
  },
  taglineBackground: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  brandTagline: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  contentCard: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  contentCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  contentInner: {
    padding: 28,
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#E94C89',
  },
  headline: {
    fontSize: 26,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '400',
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 28,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#E94C89',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  decorativeElements: {
    position: 'absolute',
    width: width,
    height: height,
    pointerEvents: 'none',
  },
  circleDecor1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    top: height * 0.35,
    right: -80,
  },
  circleDecor2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(233,76,137,0.12)',
    top: height * 0.5,
    left: -40,
  },
  circleDecor3: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    bottom: -100,
    right: 40,
  },
});

export default WelcomeScreen; 