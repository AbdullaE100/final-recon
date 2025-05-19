import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { UserSearch, Check, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { checkUserDataExists, retrieveUserData } from '@/utils/userDataSync';
import { storeData, STORAGE_KEYS } from '@/utils/storage';

export default function RecoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [userFound, setUserFound] = useState(false);
  
  // Check if the username exists
  const checkUsername = async () => {
    // Basic validation
    if (!username.trim()) {
      setError('Please enter your name to continue');
      return;
    }
    
    try {
      setIsChecking(true);
      setError('');
      
      // Check if username exists in Supabase
      const exists = await checkUserDataExists(username.trim());
      
      if (exists) {
        setUserFound(true);
      } else {
        setError('No data found for this name. Check spelling or try another name.');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setError('Unable to check for user data. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };
  
  // Restore user data
  const restoreData = async () => {
    try {
      setIsRestoring(true);
      
      // Retrieve and restore user data from Supabase
      const success = await retrieveUserData(username.trim());
      
      if (success) {
        // Mark onboarding as completed
        await storeData(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
        
        // Navigate to main app
        router.replace('/(tabs)' as any);
      } else {
        setError('Failed to restore data. Please try again.');
        setUserFound(false);
      }
    } catch (error) {
      console.error('Error restoring data:', error);
      setError('An error occurred while restoring your data.');
      setUserFound(false);
    } finally {
      setIsRestoring(false);
    }
  };
  
  // Go back to onboarding if user wants to start fresh
  const goToOnboarding = () => {
    router.replace('/onboarding' as any);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#0A0B1A', '#151B33', '#1A2140']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={goToOnboarding}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {/* Content area */}
        <Animated.View 
          style={styles.contentArea}
          entering={FadeIn.duration(600)}
        >
          {/* Icon and title */}
          <Animated.View 
            style={styles.iconContainer}
            entering={FadeInDown.delay(200).duration(800)}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.1)']}
              style={styles.iconBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <UserSearch size={32} color={colors.primary} />
            </LinearGradient>
          </Animated.View>
          
          <Animated.Text 
            style={[styles.title, { color: colors.text }]}
            entering={FadeInDown.delay(300).duration(800)}
          >
            Recover Your Data
          </Animated.Text>
          
          <Animated.Text 
            style={[styles.subtitle, { color: colors.secondaryText }]}
            entering={FadeInDown.delay(400).duration(800)}
          >
            Enter the name you used previously to restore your data. This will recover your streak, journal entries, and achievements.
          </Animated.Text>
          
          {/* Input card with blur effect */}
          <Animated.View 
            style={styles.inputCard}
            entering={FadeInDown.delay(500).duration(800)}
          >
            <BlurView intensity={15} tint="dark" style={styles.inputCardBlur}>
              {!userFound ? (
                <>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: error ? colors.error : 'rgba(255,255,255,0.1)'
                    }]}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.placeholder}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="words"
                    editable={!isChecking}
                    maxLength={20}
                  />
                  
                  {error ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {error}
                    </Text>
                  ) : null}
                  
                  <TouchableOpacity
                    style={[styles.button, { 
                      opacity: username.trim() && !isChecking ? 1 : 0.7,
                      backgroundColor: colors.primary
                    }]}
                    onPress={checkUsername}
                    disabled={!username.trim() || isChecking}
                    activeOpacity={0.85}
                  >
                    {isChecking ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Check for Data</Text>
                        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.userFoundContainer}>
                    <View style={styles.userFoundIconContainer}>
                      <Check size={28} color="#2ecc71" />
                    </View>
                    <Text style={[styles.userFoundText, { color: colors.text }]}>
                      Data found for {username}
                    </Text>
                    <Text style={[styles.userFoundSubtext, { color: colors.secondaryText }]}>
                      Ready to restore your progress?
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.button, { 
                      backgroundColor: '#2ecc71',
                      opacity: isRestoring ? 0.7 : 1
                    }]}
                    onPress={restoreData}
                    disabled={isRestoring}
                    activeOpacity={0.85}
                  >
                    {isRestoring ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Restore My Data</Text>
                        <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setUserFound(false)}
                    disabled={isRestoring}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.secondaryText }]}>
                      Try another name
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              <TouchableOpacity
                style={styles.startFreshButton}
                onPress={goToOnboarding}
                disabled={isChecking || isRestoring}
              >
                <Text style={[styles.startFreshText, { color: colors.secondaryText }]}>
                  Start fresh instead
                </Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 24,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: '80%',
    lineHeight: 24,
  },
  inputCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  inputCardBlur: {
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  startFreshButton: {
    marginTop: 24,
    padding: 12,
    alignItems: 'center',
  },
  startFreshText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  userFoundContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userFoundIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userFoundText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  userFoundSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 