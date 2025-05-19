import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, CheckCircle2, Timer, Sparkles, Clock } from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import { 
  initializeIAP, 
  purchasePremiumSubscription, 
  handlePurchaseCompletion,
  restorePurchases
} from '@/utils/inAppPurchase';

export default function FreeTrialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Check if price is passed as parameter
  const trialPrice = params.price?.toString() || '3.99';
  const companionSelected = params.selectedCompanion?.toString() || 'default';

  // Initialize IAP module when component mounts
  useEffect(() => {
    const setup = async () => {
      try {
        await initializeIAP();
      } catch (error) {
        console.error('Error initializing IAP:', error);
      }
    };
    
    setup();
  }, []);

  // Handle starting the premium subscription with native IAP
  const handleStartPremium = async () => {
    try {
      setLoading(true);
      setProcessingPayment(true);
      
      // Initiate the purchase flow - this uses native IAP
      const success = await purchasePremiumSubscription();
      
      if (success) {
        // Update app state to reflect premium status
        await handlePurchaseCompletion(true);
        
        // Show success message and navigate to main app
        Alert.alert(
          "Success!",
          "Your premium subscription has been activated!",
          [{ 
            text: "Continue", 
            onPress: () => router.replace('/(tabs)') 
          }]
        );
      } else {
        Alert.alert(
          "Purchase Incomplete",
          "The purchase wasn't completed. You can try again later or continue with the free version."
        );
      }
    } catch (error) {
      console.error('Error during premium purchase:', error);
      Alert.alert(
        "Purchase Error",
        "There was an error processing your purchase. Please try again later."
      );
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  // Handle restoring previous purchases
  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      
      // Call restore purchases function
      const restored = await restorePurchases();
      
      if (restored) {
        Alert.alert(
          "Purchases Restored",
          "Your premium subscription has been restored!",
          [{ 
            text: "Continue", 
            onPress: () => router.replace('/(tabs)') 
          }]
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore."
        );
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert(
        "Restore Error",
        "There was an error restoring your purchases. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Skip the subscription and go to the main app
  const handleSkipTrial = () => {
    router.replace('/(tabs)');
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={['#151B33', '#1A2140', '#0A0B1A']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeIn.duration(800)}
            style={styles.headerSection}
          >
            <Sparkles color="#FFD700" size={40} />
            <Text style={styles.title}>Unleash Your Full Potential</Text>
            <Text style={styles.subtitle}>
              Get premium features, no signup required
            </Text>
          </Animated.View>
          
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.trialBadge}>
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.trialBadgeText}>PREMIUM</Text>
            </View>
            
            <View style={styles.pricingContainer}>
              <Text style={styles.pricingTitle}>NoFap Premium</Text>
              <View style={styles.priceRow}>
                <Text style={styles.dollarSign}>$</Text>
                <Text style={styles.price}>{trialPrice}</Text>
                <Text style={styles.period}>/month</Text>
              </View>
              <Text style={styles.trialNote}>automatic renewal, cancel anytime</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What's included:</Text>
              
              <FeatureItem title="Advanced companion features" />
              <FeatureItem title="Unlimited journaling" />
              <FeatureItem title="Premium badge collection" />
              <FeatureItem title="Advanced analytics" />
              <FeatureItem title="Custom goals and challenges" />
              <FeatureItem title="Cloud backup & sync" />
            </View>
          </BlurView>
          
          <View style={styles.buttonsContainer}>
            {processingPayment ? (
              <View style={[styles.primaryButton, styles.processingContainer]}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.processingText}>Processing Payment...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleStartPremium}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Start Premium Subscription</Text>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkipTrial}
              disabled={loading || processingPayment}
            >
              <Text style={styles.secondaryButtonText}>Continue with Free Version</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
              disabled={loading || processingPayment}
            >
              <Text style={styles.restoreButtonText}>Restore Previous Purchases</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.disclaimer}>
            Payment will be charged to your Apple ID account at the confirmation of purchase.
            Subscription automatically renews unless it is canceled at least
            24 hours before the end of the current period. Your account will be charged
            ${trialPrice} for renewal within 24 hours prior to the end of the current period.
            You can manage and cancel your subscriptions by going to your App Store
            account settings after purchase.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// Feature item component with checkmark
function FeatureItem({ title }: { title: string }) {
  return (
    <View style={styles.featureItem}>
      <CheckCircle2 size={18} color="#4F46E5" />
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  trialBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 48,
  },
  period: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  trialNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    marginVertical: 20,
  },
  featuresContainer: {
    width: '100%',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 10,
    fontSize: 14,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  processingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  }
}); 