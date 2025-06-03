import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, CheckCircle2, LockOpen, Sparkles, XCircle, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignIn } from '@/components/onboarding/GoogleSignIn';
import { Session } from '@supabase/supabase-js';
import { purchasePremiumSubscription, checkSubscriptionStatus, restorePurchases, getProducts } from '@/utils/inAppPurchase';

// Define subscription type for Apple IAP
interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  transaction_id: string;
  status: string;
  expires_date: string;
  purchase_date: string;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  
  useEffect(() => {
    // Debug logging to check authentication status
    console.log('Auth status:', { 
      isLoggedIn: !!user, 
      userId: user?.id,
      email: user?.email
    });

    if (user) {
      checkPremiumStatus();
      loadProducts();
    } else {
      // Show login modal if user is not logged in
      setShowLoginModal(true);
    }
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
  
  const checkPremiumStatus = async () => {
    if (!user) return;
    
    try {
      const status = await checkSubscriptionStatus();
      setIsPremium(status.isPremium);
      
      if (status.isPremium && status.subscription) {
        setSubscription({
          id: status.subscription.transactionId,
          user_id: user.id,
          product_id: status.subscription.productId,
          transaction_id: status.subscription.transactionId,
          status: 'active',
          expires_date: status.subscription.expiresDate,
          purchase_date: status.subscription.purchaseDate
        });
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productList = await getProducts();
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
    }
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
  
  const handleLoginSuccess = (session: Session) => {
    console.log('Login successful, closing modal');
    setShowLoginModal(false);
    // The useEffect will handle checking premium status and loading products
  };

  const isActive = isPremium || subscription?.status === 'active';

  const handlePurchase = async () => {
    if (!user) {
      console.log('No user found, cannot initiate purchase');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Initiating premium purchase for user:', user.id);
      const result = await purchasePremiumSubscription();
      
      if (result.success) {
        console.log('Purchase successful');
        Alert.alert('Success', 'Premium subscription activated!');
        await checkPremiumStatus(); // Refresh status
      } else {
        console.error('Purchase failed:', result.error);
        Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase');
      }
    } catch (error) {
      console.error('Error during purchase:', error);
      Alert.alert('Error', 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        Alert.alert('Success', 'Purchases restored successfully!');
        await checkPremiumStatus(); // Refresh status
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases found to restore.');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
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
        {isActive ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Premium Active</Text>
            </View>
            
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Animated.View entering={FadeIn.duration(600)} style={styles.successCard}>
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.successGradient}
                >
                  <CheckCircle2 size={48} color="white" />
                  <Text style={styles.successTitle}>Premium Active!</Text>
                  <Text style={styles.successSubtitle}>
                    You have access to all premium features
                  </Text>
                </LinearGradient>
              </Animated.View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.restoreButton, { backgroundColor: colors.surface }]}
                  onPress={handleRestore}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                      Restore Purchases
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Upgrade to Premium</Text>
            </View>
            
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Animated.View entering={FadeIn.duration(600)} style={styles.premiumCard}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark || colors.primary]}
                  style={styles.premiumGradient}
                >
                  <Sparkles size={48} color="white" />
                  <Text style={styles.premiumTitle}>Unlock Premium Features</Text>
                  <Text style={styles.premiumSubtitle}>
                    Get unlimited access to all companion features
                  </Text>
                </LinearGradient>
              </Animated.View>
              
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.text }]}>Unlimited AI conversations</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.text }]}>Advanced progress tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.text }]}>Premium companion personalities</Text>
                </View>
                <View style={styles.featureItem}>
                  <CheckCircle2 size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.text }]}>Priority support</Text>
                </View>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
                  onPress={handlePurchase}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <LockOpen size={20} color="white" />
                      <Text style={styles.purchaseButtonText}>Upgrade to Premium</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.restoreButton, { backgroundColor: colors.surface }]}
                  onPress={handleRestore}
                  disabled={loading}
                >
                  <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                    Restore Purchases
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
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
                        text: 'Try Again',
                        onPress: () => handlePurchase()
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
                          text: 'Try Again',
                        onPress: () => handlePurchase()
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
     padding: 8,
   },
   premiumCard: {
     marginHorizontal: 20,
     marginTop: 20,
     borderRadius: 16,
     overflow: 'hidden',
     elevation: 4,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.25,
     shadowRadius: 4,
   },
  premiumGradient: {
    padding: 24,
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  featuresContainer: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  successCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successGradient: {
    padding: 24,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '500',
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