import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, 
  FlatList, Animated, ColorValue, Platform, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ArrowRight, AlertTriangle, Code, Book, Dumbbell, Brush } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface TimeImpactScreenProps {
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Urgent Risk' | 'Very High Risk';
  weeklyHours: number;
  onContinue: () => void;
}

const achievements = [
  {
    icon: <Code size={28} color="#fff" />,
    title: 'Learn Basic Coding',
    hours: '30 Hours',
    description: 'Master HTML, CSS fundamentals',
    gradient: ['#4361ee', '#3a0ca3'] as [string, string]
  },
  {
    icon: <Book size={28} color="#fff" />,
    title: 'Read a Trilogy',
    hours: '25 Hours',
    description: 'Get lost in a new world',
    gradient: ['#f72585', '#7209b7'] as [string, string]
  },
  {
    icon: <Dumbbell size={28} color="#fff" />,
    title: 'Start a Fitness Habit',
    hours: '20 Hours',
    description: 'Build strength and endurance',
    gradient: ['#4cc9f0', '#4361ee'] as [string, string]
  },
  {
    icon: <Brush size={28} color="#fff" />,
    title: 'Learn to Paint',
    hours: '40 Hours',
    description: 'Unleash your inner artist',
    gradient: ['#fb8500', '#ffb703'] as [string, string]
  }
];

const TimeImpactScreen: React.FC<TimeImpactScreenProps> = ({ riskLevel, weeklyHours, onContinue }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const annualHours = Math.round(weeklyHours * 52);
  const daysWasted = Math.round(annualHours / 24);
  const scrollX = useRef(new Animated.Value(0)).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const parallaxX = useRef(new Animated.Value(0)).current as Animated.Value; // Cast to Animated.Value type
  
  // Animation effect on component mount
  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle continue with haptic feedback
  const handleContinue = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animated button press effect
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => onContinue());
  }, [onContinue]);
  
  // Handle card press with haptic feedback
  const handleCardPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Update parallax effect on scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.setValue(offsetX);
  };
  
  // Background pattern parallax effect
  const patternAnimatedStyle = React.useCallback(() => {
    return {
      transform: [
        { 
          translateX: scrollX.interpolate({
            inputRange: [0, width],
            outputRange: [0, -20]
          }) 
        }
      ]
    };
  }, [scrollX]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#0B1120', '#030712'] as [string, string, string]} 
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Animated subtle background patterns */}
      <Animated.View 
        style={[
          styles.patternOverlay, 
          patternAnimatedStyle()
        ]} 
        pointerEvents="none"
      >
        {Array.from({ length: 80 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternDot,
              {
                left: Math.random() * width * 1.2,
                top: Math.random() * height * 1.2,
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                opacity: Math.random() * 0.15 + 0.05,
              }
            ]}
          />
        ))}
      </Animated.View>
      
      <View style={[
          styles.contentContainer,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }
      ]}>
        <Animated.View style={[
          styles.headerContainer,
          { 
            transform: [
              { translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })},
              { scale: animatedValue }
            ],
            opacity: animatedValue,
          }
        ]}>
          <View style={styles.warningIcon}>
            <AlertTriangle size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.headerText}>High Risk</Text>
          <Text style={styles.headerSubtext}>Time Impact Assessment</Text>
          </Animated.View>
        
        <Animated.View style={[
          styles.statsContainer,
          {
            opacity: animatedValue,
            transform: [
              { translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0]
              })},
              { scale: animatedValue }
            ],
          }
        ]}>
          <BlurView intensity={30} tint="dark" style={styles.statsBlur}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>WEEKLY</Text>
              <Text style={styles.statValue}>{weeklyHours.toFixed(1)}<Text style={styles.statUnit}> hrs</Text></Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ANNUAL</Text>
              <Text style={styles.statValue}>{annualHours}<Text style={styles.statUnit}> hrs</Text></Text>
              <View style={styles.impactContainer}>
                <Text style={styles.impactText}>{`${daysWasted} days lost`}</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>
        
        <Animated.View style={[
          styles.creationSection,
          {
            opacity: animatedValue,
            transform: [
              { translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0]
              })},
            ],
          }
        ]}>
            <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Better Alternatives</Text>
            <Text style={styles.sectionSubtitle}>What you could create instead</Text>
          </View>
          
            <FlatList
            data={achievements}
              horizontal
              showsHorizontalScrollIndicator={false}
            pagingEnabled
              snapToInterval={width * 0.85}
              decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            renderItem={({item, index}) => {
              const inputRange = [
                (index - 1) * width * 0.85,
                index * width * 0.85,
                (index + 1) * width * 0.85
              ];
              
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.9, 1, 0.9],
                extrapolate: 'clamp',
              });
              
              const translateY = scrollX.interpolate({
                inputRange,
                outputRange: [30, 0, 30],
                extrapolate: 'clamp',
              });
              
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              });
              
              return (
                <Animated.View 
                  style={[
                    styles.cardWrapper, 
                    { 
                      transform: [
                        { scale }, 
                        { translateY }
                      ],
                      opacity 
                    }
                  ]}
                >
                  <TouchableOpacity 
                    activeOpacity={0.95}
                    onPress={handleCardPress}
                    style={styles.cardTouchable}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
                      <LinearGradient
                        colors={item.gradient}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.cardIconContainer}>
                          {item.icon}
                        </View>
                        
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <Text style={styles.cardHours}>{item.hours}</Text>
                          <Text style={styles.cardDescription}>{item.description}</Text>
                        </View>
                      </LinearGradient>
                    </BlurView>
                    
                    {/* Add card shadow overlay */}
                    <LinearGradient
                      colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']} 
                      style={styles.cardShadow}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
            keyExtractor={(item) => item.title}
          />
          
          {/* Enhanced pagination indicators */}
          <View style={styles.pagination}>
            {achievements.map((_, i) => {
              const inputRange = [
                (i - 1) * width * 0.85,
                i * width * 0.85,
                (i + 1) * width * 0.85
              ];
              
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: 'clamp',
              });
              
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              
              const dotScale = scrollX.interpolate({
                inputRange,
                outputRange: [1, 1.2, 1],
                extrapolate: 'clamp',
              });
              
              return (
                <Animated.View 
                  key={i} 
                  style={[
                    styles.paginationDot,
                    { 
                      width: dotWidth, 
                      opacity: dotOpacity,
                      transform: [{ scale: dotScale }] 
                    }
                  ]} 
                />
              );
            })}
          </View>
        </Animated.View>
        
        <Animated.View style={[
          styles.footer,
          {
            opacity: animatedValue,
            transform: [
              { translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })}
            ]
          }
        ]}>
            <TouchableOpacity
              style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <BlurView intensity={30} tint="dark" style={styles.buttonBlur}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9'] as [string, string]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.buttonText}>I&apos;m Ready</Text>
              <View style={styles.arrowContainer}>
                <ArrowRight size={16} color="#fff" />
              </View>
            </BlurView>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>Choose growth over guilt</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternDot: {
    position: 'absolute',
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  warningIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  headerText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  statsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  statsBlur: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  impactContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  impactText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  creationSection: {
    marginVertical: 15,
  },
  sectionTitleContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  carouselContent: {
    paddingVertical: 10,
  },
  cardWrapper: {
    width: width * 0.85,
    height: height * 0.18,  // Reduced height
    marginHorizontal: width * 0.075 / 2,
  },
  cardTouchable: {
    flex: 1,
    borderRadius: 20,  // Reduced radius
    overflow: 'hidden',
  },
  cardBlur: {
    flex: 1,
    borderRadius: 20,  // Reduced radius
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  cardHours: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  cardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 30,
    borderTopLeftRadius: 20,  // Reduced radius
    borderTopRightRadius: 20,  // Reduced radius
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 3,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  button: {
    borderRadius: 26,
    width: '100%',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    letterSpacing: -0.2,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default TimeImpactScreen;