import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  runOnJS,
  interpolate,
  withSequence,
  withDelay,
  withRepeat,
  withSpring,
  SharedValue
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface QuizScreenProps {
  onComplete: (answers: Record<string, string>) => void;
}

// Screen dimensions for responsive layouts
const { width, height } = Dimensions.get('window');

// Quiz questions
const questions = [
  {
    id: 'frequency',
    question: 'How often do you watch porn?',
    options: [
      { id: 'daily_multiple', text: 'Multiple times daily' },
      { id: 'daily', text: 'Daily' },
      { id: 'weekly', text: 'Few times a week' },
      { id: 'occasionally', text: 'Occasionally' },
    ],
  },
  {
    id: 'duration',
    question: 'How long do your sessions typically last?',
    options: [
      { id: 'short', text: '15-30 minutes' },
      { id: 'medium', text: '30-60 minutes' },
      { id: 'long', text: '1-2 hours' },
      { id: 'very_long', text: 'More than 2 hours' },
    ],
  },
  {
    id: 'goal',
    question: 'What is your main goal?',
    options: [
      { id: 'recovery', text: 'Recovery from addiction' },
      { id: 'discipline', text: 'Building self-discipline' },
      { id: 'mental', text: 'Mental clarity and focus' },
      { id: 'energy', text: 'More energy and motivation' },
    ],
  },
  {
    id: 'struggle',
    question: 'How long have you been struggling?',
    options: [
      { id: 'beginner', text: 'Just starting my journey' },
      { id: 'months', text: 'A few months' },
      { id: 'year', text: 'About a year' },
      { id: 'years', text: 'Several years' },
    ],
  },
  {
    id: 'challenging',
    question: 'What do you find most challenging?',
    options: [
      { id: 'urges', text: 'Fighting urges and cravings' },
      { id: 'habits', text: 'Breaking bad habits' },
      { id: 'accountability', text: 'Staying accountable' },
      { id: 'motivation', text: 'Maintaining motivation' },
    ],
  }
];

// Particle component for background animation
const Particle = ({ initialX, initialY, size, delay }: { 
  initialX: number; 
  initialY: number; 
  size: number;
  delay: number;
}) => {
  const translateY = useSharedValue(initialY);
  const translateX = useSharedValue(initialX);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  
  useEffect(() => {
    // Fade in
    opacity.value = withDelay(delay, withTiming(0.7, { duration: 1000 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 800 }));
    
    // Floating animation
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialY - 30, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(initialY, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1, // infinite
        true // reverse
      )
    );
    
    // Slight horizontal drift
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialX + 10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(initialX - 10, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1, // infinite
        true // reverse
      )
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      position: 'absolute',
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
    };
  });
  
  return <Animated.View style={animatedStyle} />;
};

// Background particles container
const ParticlesBackground = () => {
  // Create an array of particles with random positions
  const particles = Array.from({ length: 8 }).map((_, index) => ({
    id: index,
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 6 + 2, // Between 2-8px
    delay: index * 100, // Stagger the animations
  }));
  
  return (
    <View style={styles.particlesContainer}>
      {particles.map(particle => (
        <Particle 
          key={particle.id}
          initialX={particle.x}
          initialY={particle.y}
          size={particle.size}
          delay={particle.delay}
        />
      ))}
    </View>
  );
};

// Progress indicator component
const ProgressIndicator = ({ 
  totalSteps, 
  currentStep 
}: { 
  totalSteps: number; 
  currentStep: number;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor: isActive 
                  ? colors.primary 
                  : isCompleted 
                  ? colors.secondary 
                  : colors.progressTrack,
                width: isActive ? 26 : 12,
                transform: [{ scale: isActive ? 1.1 : 1 }]
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const QuizScreen: React.FC<QuizScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Animation values
  const slideAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const isAnimating = useRef(false);
  
  // Background gradient animation
  const gradientProgress = useSharedValue(0);
  
  useEffect(() => {
    // Animate gradient shift continuously
    gradientProgress.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.ease }),
      -1, // Infinite repeats
      true // Reverse
    );
  }, []);

  // Handle selecting an answer
  const handleSelect = (questionId: string, answerId: string) => {
    // Animate selection
    setSelectedOption(answerId);
    
    // Update answers after a slight delay for better UX
    setAnswers({ ...answers, [questionId]: answerId });
    // Automatically move to the next question after a short delay
    setTimeout(() => {
      handleNext();
    }, 300);
    
    // Animate button to indicate it's now available - using simpler easing functions
    buttonScale.value = withSequence(
      withTiming(1.05, { duration: 120, easing: Easing.ease }),
      withTiming(1, { duration: 120, easing: Easing.ease })
    );
  };
  
  // Set current question (called after animation)
  const updateQuestion = useCallback((newIndex: number) => {
    setCurrentQuestion(newIndex);
    setSelectedOption(answers[questions[newIndex]?.id] || null);
    isAnimating.current = false;
  }, [answers]);

  // Move to the next question with animation
  const handleNext = () => {
    if (isAnimating.current) return;
    
    if (currentQuestion < questions.length - 1) {
      isAnimating.current = true;
      
      // Animate button press - simpler animation
      buttonScale.value = withSequence(
        withTiming(0.95, { duration: 100, easing: Easing.ease }),
        withTiming(1, { duration: 100, easing: Easing.ease })
      );
      
      // Scale down and fade out
      scaleAnim.value = withTiming(0.95, { duration: 200 });
      opacityAnim.value = withTiming(0, { 
        duration: 250,
        easing: Easing.out(Easing.ease) 
      });
      
      slideAnim.value = withTiming(-0.5, {
        duration: 300,
        easing: Easing.out(Easing.ease)
      }, () => {
        // Reset position for next question
        slideAnim.value = 0.5;
        
        // Run on JS thread to update state
        runOnJS(updateQuestion)(currentQuestion + 1);
        
        // Scale up and fade in new question with spring animation
        scaleAnim.value = withTiming(1, { duration: 300 });
        slideAnim.value = withSpring(0, {
          damping: 20,
          stiffness: 90
        });
        
        opacityAnim.value = withTiming(1, { 
          duration: 300,
          easing: Easing.in(Easing.ease) 
        });
      });
    } else {
      // Animate button press - simpler animation
      buttonScale.value = withSequence(
        withTiming(0.95, { duration: 100, easing: Easing.ease }),
        withTiming(1, { duration: 100, easing: Easing.ease })
      );
      
      // Fade out before completing
      opacityAnim.value = withTiming(0, { 
        duration: 300,
        easing: Easing.out(Easing.ease) 
      }, () => {
        runOnJS(onComplete)(answers);
      });
    }
  };

  // Move to the previous question with animation
  const handleBack = () => {
    if (isAnimating.current || currentQuestion <= 0) return;
    
    isAnimating.current = true;
    
    // Animate button press - simpler animation
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.ease }),
      withTiming(1, { duration: 100, easing: Easing.ease })
    );
    
    // Scale down and fade out
    scaleAnim.value = withTiming(0.95, { duration: 200 });
    opacityAnim.value = withTiming(0, { 
      duration: 250,
      easing: Easing.out(Easing.ease) 
    });
    
    slideAnim.value = withTiming(0.5, {
      duration: 300,
      easing: Easing.out(Easing.ease)
    }, () => {
      // Reset position for previous question
      slideAnim.value = -0.5;
      
      // Run on JS thread to update state
      runOnJS(updateQuestion)(currentQuestion - 1);
      
      // Scale up and fade in previous question with spring animation
      scaleAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0, {
        damping: 20,
        stiffness: 90
      });
      
      opacityAnim.value = withTiming(1, { 
        duration: 300,
        easing: Easing.in(Easing.ease) 
      });
    });
  };

  // Check if current question has been answered
  const currentQuestionAnswered = !!answers[questions[currentQuestion].id];
  
  // Gradient animated style
  const gradientAnimatedStyle = useAnimatedStyle(() => {
    // Interpolate between different gradient positions
    const progress = gradientProgress.value;
    return {
      opacity: 0.8 + (progress * 0.2), // Subtle opacity animation
    };
  });
  
  // Question container animated style
  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      slideAnim.value,
      [-1, -0.5, 0, 0.5, 1],
      [-width, -width * 0.5, 0, width * 0.5, width]
    );
    
    return {
      opacity: opacityAnim.value,
      transform: [
        { translateX },
        { scale: scaleAnim.value }
      ],
    };
  });
  
  // Button animation
  const nextButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: currentQuestionAnswered ? buttonScale.value : 0.98 },
      ],
      // Use consistent duration to prevent flickering
      opacity: withTiming(currentQuestionAnswered ? 1 : 0.6, { duration: 150 }),
    };
  });
  
  const backButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value },
      ],
      // Add a stable opacity to prevent flickering
      opacity: withTiming(1, { duration: 150 }),
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated gradient background */}
      <Animated.View style={[StyleSheet.absoluteFill, gradientAnimatedStyle]}>
        <LinearGradient
          colors={['#151933', '#1A2340', '#0E102A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Animated background particles */}
      <ParticlesBackground />
      
      {/* Enhanced progress indicator */}
      <ProgressIndicator 
        totalSteps={questions.length}
        currentStep={currentQuestion} 
          />

      {/* Question content - now with enhanced animations */}
      <Animated.View style={[styles.questionContainer, animatedStyle]}>
        <BlurView intensity={10} tint="dark" style={styles.questionBlurContainer}>
          <Sparkles 
            color="#4F46E5" 
            size={24} 
            style={styles.sparkleIcon} 
          />
          
        <Text style={[styles.question, { color: colors.text }]}>
          {questions[currentQuestion].question}
        </Text>

          <View style={styles.optionsContainer}>
            {questions[currentQuestion].options.map((option) => {
              const isSelected = answers[questions[currentQuestion].id] === option.id;
              const isBeingSelected = selectedOption === option.id;
              
              return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                {
                      backgroundColor: isSelected
                        ? colors.primary
                        : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isSelected
                      ? colors.primary
                        : 'rgba(255, 255, 255, 0.12)',
                      transform: [{ scale: isBeingSelected ? 1.02 : 1 }],
                },
              ]}
              onPress={() =>
                handleSelect(questions[currentQuestion].id, option.id)
              }
                  activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                        color: isSelected
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.85)',
                        fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {option.text}
              </Text>
            </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={[styles.buttonsContainer, { paddingBottom: insets.bottom + 16 }]}>
        {currentQuestion > 0 && (
          <Animated.View style={backButtonAnimatedStyle}>
          <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.border }]}
            onPress={handleBack}
          >
              <ChevronLeft size={20} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>
                Back
              </Text>
          </TouchableOpacity>
          </Animated.View>
        )}



      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: 'none',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 2,
  },
  progressDot: {
    height: 6,
    width: 10,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  questionContainer: {
    width: width * 0.9,
    alignSelf: 'center',
    flex: 1,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  questionBlurContainer: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
  },
  sparkleIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    flex: 1,
  },
  optionItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.9,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButtonContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 140,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default QuizScreen;