import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, CheckCircle2, LockOpen, Sparkles, XCircle, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { WebView } from 'react-native-webview';
import { GoogleSignIn } from '@/components/onboarding/GoogleSignIn';
import { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import { Session } from '@supabase/supabase-js';
import { createDirectCheckoutUrl } from '@/utils/directStripeCheckout';

// Define subscription type
interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_end: string;
  canceled_at: string | null;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Debug logging to check authentication status
    console.log('Auth status:', { 
      isLoggedIn: !!user, 
      userId: user?.id,
      email: user?.email
    });
    
    // Set a timeout to prevent infinite loading
    loadingTimeoutRef.current = setTimeout(() => {
      if (!showWebView) {
        setLoadingError('Payment setup is taking longer than expected.');
        console.log('Payment initialization timeout triggered');
      }
    }, 5000);

    if (user) {
      fetchSubscription();
      // Automatically start the payment process
      initiatePayment();
    } else {
      // Show login modal if user is not logged in
      setShowLoginModal(true);
    }

    // Clean up timeout when component unmounts
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [user]);
  
  // Direct login method
  const goToLogin = () => {
    setShowLoginModal(false);
    router.push('/login');
  };

  const handleGoogleSuccess = (data: Session) => {
    console.log('Google sign-in success:', data);
    setShowLoginModal(false);
    
    // Now that the user is signed in, fetch their subscription
    fetchSubscription();
    
    // After login, proceed with subscription
    setTimeout(() => {
      handleSubscribe();
    }, 500);
  };
  
  const handleGoogleError = (error: Error) => {
    console.error('Google sign-in error:', error);
    Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
  };
  
  const fetchSubscription = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Subscription data:', { data, error });
        
      if (error) {
        console.error('Error fetching subscription:', error);
        Alert.alert('Error', 'Failed to load subscription information');
      }
      
      setSubscription(data && data.length > 0 ? data[0] : null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in fetchSubscription:', errorMessage);
      Alert.alert('Error', 'Something went wrong while loading your subscription');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      // Check if the user is logged in - if not, show login modal
      if (!user) {
        console.log('User not logged in, showing login modal');
        setLoading(false);
        setShowLoginModal(true);
        return;
      }
      
      console.log('Starting subscription process for user:', user.id);
      
      // Skip server-side checkout and use direct checkout immediately
      console.log('Using direct checkout method');
      
      // Create direct checkout URL
      const directUrl = createDirectCheckoutUrl(
        subscription?.stripe_customer_id,
        'price_premium_monthly' // Use actual price ID from your Stripe account
      );
      console.log('Direct checkout URL:', directUrl);
      
      // Use WebView for in-app checkout experience
      setWebViewUrl(directUrl);
      setShowWebView(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in subscription process:', errorMessage);
      Alert.alert('Error', 'Could not open checkout. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      
      // Check if the user is logged in
      if (!user) {
        Alert.alert('Error', 'You must be logged in to manage your subscription');
        return;
      }
      
      // Check if we have a customer ID
      if (!subscription?.stripe_customer_id) {
        Alert.alert('Error', 'No active subscription found');
        return;
      }
      
      // Get a fresh auth token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.access_token) {
        console.error('Session error:', sessionError);
        Alert.alert('Authentication Error', 'Please log in again to continue');
        return;
      }
      
      // Get the Supabase URL from environment or fallback
      const supabaseProjectRef = 'gtxigxwklomqdlihxjyd';
      const portalUrl = `https://${supabaseProjectRef}.functions.supabase.co/v1/stripe-portal`;
      
      console.log('Calling portal endpoint:', portalUrl);
      
      // Call the Stripe portal endpoint
      const response = await fetch(portalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
          returnUrl: 'nofapapp://subscription',
        }),
      });
      
      console.log('Response status:', response.status);
      
      // Get the full response text for debugging
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Try to parse as JSON
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(responseText);
        console.log('Parsed JSON response:', jsonResponse);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        Alert.alert('Error', 'Invalid response from server');
        return;
      }
      
      if (!response.ok) {
        console.error('Portal error:', jsonResponse);
        Alert.alert('Error', jsonResponse.error || 'Could not access subscription management');
        return;
      }
      
      if (!jsonResponse.portalUrl) {
        console.error('No portal URL in response:', jsonResponse);
        Alert.alert('Error', 'No portal URL returned from server');
        return;
      }
      
      // Debug the portal URL
      console.log('Portal URL received:', jsonResponse.portalUrl);
      
      // Open the WebView with the portal URL
      setWebViewUrl(jsonResponse.portalUrl);
      setShowWebView(true);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error accessing portal:', errorMessage);
      Alert.alert('Error', `Subscription management failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWebViewNavigationStateChange = (newNavState: WebViewNavigation) => {
    // Log the navigation URL for debugging
    console.log('WebView navigating to:', newNavState.url);
    
    // Check if the URL is your return URL
    if (newNavState.url.startsWith('nofapapp://')) {
      console.log('Detected return URL, closing WebView');
      setShowWebView(false);
      // Refresh subscription status
      fetchSubscription();
    }
  };
  
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  
  // Function to initiate payment immediately
  const initiatePayment = () => {
    try {
      const directUrl = createDirectCheckoutUrl(
        subscription?.stripe_customer_id,
        'price_premium_monthly'
      );
      
      console.log('Direct checkout URL:', directUrl);
      setWebViewUrl(directUrl);
      setShowWebView(true);
      
      // Clear timeout once WebView is shown
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error creating direct checkout URL:', error);
      setLoadingError('Failed to create payment URL. Please try again.');
    }
  };
  
  // Function to go back to main app
  const goToMainApp = () => {
    router.replace('/(tabs)');
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
        {!showWebView && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            {loadingError ? (
              <>
                <AlertTriangle size={40} color={colors.error} style={{ marginBottom: 16 }} />
                <Text style={{ marginBottom: 20, color: colors.text, fontSize: 16, textAlign: 'center' }}>
                  {loadingError}
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={initiatePayment}
                >
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.skipButton, { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1, marginTop: 12 }]}
                  onPress={goToMainApp}
                >
                  <Text style={[styles.buttonText, { color: colors.text }]}>Continue Without Premium</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.text, fontSize: 16 }}>
                  Setting up payment...
                </Text>
              </>
            )}
          </View>
        )}
        
        {/* Checkout WebView Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={showWebView}
          onRequestClose={() => {
            console.log('WebView modal closed by user');
            setShowWebView(false);
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.webViewHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity 
                onPress={() => {
                  console.log('WebView close button pressed');
                  setShowWebView(false);
                  router.back();
                }} 
                style={styles.headerCloseButton}
              >
                <XCircle size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.webViewTitle, { color: colors.text }]}>Complete Your Purchase</Text>
            </View>
            
            {webViewUrl ? (
              <WebView
                source={{ uri: webViewUrl }}
                onNavigationStateChange={handleWebViewNavigationStateChange}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={false}
                incognito={true}
                thirdPartyCookiesEnabled={true}
                startInLoadingState={true}
                onLoadStart={(event) => {
                  console.log('WebView load started:', event.nativeEvent.url);
                }}
                onLoadEnd={(event) => {
                  console.log('WebView load ended:', event.nativeEvent.url, event.nativeEvent.loading);
                }}
                renderLoading={() => (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: '#FFFFFF', marginTop: 10 }]}>
                      Loading secure checkout...
                    </Text>
                  </View>
                )}
                onLoad={(syntheticEvent) => {
                  console.log('WebView loaded successfully');
                }}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', JSON.stringify(nativeEvent));
                  
                  // Clear the WebView in case of error
                  setShowWebView(false);
                  setLoadingError('Could not load the payment page. Please try a different method.');
                  
                  Alert.alert(
                    'Payment Error', 
                    'Could not load the payment page in the app.', 
                    [
                      {
                        text: 'Try Browser',
                        onPress: async () => {
                          const directUrl = createDirectCheckoutUrl(
                            subscription?.stripe_customer_id,
                            'price_premium_monthly'
                          );
                          await Linking.openURL(directUrl);
                        }
                      },
                      {
                        text: 'Try Again',
                        onPress: () => initiatePayment()
                      },
                      {
                        text: 'Skip',
                        style: 'cancel',
                        onPress: goToMainApp
                      }
                    ]
                  );
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView HTTP error:', JSON.stringify(nativeEvent));
                  
                  if (nativeEvent.statusCode >= 400) {
                    // Clear the WebView in case of error
                    setShowWebView(false);
                    setLoadingError('Payment gateway returned an error. Please try again.');
                    
                    Alert.alert(
                      'Payment Page Error', 
                      'There was a problem loading the checkout page.', 
                      [
                        {
                          text: 'Try Browser',
                          onPress: async () => {
                            const directUrl = createDirectCheckoutUrl(
                              subscription?.stripe_customer_id,
                              'price_premium_monthly'
                            );
                            await Linking.openURL(directUrl);
                          }
                        },
                        {
                          text: 'Try Again',
                          onPress: () => initiatePayment()
                        },
                        {
                          text: 'Skip',
                          style: 'cancel',
                          onPress: goToMainApp
                        }
                      ]
                    );
                  }
                }}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Setting up secure checkout...</Text>
              </View>
            )}
          </SafeAreaView>
        </Modal>
        
        {/* Login Modal */}
        <Modal
          visible={showLoginModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowLoginModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Sign in to Continue
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
                  Please sign in to access premium features
                </Text>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={goToLogin}
                >
                  <Text style={styles.modalButtonText}>Sign in with Email</Text>
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
              </View>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: colors.secondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

function FeatureItem({ title }: { title: string }) {
  return (
    <View style={styles.featureItem}>
      <CheckCircle2 size={20} color="#4F46E5" />
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 16,
  },
  webView: {
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: {
    width: '100%',
    marginBottom: 16,
  },
  modalButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  // Content styles
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  planSection: {
    marginBottom: 24,
  },
  premiumCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  premiumPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  premiumPeriod: {
    fontSize: 18,
    fontWeight: 'normal',
  },
  premiumDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  featuresContainer: {
    marginTop: 20,
  },
  cta: {
    alignItems: 'center',
  },
  ctaButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    marginBottom: 12,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16, 
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerCloseButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  directPayButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    backgroundColor: 'transparent',
  },
  directPayButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  browserPayButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  browserPayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textDecorationLine: 'underline',
  },
  debugButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
}); 