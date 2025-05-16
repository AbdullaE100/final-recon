import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import QuizScreen from '@/components/onboarding/QuizScreen';
import CommitmentScreen from '@/components/onboarding/CommitmentScreen';
import CompanionSelectionScreen, { CompanionChoice } from '@/components/onboarding/CompanionSelectionScreen';
import { storeData, STORAGE_KEYS, getData } from '@/utils/storage';

// Define the user preferences interface
interface UserPreferences {
  signature?: string;
  pledgeDate?: number;
  quizAnswers?: Record<string, any>;
  companion?: CompanionChoice;
  [key: string]: any; // Allow for other properties
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  // Onboarding state
  const [step, setStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionChoice | null>(null);

  // Steps in the onboarding flow
  const steps = [
    'welcome',
    'quiz',
    'commitment',
    'companionSelection',
  ];

  // Handle next step in the flow
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboardingAndNavigate();
    }
  };

  // Handle saving quiz answers
  const handleQuizComplete = (answers: Record<string, any>) => {
    setQuizAnswers(answers);
    handleNext();
  };

  // Handle companion selection
  const handleCompanionSelect = (companion: CompanionChoice) => {
    setSelectedCompanion(companion);
  };

  // This function is called when the user confirms their companion choice
  const handleCompanionSelectionComplete = async () => {
    await completeOnboardingAndNavigate();
  };

  // Complete onboarding and navigate to main app
  const completeOnboardingAndNavigate = async () => {
    if (!selectedCompanion) {
      console.warn("Companion not selected before attempting to complete onboarding.");
    }
    // Save user preferences and onboarding status
    await storeData(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    
    // Get existing preferences (including signature if present)
    const existingPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
    console.log('Retrieved existing preferences:', Object.keys(existingPreferences));
    
    // Ensure we don't overwrite signature data
    const updatedPreferences: UserPreferences = {
      ...existingPreferences,
      quizAnswers,
      companion: selectedCompanion || undefined,
      // Make sure we don't overwrite signature or pledgeDate if they exist
      signature: existingPreferences.signature || undefined,
      pledgeDate: existingPreferences.pledgeDate || undefined,
    };
    
    console.log('Saving updated preferences with keys:', Object.keys(updatedPreferences));
    await storeData(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences);
    
    // Navigate to the main app
    router.replace('/(tabs)' as any);
  };

  // Render the current step of the onboarding flow
  const renderStep = () => {
    switch (steps[step]) {
      case 'welcome':
        return <WelcomeScreen onContinue={handleNext} />;
      case 'quiz':
        return <QuizScreen onComplete={handleQuizComplete} />;
      case 'commitment':
        return <CommitmentScreen onSign={handleNext} />;
      case 'companionSelection':
        return <CompanionSelectionScreen onSelect={handleCompanionSelect} onComplete={handleCompanionSelectionComplete} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {renderStep()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
}); 