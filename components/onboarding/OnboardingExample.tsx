import React, { useState } from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import QuizScreen from './QuizScreen';
import QuizResultsScreen from './QuizResultsScreen';
import TimeImpactScreen from './TimeImpactScreen';
import CommitmentScreen from './CommitmentScreen';

// This is a demo component that shows how the TimeImpactScreen would be integrated
// into the onboarding flow. This is not meant to be used in production.
const OnboardingExample = () => {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState<'quiz' | 'results' | 'impact' | 'commitment'>('quiz');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  
  // Calculate risk level based on quiz answers
  const getRiskLevel = () => {
    // This is a simplified example - in a real app, you'd have more complex logic
    if (!quizAnswers.struggle) return 'Medium Risk';
    
    if (quizAnswers.struggle === 'years') {
      return 'High Risk';
    } else if (quizAnswers.struggle === 'year') {
      return 'Medium Risk';
    } else {
      return 'Low Risk';
    }
  };
  
  // Calculate weekly hours based on quiz answers
  const getWeeklyHours = () => {
    // This is a simplified example - in a real app, you'd have more complex logic
    if (!quizAnswers.struggle) return 7;
    
    const hourMap = {
      beginner: 5,
      months: 7,
      year: 10,
      years: 14
    };
    
    return hourMap[quizAnswers.struggle as keyof typeof hourMap] || 7;
  };
  
  // Handle quiz completion
  const handleQuizComplete = (answers: Record<string, string>) => {
    setQuizAnswers(answers);
    setCurrentStep('results');
  };
  
  // Handle quiz results continuation
  const handleResultsContinue = () => {
    setCurrentStep('impact');
  };
  
  // Handle time impact continuation
  const handleImpactContinue = () => {
    setCurrentStep('commitment');
  };
  
  // Handle commitment continuation
  const handleCommitmentSign = () => {
    // In a real app, this would navigate to the next screen in the flow
    setCurrentStep('quiz'); // Reset to quiz for this example
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {currentStep === 'quiz' && (
        <QuizScreen onComplete={handleQuizComplete} />
      )}
      
      {currentStep === 'results' && (
        <QuizResultsScreen 
          answers={quizAnswers} 
          onContinue={handleResultsContinue} 
        />
      )}
      
      {currentStep === 'impact' && (
        <TimeImpactScreen 
          riskLevel={getRiskLevel() as 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Very High Risk'}
          weeklyHours={getWeeklyHours()}
          onContinue={handleImpactContinue}
        />
      )}
      
      {currentStep === 'commitment' && (
        <CommitmentScreen onSign={handleCommitmentSign} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OnboardingExample; 