import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useCompanionChat } from '@/context/CompanionChatContext';
import { useGamification } from '@/context/GamificationContext';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { ChatMessage } from '@/lib/ai-service';
import { TriggerLog } from '@/types/gamification';

const { width, height } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CompanionChatPrompt = () => {
  const { colors } = useTheme();
  const { hasUnreadMessage, isLoading } = useCompanionChat();
  const { companion, achievements } = useGamification();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  
  // Get companion stage directly from badge count
  const unlockedBadgesCount = achievements.filter(badge => badge.unlocked).length;
  const companionStage = unlockedBadgesCount >= 30 ? 3 : unlockedBadgesCount >= 15 ? 2 : 1;
  const companionType = companion?.type || 'water';
  
  
  
  // Get companion animation source based on stage and type
  const getCompanionSource = () => {
    if (companionType === 'plant') {
      // Drowsi (Panda) animations
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/panda/panda_stage3.json');
        case 2:
          return require('@/assets/lottie/panda/panda_stage2.json');
        default:
          return require('@/assets/lottie/baby_panda_stage1.json');
      }
    } else if (companionType === 'fire') {
      // Snuglur animations
      switch (companionStage) {
        case 3:
          return require('../../baby monster stage 3.json');
        case 2:
          return require('../../baby monster stage 2.json');
        default:
          return require('../../baby monster stage 1.json');
      }
    } else if (companionType === 'water') {
      // Stripes (Tiger) animations
      switch (companionStage) {
        case 3:
          return require('../../baby tiger stage 3.json');
        case 2:
          return require('../../baby tiger stage 2.json');
        default:
          return require('../../baby tiger stage 1.json');
      }
    } else {
      // Default to Drowsi (Panda) animations if type is unknown
      console.warn(`Unknown companion type: ${companionType}, defaulting to Drowsi`);
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/panda/panda_stage3.json');
        case 2:
          return require('@/assets/lottie/panda/panda_stage2.json');
        default:
          return require('@/assets/lottie/baby_panda_stage1.json');
      }
    }
  };
  
  const handlePress = () => {
    // @ts-ignore - we'll create this screen next
    navigation.navigate('companion-chat');
  };
  
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={styles.container}
    >
      <LinearGradient
        colors={['#272336', '#1C1627']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Having an urge?</Text>
            <Text style={styles.subtitle}>Talk to your companion for support</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.chatButton, { backgroundColor: colors.primary }]}
                onPress={handlePress}
              >
                <MessageCircle size={18} color="#FFFFFF" />
                <Text style={styles.chatButtonText}>
                  {hasUnreadMessage ? 'Continue Chat' : 'Start Chat'}
                </Text>
              </TouchableOpacity>
              
              {hasUnreadMessage && (
                <View style={styles.unreadBadge} />
              )}
            </View>
          </View>
          
          <View style={styles.companionContainer}>
            <LottieView
              source={getCompanionSource()}
              autoPlay
              loop
              style={styles.companionAnimation}
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradientContainer: {
    borderRadius: 16,
    padding: 16,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    marginLeft: 8,
  },
  companionContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  companionAnimation: {
    width: 120,
    height: 120,
    transform: [{ scale: 1.2 }],
  },
});

export default CompanionChatPrompt; 