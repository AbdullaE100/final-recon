import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { useCompanionChat } from '@/context/CompanionChatContext';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, SendHorizonal, Trash2, RefreshCw, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChatMessage } from '@/lib/gemini';

// Unique ID for input accessory view on iOS
const INPUT_ACCESSORY_VIEW_ID = 'companion-chat-input';

const CompanionChat = () => {
  const { colors } = useTheme();
  const { messages, isLoading, sendMessage, resetConversation, markAsRead } = useCompanionChat();
  const { companion, getCompanionStage, achievements } = useGamification();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Get companion stage directly from badge count
  const unlockedBadgesCount = achievements.filter(badge => badge.unlocked).length;
  const companionStage = unlockedBadgesCount >= 30 ? 3 : unlockedBadgesCount >= 15 ? 2 : 1;
  const companionType = companion?.type || 'water';
  
  console.log("CHAT: Badge count =", unlockedBadgesCount, "Companion stage =", companionStage);
  
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
          return require('../baby monster stage 3.json');
        case 2:
          return require('../baby monster stage 2.json');
        default:
          return require('../baby monster stage 1.json');
      }
    } else {
      // Stripes (Tiger) animations
      switch (companionStage) {
        case 3:
          return require('../baby tiger stage 3.json');
        case 2:
          return require('../baby tiger stage 2.json');
        default:
          return require('../baby tiger stage 1.json');
      }
    }
  };
  
  // Handle keyboard appearance
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        scrollToBottom();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    // Mark messages as read when opening the chat
    markAsRead();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Scroll to bottom when new messages appear
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);
  
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };
  
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = inputMessage;
    setInputMessage('');
    
    await sendMessage(message);
  };
  
  const handleResetConfirm = () => {
    setShowConfirmReset(true);
  };
  
  const handleResetCancel = () => {
    setShowConfirmReset(false);
  };
  
  const handleResetConfirmed = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowConfirmReset(false);
    await resetConversation();
  };
  
  // Render message bubbles
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isCompanion = item.role === 'model';
    
    return (
      <Animated.View 
        entering={FadeIn.duration(300).delay(index * 100)}
        style={[
          styles.messageContainer,
          isCompanion ? styles.companionContainer : styles.userContainer
        ]}
      >
        {isCompanion && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#272336', '#1C1627']}
              style={styles.avatarBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LottieView
                source={getCompanionSource()}
                autoPlay
                loop
                style={styles.avatarAnimation}
              />
            </LinearGradient>
          </View>
        )}
        
        <View 
          style={[
            styles.messageBubble,
            isCompanion 
              ? [styles.companionBubble, { backgroundColor: '#272336' }]
              : [styles.userBubble, { backgroundColor: colors.primary }]
          ]}
        >
          <Text style={[
            styles.messageText,
            { color: '#FFFFFF' }
          ]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };
  
  // Render empty state if no messages
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <LottieView
        source={require('@/assets/animations/empty-chat.json')}
        autoPlay
        loop
        style={styles.emptyAnimation}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Start a conversation
      </Text>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        Your companion is here to help with urges and provide motivation
      </Text>
    </View>
  );
  
  // Render the confirmation dialog for resetting the chat
  const renderResetConfirmation = () => (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.confirmOverlay}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={[styles.confirmDialog, { backgroundColor: colors.card }]}>
          <AlertCircle size={24} color={colors.error} style={styles.alertIcon} />
          <Text style={[styles.confirmTitle, { color: colors.text }]}>
            Reset Conversation
          </Text>
          <Text style={[styles.confirmText, { color: colors.secondaryText }]}>
            This will clear your entire chat history with your companion. This action cannot be undone.
          </Text>
          
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleResetCancel}
            >
              <Text style={[styles.confirmButtonText, { color: colors.secondaryText }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmResetButton, { backgroundColor: colors.error }]}
              onPress={handleResetConfirmed}
            >
              <Text style={styles.resetButtonText}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      
      <Stack.Screen 
        options={{
          title: 'Companion Chat',
          headerShown: false,
        }}
      />
      
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {companionType === 'plant' ? 'Drowsi' : 
             companionType === 'fire' ? 'Snuglur' : 'Stripes'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
            Your companion
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetConfirm}
        >
          <Trash2 size={20} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `message-${index}`}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.emptyList
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={scrollToBottom}
        />

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) }
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { backgroundColor: colors.cardAlt, color: colors.text }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.placeholder}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              maxLength={1000}
              inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
                inputMessage.trim() === '' && styles.disabledButton
              ]}
              onPress={handleSendMessage}
              disabled={inputMessage.trim() === '' || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SendHorizonal size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Confirm reset dialog */}
      {showConfirmReset && renderResetConfirmation()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  companionContainer: {
    alignSelf: 'flex-start',
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarAnimation: {
    width: 50,
    height: 50,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  companionBubble: {
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    fontSize: 16,
    maxHeight: 120,
    marginRight: 10,
    minHeight: 50,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  confirmDialog: {
    width: '80%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  alertIcon: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
    borderWidth: 1,
  },
  confirmResetButton: {
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CompanionChat; 