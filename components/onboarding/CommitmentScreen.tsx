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
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import useAchievementNotification from '@/hooks/useAchievementNotification';

interface CommitmentScreenProps {
  onSign: () => void;
}

// Simplified, more powerful commitments
const commitment = [
  "I embrace my journey toward freedom and growth",
  "I own my choices and their consequences",
  "I celebrate progress, no matter how small",
  "I am worthy of the better life ahead",
];

// Screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

// Signature will use a more sophisticated color
const SIGNATURE_COLOR = '#000000'; // Black for a clean, professional signature

// Particle component for subtle background animation
const Particle = ({ style }: { style: any }) => {
  const moveY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Randomize starting values
    const startingDelay = Math.random() * 3000;
    const duration = 5000 + Math.random() * 7000;
    
    // Fade in and move animation
    Animated.sequence([
      Animated.delay(startingDelay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(moveY, {
          toValue: -100 - Math.random() * 100,
          duration: duration,
          useNativeDriver: true,
        })
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Reset and repeat
      moveY.setValue(0);
      opacity.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(moveY, {
              toValue: -100 - Math.random() * 100,
              duration: duration,
              useNativeDriver: true,
            })
          ]),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.delay(1000)
        ])
      ).start();
    });
  }, []);
  
  return (
    <Animated.View 
      style={[
        style,
        {
          opacity,
          transform: [{ translateY: moveY }]
        }
      ]}
    />
  );
};

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
        .catch(err => console.error('Error storing signature:', err));
    } catch (error) {
      console.error('Failed to store signature:', error);
    }
  };
  
  // Handle clear button
  const handleClear = () => {
    
    
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
          
          signatureRef.current.readSignature();
        }
      }, 50);
      
      // Haptic feedback for clear action
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      
    } catch (error) {
      console.error('Error clearing signature:', error);
    }
  };
  
  // Handle signature empty check
  const handleEmpty = () => {
    
    setSignature(null);
    showAchievement({
      title: "Signature Required", 
      description: "Your mark represents your commitment",
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
        description: "Your mark represents your commitment",
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
  
  // Style for signature box - completely revised for better visibility
  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none; 
      border: none;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--body {
      border: none;
      position: relative;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      background: transparent;
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    canvas {
      background-color: white;
      border-radius: 8px;
      touch-action: none;
      width: 100% !important;
      height: 100% !important;
    }
    
    /* These settings specifically target the signature drawing functionality */
    .m-signature-pad {
      position: absolute;
      font-size: 10px;
      border: 1px solid #e8e8e8;
      background-color: white;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15), 0 0 10px rgba(0, 0, 0, 0.05) inset;
    }
    
    /* Custom style to show guidelines for signing */
    .m-signature-pad--body:after {
      content: '';
      position: absolute;
      left: 10%;
      right: 10%;
      bottom: 30%;
      height: 1px;
      background-color: #DDDDDD;
      z-index: 1;
    }
  `;

  // Card animation styles based on cardAnimValue
  const cardAnimatedStyle = {
    opacity: cardAnimValue,
    transform: [
      { 
        translateY: cardAnimValue.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };
  
  // Signature box animation
  const signatureAnimatedStyle = {
    opacity: signatureBoxOpacity,
    transform: [
      {
        translateY: signatureBoxOpacity.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
    ],
  };
  
  // Button animation
  const buttonAnimatedStyle = {
    opacity: buttonOpacity,
    transform: [
      { scale: buttonScale },
    ],
  };
  
  // Create an array of particles for the background
  const particles = Array.from({ length: 8 }).map((_, i) => {
    const size = 4 + Math.random() * 8;
    return (
      <Particle
        key={`particle-${i}`}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          left: Math.random() * width,
          bottom: Math.random() * height / 2,
        }}
      />
    );
  });
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeOutAnim, backgroundColor: colors.background }
      ]}
    >
      {/* Background elements */}
      <LinearGradient
        colors={['rgba(59, 82, 180, 0.4)', 'rgba(29, 32, 62, 0.2)', 'rgba(11, 12, 30, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
        />
        
      {/* Background particles */}
      {particles}
      
      {/* Flash effect */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: 'white', 
            opacity: flashOpacity,
            zIndex: 2
          }
        ]} 
        />
        
      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <Animated.Text 
          style={[
            styles.title, 
            { 
              color: colors.text,
              opacity: titleOpacity,
              transform: [{ scale: titleScale }]
            }
          ]}
        >
          YOUR PLEDGE
        </Animated.Text>
        
        {/* Underline below title */}
        <Animated.View 
          style={[
            styles.titleUnderline, 
            { 
              backgroundColor: colors.primary,
              opacity: titleOpacity,
              transform: [
                { 
                  scaleX: titleOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  })
                }
              ]
            }
          ]}
        />
        
        {/* Commitment card */}
        <Animated.View style={[styles.commitmentCard, cardAnimatedStyle]}>
          <BlurView intensity={10} tint="dark" style={styles.blurContainer}>
            {commitment.map((item, index) => (
                  <MotiView 
              key={index}
                from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ 
                      type: 'timing',
                  duration: 600,
                  delay: 600 + (index * 200),
                    }}
                style={styles.commitmentItemContainer}
                  >
                <View style={[styles.bulletPoint, { backgroundColor: colors.primary }]} />
                <Text style={[styles.commitmentText, { color: colors.text }]}>
                  {item}
            </Text>
                  </MotiView>
          ))}
          </BlurView>
        </Animated.View>
        
        {/* Signature area */}
        <Animated.View style={[styles.signatureContainer, signatureAnimatedStyle]}>
          <BlurView intensity={5} tint="dark" style={styles.signatureBlur}>
            <Text style={[styles.signatureLabel, { color: "#59A0DD" }]}>
              {signature ? 'YOUR SIGNATURE' : 'SIGN TO COMMIT'}
        </Text>
        
            <View style={styles.signatureBox}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onEnd={handleEnd}
                autoClear={false}
                descriptionText=""
                webStyle={signatureStyle}
                backgroundColor="white"
                penColor={SIGNATURE_COLOR}
                imageType="image/png"
                dotSize={2.5}
                minWidth={2.5}
                maxWidth={5}
                trimWhitespace={false}
              />
            </View>
            
            {!signature ? (
              <View style={styles.signatureInstructions}>
                <View style={styles.signatureHint}>
                  <Feather name="edit-2" size={16} color="#465A8C" />
                  <Text style={[styles.signatureHintText, { color: "#465A8C" }]}>
                    Draw your signature above
                  </Text>
                </View>
                <Text style={styles.signatureGuide}>
                  Use your finger or stylus to sign
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={handleClear}
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color="#465A8C" />
                <Text style={[styles.clearButtonText, { color: "#465A8C" }]}>
                  Clear signature
                </Text>
              </TouchableOpacity>
            )}
          </BlurView>
        </Animated.View>
        
        {/* Commit button */}
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={[
              styles.commitButton, 
              { backgroundColor: signature ? '#3046A5' : `rgba(48, 70, 165, 0.5)` }
            ]}
            onPress={handleCommit}
            disabled={hasSigned}
          >
            <Text style={styles.commitButtonText}>
              I COMMIT
            </Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 20, // Reduced from 40 to 20
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 25, // Reduced from 40 to 25
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  titleUnderline: {
    width: 60,
    height: 3,
    borderRadius: 2,
    marginBottom: 30, // Reduced from 40 to 30
  },
  commitmentCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20, // Reduced from 30 to 20
  },
  blurContainer: {
    borderRadius: 20,
    paddingVertical: 18, // Reduced from 24 to 18
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commitmentItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18, // Reduced from 24 to 18
    paddingHorizontal: 10,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: 12,
  },
  commitmentText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    lineHeight: 24,
  },
  signatureContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16, // Reduced from 24 to 16
  },
  signatureBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12, // Reduced from 16 to 12
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  signatureLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    textAlign: 'center',
    color: '#59A0DD', // More subdued blue tone
  },
  signatureBox: {
    height: 130, // Reduced from 150 to 130
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: 8, // Reduced from 12 to 8
    backgroundColor: 'white',
    // Add a subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  signatureInstructions: {
    alignItems: 'center',
  },
  signatureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  signatureHintText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  signatureGuide: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(70, 90, 140, 0.15)',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0, // Reduced from 10 to 0
  },
  commitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '80%',
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  commitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

export default CommitmentScreen;