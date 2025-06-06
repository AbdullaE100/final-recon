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
import { ArrowLeft, SendHorizonal, Trash2, RefreshCw, AlertCircle, CheckCircle, Heart, Zap, AlertTriangle, Calendar, PlusCircle, BookOpen, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChatMessage, getGeminiResponse, initializeCompanionConversation } from '@/lib/gemini';

// Unique ID for input accessory view on iOS
const INPUT_ACCESSORY_VIEW_ID = 'companion-chat-input';

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
    getTriggers 
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
  const [personalizedOptions, setPersonalizedOptions] = useState([]);
  const [triggerInput, setTriggerInput] = useState('');
  const [journalSummary, setJournalSummary] = useState('');
  const [commonTriggers, setCommonTriggers] = useState<string[]>([]);
  
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
    Keyboard.dismiss(); // Dismiss the keyboard
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
  
  // Load common triggers
  useEffect(() => {
    const loadTriggers = async () => {
      const triggers = await getTriggers();
      setCommonTriggers(triggers.slice(0, 5)); // Get top 5 triggers
    };
    
    loadTriggers();
  }, [getTriggers]);
  
  // Handle daily check-in
  const handleDailyCheckIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowQuickActions(false);
    await promptDailyCheckIn();
  };
  
  // Handle urge management
  const handleUrgeManagement = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowQuickActions(false);
    await startUrgeManagement();
  };
  
  // Show trigger modal
  const handleOpenTriggerModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickActions(false);
    setShowTriggerModal(true);
  };
  
  // Log a trigger
  const handleLogTrigger = async () => {
    if (!triggerInput.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTriggerModal(false);
    await logTrigger(triggerInput);
    
    // Reset trigger input
    setTriggerInput('');
    
    // Reload common triggers
    const triggers = await getTriggers();
    setCommonTriggers(triggers.slice(0, 5));
  };
  
  // Handle selecting a common trigger
  const handleSelectTrigger = async (trigger: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTriggerModal(false);
    await logTrigger(trigger);
  };
  
  // Handle journal summary creation
  const handleCreateJournalSummary = async () => {
    if (!journalSummary.trim()) return;
    
    try {
      // Create a summary entry for the journal
      const summaryContent = `Chat Summary - ${new Date().toLocaleDateString()}\n\n${journalSummary.trim()}\n\n[Auto-generated from companion chat]`;
      
      addJournalEntry(summaryContent, {
        tags: ['chat-summary', 'companion'],
        mood: 'reflective'
      });
      
      // Show success feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setJournalSummary('');
      setShowJournalModal(false);
      
      // Send a confirmation message to chat
      sendMessage('I\'ve saved a summary of our conversation to your journal for future reference.');
    } catch (error) {
      console.error('Error creating journal summary:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  
  // Toggle quick actions
  const handleToggleQuickActions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickActions(!showQuickActions);
  };
  
  // Toggle therapy options with opt-out check
  const handleToggleTherapyOptions = async () => {
    try {
      // Check if user has opted out of therapy options
      const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {});
      
      if (userPreferences.therapyOptionsOptOut) {
        // User has opted out, send a supportive message instead
        const supportMessage = "I'm here to support you! You can ask me for specific help like:\n\n• 'Help me with urge surfing'\n• 'I need a distraction plan'\n• 'Guide me through breathing exercises'\n• 'Help me reframe my thoughts'\n\nWhat would you like to work on together?";
        await sendMessage(supportMessage);
      } else {
        // Show therapy options as normal
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowTherapyOptions(!showTherapyOptions);
        // Close quick actions if therapy options are shown
        if (!showTherapyOptions) {
          setShowQuickActions(false);
        }
      }
    } catch (error) {
      console.error('Error checking opt-out preference:', error);
      // Fallback to showing therapy options
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowTherapyOptions(!showTherapyOptions);
      if (!showTherapyOptions) {
        setShowQuickActions(false);
      }
    }
  };
  
  // Start urge surfing
  const handleStartUrgeSurfing = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    await startUrgeSurfing();
  };
  
  // Start distraction plan
  const handleStartDistractionPlan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTherapyOptions(false);
    await startDistractionPlan();
  };
  
  // Handle breathing exercise
  const handleStartBreathing = async () => {
    setShowTherapyOptions(false);
    const breathingMessage = "Let's do a calming breathing exercise together. Find a comfortable position and follow along:\n\n🫁 4-7-8 Breathing Technique\n\n1. Breathe in through your nose for 4 counts\n2. Hold your breath for 7 counts\n3. Exhale through your mouth for 8 counts\n4. Repeat 3-4 times\n\nThis technique activates your parasympathetic nervous system, helping you feel calmer and more in control. Focus on the rhythm and let your body relax with each exhale.";
    await sendMessage(breathingMessage);
  };
  
  // Handle grounding exercise
  const handleStartGrounding = async () => {
    setShowTherapyOptions(false);
    const groundingMessage = "Let's ground yourself in the present moment with the 5-4-3-2-1 technique:\n\n🌱 5-4-3-2-1 Grounding Exercise\n\n• 5 things you can SEE - Look around and name 5 things you can see\n• 4 things you can TOUCH - Feel 4 different textures around you\n• 3 things you can HEAR - Listen for 3 different sounds\n• 2 things you can SMELL - Notice 2 scents in your environment\n• 1 thing you can TASTE - Focus on 1 taste in your mouth\n\nThis technique helps anchor you to the present moment and reduces the intensity of urges by engaging your senses.";
    await sendMessage(groundingMessage);
  };
  
  // Handle progressive muscle relaxation
  const handleStartProgressiveMuscle = async () => {
    setShowTherapyOptions(false);
    const muscleMessage = "Let's release physical tension with progressive muscle relaxation:\n\n💪 Progressive Muscle Relaxation\n\n1. Feet & Legs: Tense for 5 seconds, then relax\n2. Abdomen: Tighten your core, then release\n3. Hands & Arms: Make fists, tense arms, then let go\n4. Shoulders: Raise to ears, hold, then drop\n5. Face: Scrunch all facial muscles, then relax\n\nAs you release each muscle group, notice the contrast between tension and relaxation. This helps your body and mind return to a calmer state, making it easier to manage urges.";
    await sendMessage(muscleMessage);
  };
  
  // Start cognitive reframing
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
          {renderFormattedText(item.content)}
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
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.quickActionsContainer, { backgroundColor: colors.card }]}
    >
      <View style={styles.quickActionsHeader}>
        <Text style={[styles.quickActionsTitle, { color: colors.text }]}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.closeQuickActions}
          onPress={() => setShowQuickActions(false)}
        >
          <X size={20} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsScroll}
        style={styles.quickActionsScrollView}
      >
        {quickActionItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.quickActionButton, { backgroundColor: item.color }]}
              onPress={item.onPress}
            >
              <IconComponent size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
  
  // Get personalized therapy options based on user data
  const getPersonalizedTherapyOptions = async () => {
    try {
      // Get user preferences and quiz data
      const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {});
      const streakData = await getData(STORAGE_KEYS.STREAK_DATA, { triggers: [] });
      
      // Analyze user's main challenges and triggers
      const quizAnswers = userPreferences.quizAnswers || {};
      const recentTriggers = streakData.triggers?.slice(-10) || [];
      
      // Base therapy options
      const allOptions = [
        {
          id: 'urge_surfing',
          title: 'Urge Surfing',
          emoji: '🌊',
          color: '#2196F3',
          description: 'Learn to observe urges without acting on them',
          priority: 0,
          conditions: ['urges', 'beginner', 'daily_multiple', 'daily']
        },
        {
          id: 'distraction',
          title: 'Distraction Plan',
          emoji: '🎯',
          color: '#FF9800',
          description: 'Activities to shift focus away from urges',
          priority: 0,
          conditions: ['habits', 'motivation', 'weekly', 'occasionally']
        },
        {
          id: 'thought_reframing',
          title: 'Thought Reframing',
          emoji: '🧠',
          color: '#9C27B0',
          description: 'Challenge negative thoughts with CBT',
          priority: 0,
          conditions: ['recovery', 'years', 'year', 'mental']
        },
        {
          id: 'breathing',
          title: 'Breathing Exercise',
          emoji: '🫁',
          color: '#4CAF50',
          description: 'Calm your mind with guided breathing',
          priority: 0,
          conditions: ['urges', 'daily_multiple', 'very_long', 'long']
        },
        {
          id: 'grounding',
          title: '5-4-3-2-1 Grounding',
          emoji: '🌱',
          color: '#795548',
          description: 'Ground yourself in the present moment',
          priority: 0,
          conditions: ['urges', 'accountability', 'daily']
        },
        {
          id: 'progressive_muscle',
          title: 'Muscle Relaxation',
          emoji: '💪',
          color: '#E91E63',
          description: 'Release tension through progressive relaxation',
          priority: 0,
          conditions: ['energy', 'very_long', 'long', 'years']
        }
      ];
      
      // Calculate priority scores based on user data
      allOptions.forEach(option => {
        let score = 0;
        
        // Quiz-based scoring
        if (quizAnswers.challenging && option.conditions.includes(quizAnswers.challenging)) score += 3;
        if (quizAnswers.goal && option.conditions.includes(quizAnswers.goal)) score += 2;
        if (quizAnswers.frequency && option.conditions.includes(quizAnswers.frequency)) score += 2;
        if (quizAnswers.duration && option.conditions.includes(quizAnswers.duration)) score += 1;
        if (quizAnswers.struggle && option.conditions.includes(quizAnswers.struggle)) score += 1;
        
        // Trigger-based scoring
        const triggerKeywords = recentTriggers.map(t => t.trigger?.toLowerCase() || '').join(' ');
        if (triggerKeywords.includes('stress') && option.id === 'breathing') score += 2;
        if (triggerKeywords.includes('bored') && option.id === 'distraction') score += 2;
        if (triggerKeywords.includes('negative') && option.id === 'thought_reframing') score += 2;
        if (triggerKeywords.includes('anxious') && option.id === 'grounding') score += 2;
        
        option.priority = score;
      });
      
      // Sort by priority and return top 4
      return allOptions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 4);
        
    } catch (error) {
      console.error('Error getting personalized therapy options:', error);
      // Fallback to default options
      return [
        {
          id: 'urge_surfing',
          title: 'Urge Surfing',
          emoji: '🌊',
          color: '#2196F3',
          description: 'Learn to observe urges without acting on them'
        },
        {
          id: 'distraction',
          title: 'Distraction Plan',
          emoji: '🎯',
          color: '#FF9800',
          description: 'Activities to shift focus away from urges'
        },
        {
          id: 'thought_reframing',
          title: 'Thought Reframing',
          emoji: '🧠',
          color: '#9C27B0',
          description: 'Challenge negative thoughts with CBT'
        },
        {
          id: 'breathing',
          title: 'Breathing Exercise',
          emoji: '🫁',
          color: '#4CAF50',
          description: 'Calm your mind with guided breathing'
        }
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
        handleStartDistraction();
        break;
      case 'thought_reframing':
        handleStartThoughtReframing();
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
      const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {});
      const updatedPreferences = {
        ...userPreferences,
        therapyOptionsOptOut: true
      };
      await storeData(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences);
      setShowTherapyOptions(false);
      
      // Send a message acknowledging the opt-out
      const optOutMessage = "I understand you'd prefer not to see therapy options. You can always ask me directly for help with techniques like 'help me with urge surfing' or 'I need a distraction plan' whenever you need support.";
      await sendMessage(optOutMessage);
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
              <Text style={[styles.closeTherapyText, { color: colors.text }]}>✕</Text>
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
              {option.priority > 3 && (
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
                {commonTriggers.map((trigger, index) => (
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
            {companion?.name && companion.name !== '' ? companion.name : (companionType === 'plant' ? 'Drowsi' : 
             companionType === 'fire' ? 'Snuglur' : 'Stripes')}
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0} // Adjust this offset as needed
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
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 4) }
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
          
          {showQuickActions && renderQuickActions()}
          {showTherapyOptions && renderTherapyOptions()}
        </View>
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
    paddingHorizontal: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingRight: 40,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 6,
    minHeight: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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

  quickActionsContainer: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 140,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeQuickActions: {
    padding: 4,
  },
  quickActionsScrollView: {
    flexGrow: 0,
  },
  quickActionsScroll: {
    paddingRight: 16,
  },
  quickActionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 90,
    marginRight: 12,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default CompanionChat;