import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import SignatureScreen from 'react-native-signature-canvas';
import { storeData, STORAGE_KEYS, getData } from '@/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import useAchievementNotification from '@/hooks/useAchievementNotification';

interface CommitmentScreenProps {
  onSign: () => void;
}

const commitment = [
  "I commit to my personal journey of growth and self-improvement.",
  "I will take responsibility for my actions and decisions.",
  "I will be patient with myself and celebrate small victories.",
  "I am worth this effort, and I deserve the freedom that awaits.",
];

const CommitmentScreen: React.FC<CommitmentScreenProps> = ({ onSign }) => {
  const { colors } = useTheme();
  const [signature, setSignature] = useState<string | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const fadeOutAnim = useRef(new Animated.Value(1)).current;
  const signatureRef = useRef<any>(null);
  
  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.9)).current;
  const cardAnimValue = useRef(new Animated.Value(0)).current;
  const signatureBoxOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.95)).current;
  
  // Animated lighting flash for signature completion
  const flashOpacity = useRef(new Animated.Value(0)).current;
  
  const { showAchievement } = useAchievementNotification();
  
  // Run entry animations
  useEffect(() => {
    const animations = [
      // Title animation with impact
      Animated.sequence([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        })
      ]),
      
      // Commitment card animation
      Animated.timing(cardAnimValue, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      
      // Signature section animation
      Animated.timing(signatureBoxOpacity, {
        toValue: 1,
        duration: 800,
        delay: 600,
        useNativeDriver: true,
      }),
      
      // Button animation
      Animated.sequence([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          delay: 800,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        })
      ])
    ];
    
    Animated.parallel(animations).start();
  }, []);
  
  // Handle signature completion
  const handleSignature = async (signatureBase64: string) => {
    console.log('Signature captured');
    setSignature(signatureBase64);
    
    // Flash effect for signature capture
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    // Strong haptic feedback for signature completion
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Store the signature and date for later use
    try {
      // Get existing preferences first
      const existingPrefs = await getData(STORAGE_KEYS.USER_PREFERENCES, {});
      
      // Merge new signature data with existing preferences
      const updatedPreferences = {
        ...existingPrefs,
        signature: signatureBase64,
        pledgeDate: Date.now()
      };
      
      // Save the updated preferences
      await storeData(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences)
        .then(() => console.log('Signature stored successfully'))
        .catch(err => console.error('Error storing signature:', err));
    } catch (error) {
      console.error('Failed to store signature:', error);
    }
  };
  
  // Handle clear button
  const handleClear = () => {
    console.log('Clearing signature...');
    
    // Multiple approaches to ensure clearing works
    try {
      // Method 1: Standard API
      if (signatureRef.current) {
        signatureRef.current.clearSignature();
      }
      
      // Method 2: Reset via direct manipulation (for some implementations)
      if (signatureRef.current && signatureRef.current._webView) {
        signatureRef.current._webView.injectJavaScript(`
          if (window.signaturePad) {
            window.signaturePad.clear();
            true;
          }
        `);
      }
      
      // Reset all state
    setSignature(null);
      setHasSigned(false);
      
      // Force redraw of signature pad in next cycle
      setTimeout(() => {
        if (signatureRef.current) {
          console.log('Refreshing signature pad...');
          signatureRef.current.readSignature();
        }
      }, 50);
      
      // Haptic feedback for clear action
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      console.log('Signature cleared successfully');
    } catch (error) {
      console.error('Error clearing signature:', error);
    }
  };
  
  // Handle signature empty check
  const handleEmpty = () => {
    console.log('Signature is empty');
    setSignature(null);
    showAchievement({
      title: "Signature Required", 
      description: "Your signature represents your commitment",
      buttonText: "OK"
    });
  };
  
  // Handle signature end
  const handleEnd = () => {
    signatureRef.current?.readSignature();
  };
  
  const handleCommit = () => {
    if (!signature) {
      showAchievement({
        title: "Signature Required", 
        description: "Your signature represents your commitment",
        buttonText: "OK"
      });
      return;
    }
    
    setHasSigned(true);
    
    // Strong haptic for commitment
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Animate fade out before navigation
    Animated.timing(fadeOutAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      onSign();
    });
  };
  
  // Style for signature box
  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none; 
      border: none;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      background-color: rgba(20, 20, 28, 0.95);
    }
  `;
  
  // Animated styles
  const titleAnimStyle = {
    opacity: titleOpacity,
    transform: [{ scale: titleScale }]
  };
  
  const cardAnimStyle = {
    opacity: cardAnimValue,
    transform: [
      { 
        translateY: cardAnimValue.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0]
        }) 
      },
      { 
        scale: cardAnimValue.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [0.9, 1.03, 1]
        }) 
      }
    ]
  };
  
  const buttonAnimStyle = {
    opacity: buttonOpacity,
    transform: [{ scale: buttonScale }]
  };
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: colors.background, opacity: fadeOutAnim }
      ]}
    >
      {/* Animated background elements */}
      <View style={styles.backgroundElements}>
        {/* Dark blue flames/energy effect */}
        <MotiView
          from={{ opacity: 0.5, translateY: 0 }}
          animate={{ opacity: 0.7, translateY: -10 }}
          transition={{ 
            type: 'timing',
            duration: 3000,
            loop: true,
            repeatReverse: true
          }}
          style={styles.energyEffect1}
        />
        
        <MotiView
          from={{ opacity: 0.3, translateY: 0 }}
          animate={{ opacity: 0.5, translateY: -15 }}
          transition={{ 
            type: 'timing',
            duration: 4000,
            loop: true,
            repeatReverse: true,
            delay: 500
          }}
          style={styles.energyEffect2}
        />
        
        {/* Geometric accents */}
        <View style={styles.geometricAccent1} />
        <View style={styles.geometricAccent2} />
        <View style={styles.geometricAccent3} />
      </View>
      
      <View style={styles.content}>
        {/* Title with strong visual impact */}
        <Animated.View style={[styles.titleContainer, titleAnimStyle]}>
          <Text style={styles.title}>YOUR COMMITMENT</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>
        
        {/* Commitment Card with powerful design */}
        <Animated.View style={[styles.commitmentCardContainer, cardAnimStyle]}>
          <LinearGradient
            colors={['rgba(22, 24, 42, 0.95)', 'rgba(38, 40, 65, 0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.commitmentGradient}
          >
            <View style={styles.commitmentInnerBorder}>
              <View style={styles.commitmentContent}>
          {commitment.map((line, index) => (
                  <MotiView 
              key={index}
                    style={styles.commitmentItemContainer}
                    from={{ opacity: 0, translateX: -10 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ 
                      delay: 600 + (index * 150),
                      type: 'timing',
                      duration: 500
                    }}
                  >
                    <View style={styles.bulletPoint} />
                    <Text style={styles.commitmentText}>
              {line}
            </Text>
                  </MotiView>
          ))}
        </View>
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Signature Section with strong masculine aesthetics */}
        <Animated.View style={[styles.signatureSection, { opacity: signatureBoxOpacity }]}>
          <LinearGradient
            colors={['rgba(22, 24, 42, 0.9)', 'rgba(30, 32, 55, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.signatureGradient}
          >
            <View style={styles.signatureLabelContainer}>
              <View style={styles.signatureLabelAccent} />
              <Text style={styles.instructionText}>
                SIGN BELOW TO COMMIT
        </Text>
            </View>
        
            <View style={styles.signatureContainer}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onEnd={handleEnd}
            webStyle={signatureStyle}
            descriptionText=""
                bgWidth={Platform.OS === 'web' ? 500 : (width * 0.9) - 60}
                bgHeight={160}
                minWidth={3}
                maxWidth={5.5}
                penColor="#FFFFFF"
                backgroundColor="rgba(20, 20, 28, 0.95)"
            dotSize={1}
            imageType="image/png"
            dataURL={signature || undefined}
            androidHardwareAccelerationDisabled={false}
                autoClear={false}
                clearText=""
              />
            </View>
          </LinearGradient>
          
          {/* Flash effect overlay for signature completion */}
          <Animated.View style={[
            styles.signatureFlash,
            { opacity: flashOpacity }
          ]} />
        </Animated.View>
        
        {/* Commit Button with powerful visual impact */}
        <Animated.View style={[styles.buttonSection, buttonAnimStyle]}>
          <Text style={[
            styles.signatureStatus, 
            { color: signature ? '#00D1FF' : 'rgba(255,255,255,0.4)' }
          ]}>
            {signature ? "SIGNATURE CAPTURED ✓" : "AWAITING YOUR SIGNATURE"}
          </Text>
          
          <TouchableOpacity
            style={[
              styles.commitButton, 
              { opacity: signature ? 1 : 0.4 }
            ]}
            onPress={handleCommit}
            disabled={!signature || hasSigned}
          >
            <LinearGradient
              colors={['#0066FF', '#0044CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.commitButtonGradient}
            >
              <View style={styles.buttonInnerContent}>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.commitButtonText}>I COMMIT</Text>
                  {signature && <View style={styles.buttonHighlight} />}
                </View>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
            
            {signature && (
              <View style={styles.commitButtonShadow} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backgroundElements: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  energyEffect1: {
    position: 'absolute',
    width: width * 1.5,
    height: 500,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 85, 255, 0.07)',
    bottom: -300,
    transform: [{ rotate: '-15deg' }],
  },
  energyEffect2: {
    position: 'absolute',
    width: width * 1.5,
    height: 400,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 85, 255, 0.07)',
    bottom: -200,
    left: -100,
    transform: [{ rotate: '10deg' }],
  },
  geometricAccent1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderWidth: 1,
    borderColor: 'rgba(0, 89, 255, 0.12)',
    transform: [{ rotate: '45deg' }],
    top: height * 0.1,
    right: -150,
  },
  geometricAccent2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(0, 130, 255, 0.08)',
    top: height * 0.55,
    left: -80,
  },
  geometricAccent3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(0, 175, 255, 0.1)',
    bottom: height * 0.2,
    right: -100,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 5,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#0066FF',
    marginTop: 5,
  },
  commitmentCardContainer: {
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  commitmentGradient: {
    borderRadius: 3,
    padding: 1,
  },
  commitmentInnerBorder: {
    borderLeftWidth: 3,
    borderLeftColor: '#0066FF',
    paddingVertical: 15,
  },
  commitmentContent: {
    paddingHorizontal: 24,
  },
  commitmentItemContainer: {
    flexDirection: 'row',
    marginBottom: 22,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D1FF',
    marginTop: 8,
    marginRight: 16,
  },
  commitmentText: {
    fontSize: 17,
    fontFamily: 'System',
    fontWeight: '600',
    lineHeight: 24,
    flex: 1,
    color: '#FFFFFF',
  },
  signatureSection: {
    width: '100%',
    marginBottom: 30,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  signatureGradient: {
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 130, 255, 0.15)',
  },
  signatureLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  signatureLabelAccent: {
    width: 4,
    height: 16,
    backgroundColor: '#00D1FF',
    marginRight: 10,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: 1,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  signatureContainer: {
    padding: 12,
    height: 170,
    position: 'relative',
  },
  signatureFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  signatureStatus: {
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  commitButton: {
    width: '100%',
    position: 'relative',
    height: 58,
    borderRadius: 3,
    overflow: 'visible',
    marginBottom: 10,
  },
  commitButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  buttonInnerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  buttonTextContainer: {
    position: 'relative',
    paddingHorizontal: 8,
  },
  buttonHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -3,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  buttonIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  commitButtonShadow: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    height: 58,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 102, 255, 0.4)',
    zIndex: -1,
    width: '96%',
    alignSelf: 'center',
  },
  commitButtonText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
});

export default CommitmentScreen; 