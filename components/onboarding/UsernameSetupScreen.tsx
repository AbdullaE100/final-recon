import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn,
  FadeInDown,
  SlideInDown,
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
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (!username.trim()) {
      setError('Please enter a name to continue');
      return;
    }
    
    if (!/^[a-zA-Z0-9 ]+$/.test(username)) {
      setError('Please use only letters, numbers, and spaces');
      return;
    }
    
    setError('');
    onComplete(username.trim());
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Dark background */}
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={['#0A0A0C', '#111116', '#13131A']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
        
        {/* Subtle decorative elements */}
        <Animated.View 
          style={[styles.decorativeCircle1]}
          entering={FadeIn.delay(600).duration(1000)}
        >
          <LinearGradient
            colors={['rgba(99, 78, 237, 0.15)', 'rgba(51, 47, 208, 0.05)']}
            style={styles.circle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        
        <Animated.View 
          style={[styles.decorativeCircle2]}
          entering={FadeIn.delay(800).duration(1000)}
        >
          <LinearGradient
            colors={['rgba(138, 43, 226, 0.15)', 'rgba(94, 23, 235, 0.05)']}
            style={styles.circle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Content container */}
        <Animated.View 
          style={styles.contentContainer}
          entering={SlideInDown.duration(800)}
        >
          {/* User icon */}
          <Animated.View 
            style={styles.iconWrapper}
            entering={FadeInDown.delay(400).duration(800)}
          >
            <View style={styles.iconBackground}>
              <User size={24} color="#6E6AFF" strokeWidth={1.5} />
            </View>
          </Animated.View>

          {/* Main content */}
          <Animated.View 
            style={styles.mainContent}
            entering={FadeInDown.delay(500).duration(800)}
          >
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              We'll use this to personalize your journey.{'\n'}No email or password needed.
            </Text>
          </Animated.View>

          {/* Input area */}
          <Animated.View 
            style={styles.inputContainer}
            entering={FadeInDown.delay(600).duration(800)}
          >
            <View style={[
              styles.inputWrapper,
              isFocused && styles.inputWrapperFocused,
              error && styles.inputWrapperError
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="words"
                autoComplete="name"
                maxLength={20}
              />
            </View>

            {error ? (
              <Animated.Text 
                style={styles.errorText}
                entering={FadeIn.duration(300)}
              >
                {error}
              </Animated.Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, { opacity: username.trim() ? 1 : 0.7 }]}
              onPress={handleSubmit}
              disabled={!username.trim()}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#6E6AFF', '#584EE0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.privacyText}>
              Your data stays on your device. No account required.
            </Text>
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
    alignItems: 'center',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.3,
    opacity: 0.8,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -height * 0.15,
    left: -width * 0.3,
    opacity: 0.8,
  },
  circle: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(110, 106, 255, 0.1)',
  },
  mainContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputWrapper: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderColor: '#6E6AFF',
  },
  inputWrapperError: {
    borderColor: '#FF453A',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 17,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF453A',
    marginBottom: 16,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
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
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: -0.2,
  },
  privacyText: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

export default UsernameSetupScreen; 