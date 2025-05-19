import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignIn } from '@/components/onboarding/GoogleSignIn';
import { ArrowLeft } from 'lucide-react-native';

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        Alert.alert('Signup Error', error.message);
      } else {
        Alert.alert(
          'Verification Email Sent',
          'Please check your email to verify your account',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSuccess = (data: any) => {
    console.log('Google sign-in success:', data);
    router.replace('/(tabs)');
  };
  
  const handleGoogleError = (error: Error) => {
    console.error('Google sign-in error:', error);
    Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
  };
  
  const goToLogin = () => {
    router.push('/login' as any);
  };
  
  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Sign up to sync your progress across devices and access premium features
          </Text>
        </View>
        
        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your email"
              placeholderTextColor={colors.secondaryText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Password</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Create a password"
              placeholderTextColor={colors.secondaryText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirm your password"
              placeholderTextColor={colors.secondaryText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.orContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.secondaryText }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
          
          <GoogleSignIn
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            isLoading={loading}
            setIsLoading={setLoading}
          />
          
          <View style={styles.privacyContainer}>
            <Text style={[styles.privacyText, { color: colors.secondaryText }]}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
              We respect your privacy and will never share your data without consent.
            </Text>
          </View>
          
          <View style={styles.bottomTextContainer}>
            <Text style={[styles.bottomText, { color: colors.secondaryText }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={[styles.loginText, { color: colors.primary }]}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  privacyContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  bottomText: {
    fontSize: 14,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 