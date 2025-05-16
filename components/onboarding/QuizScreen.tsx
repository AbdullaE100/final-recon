import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  runOnJS,
  interpolate,
  withSequence,
} from 'react-native-reanimated';

interface QuizScreenProps {
  onComplete: (answers: Record<string, string>) => void;
}

// Quiz questions
const questions = [
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
  },
  {
    id: 'previous',
    question: 'Have you tried to quit before?',
    options: [
      { id: 'never', text: 'This is my first attempt' },
      { id: 'few', text: 'A few times' },
      { id: 'many', text: 'Many times' },
      { id: 'relapse', text: 'Recently relapsed' },
    ],
  },
  {
    id: 'support',
    question: 'Who knows about your journey?',
    options: [
      { id: 'nobody', text: 'Nobody yet' },
      { id: 'partner', text: 'Partner/Spouse' },
      { id: 'friends', text: 'Close friends' },
      { id: 'community', text: 'Support community' },
    ],
  },
];

const QuizScreen: React.FC<QuizScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Animation values
  const slideAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(1);
  const isAnimating = useRef(false);

  // Handle selecting an answer
  const handleSelect = (questionId: string, answerId: string) => {
    setAnswers({ ...answers, [questionId]: answerId });
  };
  
  // Set current question (called after animation)
  const updateQuestion = useCallback((newIndex: number) => {
    setCurrentQuestion(newIndex);
    isAnimating.current = false;
  }, []);

  // Move to the next question with animation
  const handleNext = () => {
    if (isAnimating.current) return;
    
    if (currentQuestion < questions.length - 1) {
      isAnimating.current = true;
      
      // Animate out current question
      opacityAnim.value = withTiming(0, { 
        duration: 200,
        easing: Easing.out(Easing.ease) 
      });
      
      slideAnim.value = withTiming(-1, {
        duration: 300,
        easing: Easing.out(Easing.ease)
      }, () => {
        // Reset position for next question
        slideAnim.value = 1;
        
        // Run on JS thread to update state
        runOnJS(updateQuestion)(currentQuestion + 1);
        
        // Animate in new question
        slideAnim.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease)
        });
        
        opacityAnim.value = withTiming(1, { 
          duration: 200,
          easing: Easing.in(Easing.ease) 
        });
      });
    } else {
      onComplete(answers);
    }
  };

  // Move to the previous question with animation
  const handleBack = () => {
    if (isAnimating.current || currentQuestion <= 0) return;
    
    isAnimating.current = true;
    
    // Animate out current question
    opacityAnim.value = withTiming(0, { 
      duration: 200,
      easing: Easing.out(Easing.ease) 
    });
    
    slideAnim.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease)
    }, () => {
      // Reset position for previous question
      slideAnim.value = -1;
      
      // Run on JS thread to update state
      runOnJS(updateQuestion)(currentQuestion - 1);
      
      // Animate in previous question
      slideAnim.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease)
      });
      
      opacityAnim.value = withTiming(1, { 
        duration: 200,
        easing: Easing.in(Easing.ease) 
      });
    });
  };

  // Check if current question has been answered
  const currentQuestionAnswered = !!answers[questions[currentQuestion].id];
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      slideAnim.value,
      [-1, 0, 1],
      [-width, 0, width]
    );
    
    return {
      opacity: opacityAnim.value,
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {questions.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index === currentQuestion
                    ? colors.primary
                    : index < currentQuestion
                    ? colors.secondary
                    : colors.progressTrack,
              },
            ]}
          />
        ))}
      </View>

      {/* Question content */}
      <Animated.View
        style={[
          styles.questionContainer,
          animatedStyle,
        ]}
      >
        <Text style={[styles.question, { color: colors.text }]}>
          {questions[currentQuestion].question}
        </Text>

        <ScrollView
          style={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {questions[currentQuestion].options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                {
                  backgroundColor:
                    answers[questions[currentQuestion].id] === option.id
                      ? colors.primary
                      : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() =>
                handleSelect(questions[currentQuestion].id, option.id)
              }
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      answers[questions[currentQuestion].id] === option.id
                        ? colors.white
                        : colors.text,
                  },
                ]}
              >
                {option.text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.buttonsContainer}>
        {currentQuestion > 0 && (
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.card }]}
            onPress={handleBack}
            disabled={isAnimating.current}
          >
            <ChevronLeft size={24} color={colors.text} />
            <Text style={[styles.navText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.navButton,
            {
              backgroundColor: currentQuestionAnswered ? colors.accent : colors.cardAlt,
              opacity: currentQuestionAnswered ? 1 : 0.7,
              marginLeft: currentQuestion > 0 ? 10 : 0,
            },
          ]}
          onPress={handleNext}
          disabled={!currentQuestionAnswered || isAnimating.current}
        >
          <Text
            style={[
              styles.navText,
              { color: currentQuestionAnswered ? colors.white : colors.secondaryText },
            ]}
          >
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </Text>
          <ChevronRight size={24} color={currentQuestionAnswered ? colors.white : colors.secondaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  question: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  optionsContainer: {
    maxHeight: 350,
  },
  optionItem: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'Nunito-SemiBold',
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: width / 3,
  },
  navText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    marginHorizontal: 5,
  },
});

export default QuizScreen; 