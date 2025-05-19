import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react-native';

export default function StripeTestScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{type: string, message: string, isError?: boolean}>>([]);
  
  // Function to add a log message
  const addLog = (type: string, message: string, isError = false) => {
    setResults(prev => [...prev, { type, message, isError }]);
  };
  
  // Function to test Stripe checkout
  const testStripeCheckout = async () => {
    try {
      setLoading(true);
      setResults([]);
      
      // Check if user is authenticated
      if (!user) {
        addLog('auth', 'Not authenticated. Please sign in first.', true);
        return;
      }
      
      addLog('auth', `Authenticated as ${user.email}`);
      
      // Get session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        addLog('auth', `Session error: ${sessionError.message}`, true);
        return;
      }
      
      if (!sessionData?.session?.access_token) {
        addLog('auth', 'No access token found in session', true);
        return;
      }
      
      addLog('auth', 'Successfully retrieved access token');
      
      // Call the Stripe checkout endpoint
      const checkoutUrl = `https://gtxigxwklomqdlihxjyd.functions.supabase.co/stripe-checkout`;
      addLog('request', `Calling checkout endpoint: ${checkoutUrl}`);
      
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: 'nofapapp://subscription',
        }),
      });
      
      addLog('response', `Response status: ${response.status}`);
      
      // Get response text
      const responseText = await response.text();
      addLog('response', `Raw response: ${responseText}`);
      
      // Try to parse as JSON
      try {
        const jsonResponse = JSON.parse(responseText);
        
        if (jsonResponse.sessionUrl) {
          addLog('success', `Checkout URL: ${jsonResponse.sessionUrl}`);
          addLog('success', 'Stripe checkout is properly configured!');
        } else if (jsonResponse.error) {
          addLog('error', `Error: ${jsonResponse.error}`, true);
          
          // Provide specific advice based on error
          if (jsonResponse.error.includes('API key')) {
            addLog('error', 'The error indicates an issue with the Stripe API key. Check STRIPE_SECRET_KEY environment variable.', true);
          } else if (jsonResponse.error.includes('price')) {
            addLog('error', 'The error indicates an issue with the price ID. Check SUBSCRIPTION_PRICE_ID environment variable.', true);
          }
        } else {
          addLog('error', 'No session URL or error in response', true);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        addLog('error', `Failed to parse response as JSON: ${errorMessage}`, true);
        
        // Check for HTML response
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
          addLog('error', 'The response is HTML instead of JSON. This typically happens when an error occurs in the Edge Function.', true);
        }
      }
    } catch (error: any) {
      addLog('error', `Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Run the test on initial load
  useEffect(() => {
    if (user) {
      testStripeCheckout();
    }
  }, [user]);
  
  return (
    <>
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
        
        <Text style={[styles.title, { color: colors.text }]}>Stripe Integration Test</Text>
        
        <ScrollView
          style={styles.logsContainer}
          contentContainerStyle={styles.logsContent}
        >
          {results.length === 0 && !loading ? (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No test results yet. Press the button below to test your Stripe integration.
            </Text>
          ) : (
            results.map((log, index) => (
              <View 
                key={index} 
                style={[
                  styles.logItem, 
                  { 
                    backgroundColor: log.isError 
                      ? 'rgba(255, 0, 0, 0.1)' 
                      : log.type === 'success' 
                        ? 'rgba(0, 255, 0, 0.1)' 
                        : 'rgba(255, 255, 255, 0.1)',
                    borderLeftColor: log.isError 
                      ? '#ff0000' 
                      : log.type === 'success' 
                        ? '#00ff00' 
                        : '#ffffff' 
                  }
                ]}
              >
                <Text style={[styles.logType, { color: colors.primary }]}>
                  {log.type.toUpperCase()}
                </Text>
                <Text style={[styles.logMessage, { color: colors.text }]}>
                  {log.message}
                </Text>
              </View>
            ))
          )}
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
                Testing Stripe integration...
              </Text>
            </View>
          )}
        </ScrollView>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testStripeCheckout}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Run Test Again'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.helpSection}>
          <Text style={[styles.helpTitle, { color: colors.text }]}>
            Need help fixing Stripe?
          </Text>
          <Text style={[styles.helpText, { color: colors.secondaryText }]}>
            Check the "stripe-setup-guide.md" file in the supabase/functions directory
            of your project for detailed setup instructions.
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  logsContent: {
    paddingBottom: 16,
  },
  logItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  logType: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  helpSection: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 