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
  ScrollView,
  Modal,
  Dimensions
} from 'react-native';
import { useCompanionChat } from '@/context/CompanionChatContext';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, SendHorizonal, Trash2, RefreshCw, AlertCircle, CheckCircle, Heart, Zap, AlertTriangle, Calendar, PlusCircle, BookOpen, X, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChatMessage, getAIResponse as getGeminiResponse, initializeCompanionConversation } from '@/lib/ai-service';
import { getData, storeData, STORAGE_KEYS } from '@/utils/storage';

/** Unique ID for input accessory view on iOS */
const INPUT_ACCESSORY_VIEW_ID = 'companion-chat-input';

interface UserPreferences {
  therapyOptionsOptOut?: boolean;
  quizAnswers?: {
    challenging?: string;
    goal?: string;
    frequency?: string;
    duration?: string;
    struggle?: string;
  };
}

interface Trigger {
    trigger?: string;
}

interface StreakData {
    triggers?: Trigger[];
}

interface TherapyOption {
  id: string;
  title: string;
  emoji: string;
  color: string;
  description: string;
  priority?: number;
  conditions?: string[];
}

/** React component for the companion chat screen */
const CompanionChat = () => {
  const { colors } = useTheme();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    resetConversation, 
    markAsRead, 
    promptDailyCheckIn, 
    startUrgeManagement, 
    startUrgeSurfing,
    startDistractionPlan,
    startCognitiveReframe,
    logTrigger, 
    getTriggers,
    lastMessageFailed
  } = useCompanionChat();
  const { companion, getCompanionStage, achievements, streak, addJournalEntry } = useGamification();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showTherapyOptions, setShowTherapyOptions] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [personalizedOptions, setPersonalizedOptions] = useState<TherapyOption[]>([]);
  const [triggerInput, setTriggerInput] = useState('');
  const [journalSummary, setJournalSummary] = useState('');
  const [commonTriggers, setCommonTriggers] = useState<string[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  /** Get companion stage directly from badge count */
  const unlockedBadgesCount = achievements.filter(badge => badge.unlocked).length;
  const companionStage = unlockedBadgesCount >= 30 ? 3 : unlockedBadgesCount >= 15 ? 2 : 1;
  const companionType = companion?.type || 'water';
  
  /** Get companion animation source based on stage and type */
  const getCompanionSource = () => {
    if (companionType === 'plant') {
      /** Drowsi (Panda) animations */
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/panda/panda_stage3.json');
        case 2:
          return require('@/assets/lottie/panda/panda_stage2.json');
        default:
          return require('@/assets/lottie/baby_panda_stage1.json');
      }
    } else if (companionType === 'fire') {
      /** Snuglur animations */
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/baby_monster_stage3.json');
        case 2:
          return require('@/assets/lottie/baby_monster_stage2.json');
        default:
          return require('@/assets/lottie/baby_monster_stage1.json');
      }
    } else {
      /** Stripes (Tiger) animations */
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/baby_tiger_stage3.json');
        case 2:
          return require('@/assets/lottie/baby_tiger_stage2.json');
        default:
          return require('@/assets/lottie/baby_tiger_stage1.json');
      }
    }
  };
  
  /** Handle keyboard appearance */
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
  
  /** Scroll to bottom when new messages appear */
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);
  
  /** Scroll to bottom of the chat */
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };
  
  /** Handle sending a new message */
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = inputMessage;
    setInputMessage('');
    Keyboard.dismiss(); /** Dismiss the keyboard */
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
  
  /** Load common triggers */
  useEffect(() => {
    const loadTriggers = async () => {
      const triggers = await getTriggers();
      setCommonTriggers(triggers.slice(0, 5)); /** Get top 5 triggers */
    };
    
    loadTriggers();
  }, [getTriggers]);
  
  /** Handle daily check-in */
  const handleDailyCheckIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowQuickActions(false);
    await promptDailyCheckIn();
  };
  
  /** Handle urge management */
  const handleUrgeManagement = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowQuickActions(false);
    await startUrgeManagement();
  };
  
  /** Show trigger modal */
  const handleOpenTriggerModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickActions(false);
    setShowTriggerModal(true);
  };
  
  /** Log a trigger */
  const handleLogTrigger = async () => {
    if (!triggerInput.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTriggerModal(false);
    await logTrigger(triggerInput);
    
    /** Reset trigger input */
    setTriggerInput('');
    
    /** Reload common triggers */
    const triggers = await getTriggers();
    setCommonTriggers(triggers.slice(0, 5));
  };
  
  /** Handle selecting a common trigger */
  const handleSelectTrigger = async (trigger: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTriggerModal(false);
    await logTrigger(trigger);
  };
  
  /** Handle journal summary creation */
  const handleCreateJournalSummary = async () => {
    if (!journalSummary.trim()) return;
    
    try {
      // Extract key points from the conversation
      const keyPoints = messages
        .filter(msg => {
          const content = msg.content.toLowerCase();
          // Filter out greetings, short responses, and system messages
          return !content.match(/^(hi|hello|hey|ok|okay|thanks|thank you)$/i) &&
                 content.length > 20 &&
                 // Include messages that contain important content
                 (content.includes('urge') ||
                  content.includes('trigger') ||
                  content.includes('feeling') ||
                  content.includes('strategy') ||
                  content.includes('exercise') ||
                  content.includes('breath') ||
                  content.includes('step') ||
                  content.includes('notice') ||
                  content.includes('observe'));
        })
        .slice(-4) // Take the last 4 important messages
        .map(msg => msg.content.trim())
        .filter((msg, index, self) => self.indexOf(msg) === index) // Remove duplicates
        .map(point => `• ${point}`); // Format as bullet points

      // Create the summary content
      const summaryContent = `Chat Summary - ${new Date().toLocaleDateString()}\n\n${journalSummary.trim()}\n\nKey Points:\n${keyPoints.join('\n')}\n\n[Auto-generated from companion chat]`;
      
      addJournalEntry(summaryContent, {
        tags: ['chat-summary', 'companion'],
        mood: 'reflective'
      });
      
      // Show success feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setJournalSummary('');
      setShowJournalModal(false);
      
      // Send a confirmation message to chat
      sendMessage("I've saved a summary of our conversation to your journal for future reference.");
    } catch (error) {
      console.error("Error creating journal summary:", error);
    }
  };
  
  /** Toggle quick actions menu */
  const handleToggleQuickActions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickActions(!showQuickActions);
  };
  
  /** Toggle therapy options menu with opt-out check */
  const handleToggleTherapyOptions = async () => {
    try {
      /** Check if user has opted out of therapy options */
      const userPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
      
      if (userPreferences.therapyOptionsOptOut) {
        /** User has opted out, send a supportive message instead */
        const supportMessage = "I'm here to support you! You can ask me for specific help like:\n\n• 'Help me with urge surfing'\n• 'I need a distraction plan'\n• 'Guide me through breathing exercises'\n• 'Help me reframe my thoughts'\n\nWhat would you like to work on together?";
        await sendMessage(supportMessage);
      } else {
        /** Show therapy options as normal */
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowTherapyOptions(!showTherapyOptions);
        /** Close quick actions if therapy options are shown */
        if (!showTherapyOptions) {
          setShowQuickActions(false);
        }
      }
    } catch (error) {
      /** Fallback to showing therapy options */
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowTherapyOptions(!showTherapyOptions);
      if (!showTherapyOptions) {
        setShowQuickActions(false);
      }
    }
  };
  
  /** Handle starting urge surfing exercise */
  const handleStartUrgeSurfing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    await startUrgeSurfing();
  };
  
  /** Handle starting distraction plan */
  const handleStartDistractionPlan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    await startDistractionPlan();
  };
  
  /** Handle starting breathing exercise */
  const handleStartBreathing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    router.push('/breathing');
  };
  
  /** Handle starting grounding exercise */
  const handleStartGrounding = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    router.push('/grounding');
  };
  
  /** Handle starting progressive muscle relaxation */
  const handleStartProgressiveMuscle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    router.push('/progressive-muscle-relaxation');
  };
  
  /** Handle starting cognitive reframing */
  const handleStartReframing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    await startCognitiveReframe();
  };
  
  // Render message bubbles
  // Function to parse and render markdown-like formatting
  const renderFormattedText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    
    return (
      <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
        {parts.map((part, index) => {
          // Every odd index is bold text (between **)
          if (index % 2 === 1) {
            return (
              <Text key={index} style={{ fontWeight: 'bold' }}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    
    const handleRetry = () => {
      if (index === messages.length - 1 && lastMessageFailed) {
        sendMessage(messages[index - 1].content, true);
      }
    };
    
    return (
      <View style={[
          styles.messageContainer,
        isUser ? styles.userContainer : styles.companionContainer
      ]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.avatarBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarAnimationContainer}>
              <LottieView
                source={getCompanionSource()}
                autoPlay
                loop
                style={styles.avatarAnimation}
              />
              </View>
            </LinearGradient>
          </View>
        )}
        
        <View style={[
            styles.messageBubble,
          isUser ? [styles.userBubble, { backgroundColor: '#6366F1' }] : 
          [styles.companionBubble, { backgroundColor: '#1F2937' }],
          !isUser && { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isUser ? '#FFFFFF' : '#FFFFFF' }
          ]}>
          {renderFormattedText(item.content)}
          </Text>
          
          {index === messages.length - 1 && lastMessageFailed && !isUser && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to get response</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <RefreshCw size={16} color="#FFFFFF" />
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  // Render empty state if no messages
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <LottieView
        source={getCompanionSource()}
        autoPlay
        loop
        style={styles.emptyStateAnimation}
      />
      <Text style={styles.emptyStateTitle}>
        Chat with {companion?.name || (companionType === 'plant' ? 'Drowsi' : 
          companionType === 'fire' ? 'Snuglur' : 'Stripes')}
      </Text>
      <Text style={styles.emptyStateText}>
        Your companion is here to support your recovery journey
      </Text>
      <TouchableOpacity 
        style={styles.startChatButton} 
        onPress={() => sendMessage("Hello, I could use some support")}
      >
        <Text style={styles.startChatButtonText}>Start Conversation</Text>
      </TouchableOpacity>
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
  
  // Quick action items data
  const quickActionItems = [
    {
      id: 'daily-checkin',
      icon: Calendar,
      label: 'Daily Check-in',
      color: colors.primary,
      onPress: handleDailyCheckIn
    },
    {
      id: 'urge-help',
      icon: Zap,
      label: 'Get Urge Help',
      color: '#E53935',
      onPress: handleUrgeManagement
    },
    {
      id: 'log-trigger',
      icon: AlertTriangle,
      label: 'Log Trigger',
      color: '#795548',
      onPress: handleOpenTriggerModal
    },
    {
      id: 'therapy-tools',
      icon: Heart,
      label: 'Therapy Tools',
      color: '#4CAF50',
      onPress: handleToggleTherapyOptions
    },
    {
      id: 'journal-summary',
      icon: BookOpen,
      label: 'Journal Summary',
      color: '#9C27B0',
      onPress: () => setShowJournalModal(true)
    }
  ];

  // Render quick action buttons with horizontal scroll
  const renderQuickActions = () => (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.quickActionsContainer}
    >
      <BlurView intensity={20} tint="dark" style={styles.quickActionsBlur}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
        <TouchableOpacity
            style={styles.quickActionButton} 
            onPress={handleDailyCheckIn}
        >
            <View style={[styles.quickActionIcon, { backgroundColor: '#6366F1' }]}>
              <Calendar size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Daily Check-in</Text>
        </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton} 
            onPress={handleUrgeManagement}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EC4899' }]}>
              <Zap size={20} color="#FFFFFF" />
      </View>
            <Text style={styles.quickActionText}>Manage Urges</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton} 
            onPress={handleOpenTriggerModal}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' }]}>
              <AlertTriangle size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Log Trigger</Text>
          </TouchableOpacity>
          
            <TouchableOpacity
            style={styles.quickActionButton} 
            onPress={() => setShowJournalModal(true)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
              <BookOpen size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Journal</Text>
            </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton} 
            onPress={handleToggleTherapyOptions}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
              <Heart size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Therapy</Text>
          </TouchableOpacity>
      </ScrollView>
      </BlurView>
    </Animated.View>
  );
  
  // Get personalized therapy options based on user data
  const getPersonalizedTherapyOptions = async (): Promise<TherapyOption[]> => {
    try {
      const userPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
      const streakData = await getData<StreakData>(STORAGE_KEYS.STREAK_DATA, { triggers: [] });
      
      const quizAnswers = userPreferences.quizAnswers || {};
      const recentTriggers = streakData.triggers?.slice(-10) || [];
      
      const allOptions: TherapyOption[] = [
        { id: 'urge_surfing', title: 'Urge Surfing', emoji: '🌊', color: '#2196F3', description: 'Learn to observe urges without acting on them', priority: 0, conditions: ['urges', 'beginner', 'daily_multiple', 'daily'] },
        { id: 'distraction', title: 'Distraction Plan', emoji: '🎯', color: '#FF9800', description: 'Activities to shift focus away from urges', priority: 0, conditions: ['habits', 'motivation', 'weekly', 'occasionally'] },
        { id: 'thought_reframing', title: 'Thought Reframing', emoji: '🧠', color: '#9C27B0', description: 'Challenge negative thoughts with CBT', priority: 0, conditions: ['recovery', 'years', 'year', 'mental'] },
        { id: 'breathing', title: 'Breathing Exercise', emoji: '🫁', color: '#4CAF50', description: 'Calm your mind with guided breathing', priority: 0, conditions: ['urges', 'daily_multiple', 'very_long', 'long'] },
        { id: 'grounding', title: '5-4-3-2-1 Grounding', emoji: '🌱', color: '#795548', description: 'Ground yourself in the present moment', priority: 0, conditions: ['urges', 'accountability', 'daily'] },
        { id: 'progressive_muscle', title: 'Muscle Relaxation', emoji: '💪', color: '#E91E63', description: 'Release tension through progressive relaxation', priority: 0, conditions: ['energy', 'very_long', 'long', 'years'] }
      ];
      
      allOptions.forEach(option => {
        let score = 0;
        if (quizAnswers.challenging && option.conditions?.includes(quizAnswers.challenging)) score += 3;
        if (quizAnswers.goal && option.conditions?.includes(quizAnswers.goal)) score += 2;
        if (quizAnswers.frequency && option.conditions?.includes(quizAnswers.frequency)) score += 2;
        if (quizAnswers.duration && option.conditions?.includes(quizAnswers.duration)) score += 1;
        if (quizAnswers.struggle && option.conditions?.includes(quizAnswers.struggle)) score += 1;
        
        const triggerKeywords = recentTriggers.map(t => t.trigger?.toLowerCase() || '').join(' ');
        if (triggerKeywords.includes('stress') && option.id === 'breathing') score += 2;
        if (triggerKeywords.includes('bored') && option.id === 'distraction') score += 2;
        if (triggerKeywords.includes('negative') && option.id === 'thought_reframing') score += 2;
        if (triggerKeywords.includes('anxious') && option.id === 'grounding') score += 2;
        
        option.priority = score;
      });
      
      return allOptions
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .slice(0, 4);
        
    } catch (error) {
      console.error('Error getting personalized therapy options:', error);
      // Fallback to default options
      return [
        { id: 'urge_surfing', title: 'Urge Surfing', emoji: '🌊', color: '#2196F3', description: 'Learn to observe urges without acting on them', priority: 0, conditions: [] },
        { id: 'distraction', title: 'Distraction Plan', emoji: '🎯', color: '#FF9800', description: 'Activities to shift focus away from urges', priority: 0, conditions: [] },
        { id: 'thought_reframing', title: 'Thought Reframing', emoji: '🧠', color: '#9C27B0', description: 'Challenge negative thoughts with CBT', priority: 0, conditions: [] },
        { id: 'breathing', title: 'Breathing Exercise', emoji: '🫁', color: '#4CAF50', description: 'Calm your mind with guided breathing', priority: 0, conditions: [] }
      ];
    }
  };
  
  // Handle therapy option selection
  const handleTherapyOptionPress = (optionId: string) => {
    switch (optionId) {
      case 'urge_surfing':
        handleStartUrgeSurfing();
        break;
      case 'distraction':
        handleStartDistractionPlan();
        break;
      case 'thought_reframing':
        handleStartReframing();
        break;
      case 'breathing':
        handleStartBreathing();
        break;
      case 'grounding':
        handleStartGrounding();
        break;
      case 'progressive_muscle':
        handleStartProgressiveMuscle();
        break;
      default:
        handleStartUrgeSurfing();
    }
  };
  
  // Handle opt-out preference
  const handleOptOut = async () => {
    try {
      const userPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
      const updatedPreferences = {
        ...userPreferences,
        therapyOptionsOptOut: true
      };
      await storeData(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences);
      setShowTherapyOptions(false);
      
      // Send a message acknowledging the opt-out
      const optOutMessage = "I understand you'd prefer not to see therapy options. You can always ask me directly for help with techniques like 'help me with urge surfing' or 'I need a distraction plan' whenever you need support.";
      await sendMessage(optOutMessage, false);
    } catch (error) {
      console.error('Error saving opt-out preference:', error);
    }
  };
  
  // Load personalized options when therapy options are shown
  useEffect(() => {
    const loadOptions = async () => {
      if (showTherapyOptions) {
        const options = await getPersonalizedTherapyOptions();
        setPersonalizedOptions(options);
      }
    };
    
    loadOptions();
  }, [showTherapyOptions]);
  
  // Render therapy options with personalization
  const renderTherapyOptions = () => {
    return (
      <Animated.View 
        style={[styles.therapyOptionsContainer, { backgroundColor: colors.card }]}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <View style={styles.therapyOptionsHeader}>
          <View style={styles.therapyOptionsHeaderContent}>
            <Text style={[styles.therapyOptionsTitle, { color: colors.text }]}>
              Personalized Techniques
            </Text>
            <Text style={[styles.therapyOptionsSubtitle, { color: colors.secondaryText }]}>
              Tailored to your specific needs and patterns
            </Text>
          </View>
          
          <View style={styles.therapyOptionsActions}>
            <TouchableOpacity
              style={[styles.optOutButton, { backgroundColor: colors.cardAlt }]}
              onPress={handleOptOut}
              activeOpacity={0.7}
            >
              <Text style={[styles.optOutText, { color: colors.secondaryText }]}>Don't show again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.closeTherapyButton, { backgroundColor: colors.cardAlt }]}
              onPress={() => setShowTherapyOptions(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeTherapyText, { color: colors.text }]}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.therapyOptionsGrid}>
          {personalizedOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.therapyOptionButton, { backgroundColor: option.color }]}
              onPress={() => handleTherapyOptionPress(option.id)}
              activeOpacity={0.8}
            >
              <View style={styles.therapyOptionIcon}>
                <Text style={styles.therapyOptionEmoji}>{option.emoji}</Text>
              </View>
              <Text style={styles.therapyOptionText}>{option.title}</Text>
              <Text style={styles.therapyOptionDescription}>
                {option.description}
              </Text>
              {option.priority && option.priority > 3 && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };
  
  // Render trigger modal
  const renderTriggerModal = () => (
    <Modal
      visible={showTriggerModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowTriggerModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTriggerModal(false)}
      >
        <View 
          style={[styles.triggerModalContainer, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Log a Trigger
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
            What triggered your urge?
          </Text>
          
          <TextInput
            style={[styles.triggerInput, { backgroundColor: colors.cardAlt, color: colors.text }]}
            placeholder="Enter trigger..."
            placeholderTextColor={colors.placeholder}
            value={triggerInput}
            onChangeText={setTriggerInput}
            autoFocus
          />
          
          <TouchableOpacity
            style={[styles.triggerSubmitButton, { backgroundColor: colors.primary }]}
            onPress={handleLogTrigger}
          >
            <Text style={styles.triggerSubmitText}>Save Trigger</Text>
          </TouchableOpacity>
          
          {commonTriggers.length > 0 && (
            <>
              <Text style={[styles.commonTriggersTitle, { color: colors.secondaryText }]}>
                Common Triggers
              </Text>
              
              <ScrollView style={styles.commonTriggersContainer}>
                {commonTriggers.map((trigger: string, index: number) => (
                  <TouchableOpacity
                    key={`trigger-${index}`}
                    style={[styles.commonTriggerItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectTrigger(trigger)}
                  >
                    <Text style={[styles.commonTriggerText, { color: colors.text }]}>
                      {trigger}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowTriggerModal(false)}
          >
            <Text style={[styles.cancelText, { color: colors.secondaryText }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Render journal summary modal
  const renderJournalModal = () => (
    <Modal
      visible={showJournalModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowJournalModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowJournalModal(false)}
      >
        <View 
          style={[styles.journalModalContainer, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Save Chat Summary
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
            Create a journal entry summarizing this conversation for future reference
          </Text>
          
          <TextInput
            style={[styles.journalTextArea, { backgroundColor: colors.cardAlt, color: colors.text }]}
            placeholder="Summarize key insights, breakthroughs, or coping strategies discussed..."
            placeholderTextColor={colors.placeholder}
            value={journalSummary}
            onChangeText={setJournalSummary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoFocus
          />
          
          <View style={styles.journalModalButtons}>
            <TouchableOpacity
              style={[styles.journalCancelButton, { borderColor: colors.border }]}
              onPress={() => setShowJournalModal(false)}
            >
              <Text style={[styles.journalCancelText, { color: colors.secondaryText }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.journalSubmitButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateJournalSummary}
              disabled={!journalSummary.trim()}
            >
              <Text style={styles.journalSubmitText}>Save to Journal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <LinearGradient colors={['#121212', '#000000']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>
            {companion?.name && companion.name !== '' ? companion.name : (companionType === 'plant' ? 'Drowsi' : 
             companionType === 'fire' ? 'Snuglur' : 'Stripes')}
          </Text>
          <Text style={styles.headerSubtitle}>
            Your companion
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetConfirm}
        >
          <Trash2 size={20} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatContainer}>
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
        </View>
          
          <View style={styles.inputWrapper}>
          <TouchableOpacity 
            style={styles.quickActionsToggle} 
            onPress={handleToggleQuickActions}
          >
            <PlusCircle size={24} color="#6366F1" />
          </TouchableOpacity>
          
            <TextInput
              ref={inputRef}
            style={styles.input}
              placeholder="Type a message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              maxLength={1000}
              inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
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
          
          {showQuickActions && renderQuickActions()}
          {showTherapyOptions && renderTherapyOptions()}
      </KeyboardAvoidingView>
      
      {/* Confirm reset dialog */}
      {showConfirmReset && renderResetConfirmation()}
      
      {/* Trigger modal */}
      {renderTriggerModal()}
      
      {/* Journal summary modal */}
      {renderJournalModal()}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
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
  chatContainer: {
    flex: 1,
    backgroundColor: 'transparent',
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
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    maxWidth: '85%',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarAnimationContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAnimation: {
    width: 60,
    height: 60,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  companionBubble: {
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#121212',
  },
  quickActionsToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  quickActionsBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionsScroll: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  quickActionButton: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateAnimation: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  startChatButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  therapyOptionsContainer: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  therapyOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  therapyOptionsHeaderContent: {
    flex: 1,
  },
  therapyOptionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  therapyOptionsSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  therapyOptionsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  optOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  optOutText: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeTherapyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTherapyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  therapyOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  therapyOptionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  therapyOptionIcon: {
    marginBottom: 8,
  },
  therapyOptionEmoji: {
    fontSize: 24,
  },
  therapyOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  therapyOptionDescription: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 14,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  journalModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  journalTextArea: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
  },
  journalModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  journalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  journalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  journalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  journalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  triggerModalContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  triggerInput: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  triggerSubmitButton: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  triggerSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  commonTriggersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  commonTriggersContainer: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 16,
  },
  commonTriggerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    width: '100%',
  },
  commonTriggerText: {
    fontSize: 16,
  },
  modalCancelButton: {
    padding: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CompanionChat;