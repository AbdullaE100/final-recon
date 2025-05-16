import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  Easing,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

interface AchievementNotificationProps {
  visible: boolean;
  title: string;
  description: string;
  buttonText: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  visible,
  title,
  description,
  buttonText = "Incredible!",
  onClose
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Haptic feedback when shown
  useEffect(() => {
    if (visible) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Entrance animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      // Pulsing animation for trophy icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [visible]);
  
  // Exit animation
  const handleClose = () => {
    try {
      // First set a flag to avoid animation race conditions
      isClosing.current = true;
      
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        onClose();
        // Reset flag after closing completes
        isClosing.current = false;
      });
    } catch (error) {
      // If animation fails, still ensure the modal closes
      console.error('Error during close animation:', error);
      onClose();
      isClosing.current = false;
    }
  };
  
  // Add a reference to track if we're in the process of closing
  const isClosing = useRef(false);

  // Force close after timeout to prevent stuck notifications
  useEffect(() => {
    if (visible && !isClosing.current) {
      const closeTimeout = setTimeout(() => {
        console.log('Auto-closing achievement notification after timeout');
        handleClose();
      }, 5000); // Auto-close after 5 seconds
      
      return () => clearTimeout(closeTimeout);
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <BlurView intensity={40} tint="dark" style={styles.blurOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Achievement card with shine effect */}
            <LinearGradient
              colors={['#192252', '#1E2A66']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.achievementCard}
            >
              {/* Shine animation */}
              <MotiView
                from={{ opacity: 0, left: -150 }}
                animate={{ opacity: 0.5, left: width }}
                transition={{
                  type: 'timing',
                  duration: 1500,
                  loop: true,
                }}
                style={styles.shineEffect}
              />
              
              {/* Trophy icon with glow */}
              <View style={styles.iconContainer}>
                <View style={styles.iconGlow} />
                <Animated.View style={{
                  transform: [{ scale: pulseAnim }]
                }}>
                  <Ionicons name="trophy" size={60} color="#FFD700" />
                </Animated.View>
              </View>
              
              {/* Achievement title with animated particles */}
              <View style={styles.textContent}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              
              {/* Decorative elements */}
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />
              <View style={styles.decorLine} />
            </LinearGradient>
            
            {/* Button with gradient */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleClose}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0066FF', '#0044CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    maxWidth: 340,
    alignItems: 'center',
  },
  achievementCard: {
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    position: 'relative',
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ rotate: '25deg' }],
  },
  iconContainer: {
    marginBottom: 15,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  textContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '80%',
    height: 56,
    borderRadius: 28,
    marginTop: 25,
    overflow: 'hidden',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  decorCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    top: -40,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.1)',
    bottom: -30,
    left: -20,
  },
  decorLine: {
    position: 'absolute',
    width: '120%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '-5deg' }],
  },
});

export default AchievementNotification; 