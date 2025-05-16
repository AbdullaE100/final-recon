import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { colors } = useTheme();
  
  return (
    <LinearGradient
      colors={[colors.primary, colors.card]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={[styles.appName, { color: colors.white }]}>CLEARMIND</Text>
          <Text style={[styles.tagline, { color: colors.white }]}>Your Journey to Freedom</Text>
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={[styles.welcomeTitle, { color: colors.white }]}>
            Welcome to Your Personal Growth Journey
          </Text>
          
          <Text style={[styles.welcomeText, { color: colors.white }]}>
            We're about to create a customized plan just for you. Let's take a quick moment to understand your needs better.
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={onContinue}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>Begin</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.85,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    height: height * 0.8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Nunito-SemiBold',
    opacity: 0.9,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: width * 0.6,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
});

export default WelcomeScreen; 