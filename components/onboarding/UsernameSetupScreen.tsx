import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { User } from 'lucide-react-native';

interface UsernameSetupScreenProps {
  onComplete: (username: string) => void;
}

const UsernameSetupScreen: React.FC<UsernameSetupScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // Basic validation
    if (!username.trim()) {
      setError('Please enter a name to continue');
      return;
    }
    
    // Validate that name has no special characters
    if (!/^[a-zA-Z0-9 ]+$/.test(username)) {
      setError('Please use only letters, numbers, and spaces');
      return;
    }
    
    // Clear any errors
    setError('');
    
    // Call the completion handler
    onComplete(username.trim());
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Subtle background gradient */}
        <LinearGradient
          colors={['#0A0B1A', '#151B33', '#1A2140']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
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
              <User size={32} color={colors.primary} />
            </LinearGradient>
          </Animated.View>
          
          <Animated.Text 
            style={[styles.title, { color: colors.text }]}
            entering={FadeInDown.delay(300).duration(800)}
          >
            What's your name?
          </Animated.Text>
          
          <Animated.Text 
            style={[styles.subtitle, { color: colors.secondaryText }]}
            entering={FadeInDown.delay(400).duration(800)}
          >
            We'll use this to personalize your experience.
            No email or password needed.
          </Animated.Text>
          
          {/* Input card with blur effect */}
          <Animated.View 
            style={styles.inputCard}
            entering={FadeInDown.delay(500).duration(800)}
          >
            <BlurView intensity={15} tint="dark" style={styles.inputCardBlur}>
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
                autoComplete="name"
                maxLength={20}
              />
              
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              ) : null}
                
              <TouchableOpacity
                style={[styles.button, { opacity: username.trim() ? 1 : 0.7 }]}
                onPress={handleSubmit}
                disabled={!username.trim()}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#6366F1', '#4338CA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="chevron-forward-outline" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={[styles.privacyText, { color: colors.secondaryText }]}>
                Your data stays on your device. No account required.
              </Text>
            </BlurView>
          </Animated.View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  contentArea: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
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
    overflow: 'hidden',
    marginTop: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  privacyText: {
    marginTop: 20,
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  }
});

export default UsernameSetupScreen; 