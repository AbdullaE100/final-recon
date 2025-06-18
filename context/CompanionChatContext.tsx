import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChatMessage, getAIResponse as getGeminiResponse, initializeCompanionConversation } from '@/lib/ai-service';
import { storeData, getData, STORAGE_KEYS } from '@/utils/storage';
import { Alert, TouchableOpacity, Text } from 'react-native';
import { useGamification } from './GamificationContext';

// Define interface for the context
interface CompanionChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (message: string, isRetry?: boolean) => Promise<void>;
  resetConversation: () => Promise<void>;
  hasUnreadMessage: boolean;
  markAsRead: () => void;
  logTrigger: (trigger: string) => Promise<void>;
  getTriggers: () => Promise<string[]>;
  promptDailyCheckIn: () => Promise<void>;
  startUrgeManagement: () => Promise<void>;
  startUrgeSurfing: () => Promise<void>;
  startDistractionPlan: () => Promise<void>;
  startCognitiveReframe: () => Promise<void>;
  getCrisisResources: () => Promise<string[]>;
  lastMessageFailed: boolean;
}

// Interface for tracking triggers
interface TriggerLog {
  trigger: string;
  timestamp: string;
  count: number;
}

// Interface for streak data
interface StreakData {
  currentStreak: number;
  lastCheckIn: string | null; // ISO date string
  triggers: TriggerLog[];
  relapses: {
    date: string;
    triggers: string[];
  }[];
}

// Create the context
const CompanionChatContext = createContext<CompanionChatContextType>({
  messages: [],
  isLoading: false,
  sendMessage: async () => {},
  resetConversation: async () => {},
  hasUnreadMessage: false,
  markAsRead: () => {},
  logTrigger: async () => {},
  getTriggers: async () => [],
  promptDailyCheckIn: async () => {},
  startUrgeManagement: async () => {},
  startUrgeSurfing: async () => {},
  startDistractionPlan: async () => {},
  startCognitiveReframe: async () => {},
  getCrisisResources: async () => [],
  lastMessageFailed: false,
});

// Storage keys
const CHAT_HISTORY_KEY = STORAGE_KEYS.COMPANION_CHAT_HISTORY;
const UNREAD_MESSAGE_KEY = STORAGE_KEYS.COMPANION_UNREAD_MESSAGE;
const STREAK_DATA_KEY = STORAGE_KEYS.STREAK_DATA;

export const CompanionChatProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const [lastMessageFailed, setLastMessageFailed] = useState(false);
  const gamification = useGamification();
  
  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const savedMessages = await getData<ChatMessage[]>(CHAT_HISTORY_KEY, []);
        if (savedMessages && savedMessages.length > 0) {
          setMessages(savedMessages);
        } else {
          // Initialize with a greeting if no history exists
          await initializeChat();
        }
        
        // Check for unread messages
        const unread = await getData<boolean>(UNREAD_MESSAGE_KEY, false);
        setHasUnreadMessage(unread === true);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    
    loadChatHistory();
  }, []);
  
  // Load streak data and check for daily check-in
  useEffect(() => {
    const checkDailyStatus = async () => {
      try {
        // Get streak data
        const streakData = await getData<StreakData>(STREAK_DATA_KEY, {
          currentStreak: 0,
          lastCheckIn: null,
          triggers: [],
          relapses: [],
        });
        
        // Update the user streak in the gamification context if the method exists
        if (gamification && typeof gamification.setStreak === 'function' && typeof streakData.currentStreak === 'number') {
          gamification.setStreak(streakData.currentStreak);
        }
        
        // Check if we need to prompt for daily check-in
        const today = new Date().toISOString().split('T')[0];
        
        // Handle lastCheckIn type conversion (could be string or number)
        let lastCheckIn = null;
        if (streakData && 
            streakData.lastCheckIn !== null && 
            streakData.lastCheckIn !== undefined) {
          try {
            let lastCheckInStr: string;
            
            // Convert number timestamp to ISO string if needed
            if (typeof streakData.lastCheckIn === 'number') {
              lastCheckInStr = new Date(streakData.lastCheckIn).toISOString();
            } else if (typeof streakData.lastCheckIn === 'string') {
              lastCheckInStr = streakData.lastCheckIn;
            } else {
              throw new Error('Invalid lastCheckIn type');
            }
            
            // Extract date part
            lastCheckIn = lastCheckInStr.split('T')[0];
          } catch (e) {
            console.log('Error processing lastCheckIn:', e);
            lastCheckIn = null;
          }
        }
        
        // If user hasn't checked in today, we'll set the unread message flag
        if (lastCheckIn !== today && typeof streakData.currentStreak === 'number' && streakData.currentStreak > 0) {
          setHasUnreadMessage(true);
          await storeData(UNREAD_MESSAGE_KEY, true);
        }
      } catch (error) {
        console.error('Error checking daily status:', error);
      }
    };
    
    checkDailyStatus();
  }, [gamification]);
  
  // Initialize chat with a greeting
  const initializeChat = async () => {
    setIsLoading(true);
    try {
      const initialGreeting = await initializeCompanionConversation();
      const initialMessages: ChatMessage[] = [
        {
          role: 'model',
          content: initialGreeting
        }
      ];
      
      setMessages(initialMessages);
      await storeData(CHAT_HISTORY_KEY, initialMessages);
      
      // Mark as unread since we have a new message
      setHasUnreadMessage(true);
      await storeData(UNREAD_MESSAGE_KEY, true);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat with your companion');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send a message to the companion
  const sendMessage = async (message: string, isRetry = false) => {
    if (!message.trim()) return;
    
    // If it's a retry, we remove the previous error message
    const currentMessages = isRetry ? messages.slice(0, -1) : messages;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message
    };
    
    const updatedMessages = [...currentMessages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setLastMessageFailed(false); // Reset error state on new message
    
    try {
      // Check for crisis keywords to provide immediate safety resources
      const lowercaseMsg = message.toLowerCase();
      const isCrisis = 
        lowercaseMsg.includes('hurt myself') || 
        lowercaseMsg.includes('kill myself') || 
        lowercaseMsg.includes('suicide') || 
        lowercaseMsg.includes('end my life') || 
        lowercaseMsg.includes('want to die');
      
      if (isCrisis) {
        // Create an immediate crisis response with resources
        const crisisResponse: ChatMessage = {
          role: 'model',
          content: await getCrisisResponse()
        };
        
        const finalMessages = [...updatedMessages, crisisResponse];
        setMessages(finalMessages);
        await storeData(CHAT_HISTORY_KEY, finalMessages);
        setHasUnreadMessage(true);
        await storeData(UNREAD_MESSAGE_KEY, true);
        setIsLoading(false);
        return;
      }
      
      // Check for "relapsed" keyword to handle relapse tracking
      if (
        lowercaseMsg.includes('relapsed') || 
        lowercaseMsg.includes('reset') || 
        lowercaseMsg.includes('messed up') ||
        lowercaseMsg.includes('i failed') ||
        lowercaseMsg.includes('gave in') ||
        lowercaseMsg.includes('i watched porn') ||
        (lowercaseMsg.includes('back') && (lowercaseMsg.includes('day 1') || lowercaseMsg.includes('day one')))
      ) {
        // Update streak data for relapse
        await handleRelapse();
      }
      
      const displayMessages = [...currentMessages];
      const response = await getGeminiResponse(message, displayMessages);
      
      const companionMessage: ChatMessage = {
        role: 'model',
        content: response
      };
      
      const finalMessages = [...updatedMessages, companionMessage];
      setMessages(finalMessages);
      await storeData(CHAT_HISTORY_KEY, finalMessages);
      setHasUnreadMessage(true);
      await storeData(UNREAD_MESSAGE_KEY, true);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'model',
        content: "My circuits are a bit busy right now. Please try again in a moment.",
        isError: true, // Add error flag
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      setLastMessageFailed(true); // Set error state
      await storeData(CHAT_HISTORY_KEY, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle user relapse by resetting streak
  const handleRelapse = async () => {
    try {
      // Get current streak data
      const streakData = await getData<StreakData>(STREAK_DATA_KEY, {
        currentStreak: 0,
        lastCheckIn: null,
        triggers: [],
        relapses: [],
      });
      
      // Ensure we have valid arrays to prevent undefined errors
      const triggers = Array.isArray(streakData?.triggers) ? streakData.triggers : [];
      const relapses = Array.isArray(streakData?.relapses) ? streakData.relapses : [];
      
      // Get recent triggers to associate with this relapse
      const recentTriggers = triggers
        .filter(t => t && typeof t.timestamp === 'string' && typeof t.trigger === 'string')
        .sort((a, b) => {
          try {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          } catch (e) {
            console.error('Error comparing timestamps:', e);
            return 0;
          }
        })
        .slice(0, 3)
        .map(t => t.trigger);
      
      // Add relapse record
      const updatedData: StreakData = {
        ...streakData,
        currentStreak: 0,
        relapses: [
          ...relapses,
          {
            date: new Date().toISOString(),
            triggers: recentTriggers,
          }
        ]
      };
      
      // Save updated streak data
      await storeData(STREAK_DATA_KEY, updatedData);
      
      // Update the user streak in the gamification context if the method exists
      if (gamification && typeof gamification.setStreak === 'function') {
        gamification.setStreak(0);
      }
    } catch (error) {
      console.error('Error handling relapse:', error);
    }
  };
  
  // Daily check-in updates streak and last check-in date
  const performDailyCheckIn = async () => {
    try {
      // Get current streak data
      const streakData = await getData<StreakData>(STREAK_DATA_KEY, {
        currentStreak: 0,
        lastCheckIn: null,
        triggers: [],
        relapses: [],
      });
      
      const today = new Date().toISOString();
      let newStreak = typeof streakData?.currentStreak === 'number' ? streakData.currentStreak : 0;
      
      // If this is the first check-in or they haven't checked in yet
      if (!streakData?.lastCheckIn) {
        newStreak = 1;
      } else {
        try {
          // Handle lastCheckIn type conversion and parsing
          let lastCheckInDate: Date;
          
          if (typeof streakData.lastCheckIn === 'number') {
            lastCheckInDate = new Date(streakData.lastCheckIn);
          } else if (typeof streakData.lastCheckIn === 'string') {
            lastCheckInDate = new Date(streakData.lastCheckIn);
          } else {
            console.error('Invalid lastCheckIn type:', typeof streakData.lastCheckIn);
            newStreak = 1;
            lastCheckInDate = new Date(); // fallback
          }
          
          // Verify we got a valid date object
          if (!isNaN(lastCheckInDate.getTime())) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Get date strings for comparison
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];
            const lastCheckInStr = lastCheckInDate.toISOString().split('T')[0];
            
            // Check if the last check in was yesterday or earlier today
            if (lastCheckInStr === yesterdayStr || lastCheckInStr === todayStr) {
              // Increment streak if they checked in yesterday or already checked in today
              newStreak += 1;
            } else {
              // Otherwise reset the streak (they missed a day)
              newStreak = 1;
            }
          } else {
            // Invalid date parsing
            console.error('Invalid date in lastCheckIn:', streakData.lastCheckIn);
            newStreak = 1;
          }
        } catch (dateError) {
          // If there's an error with date manipulation, fallback to starting a new streak
          console.error('Date error in check-in, resetting streak', dateError);
          newStreak = 1;
        }
      }
      
      // Update streak data
      const updatedData: StreakData = {
        ...streakData,
        currentStreak: newStreak,
        lastCheckIn: today,
      };
      
      // Save updated streak data
      await storeData(STREAK_DATA_KEY, updatedData);
      
      // Update the user streak in the gamification context if the method exists
      if (gamification && typeof gamification.setStreak === 'function') {
        gamification.setStreak(newStreak);
      }
      
      return newStreak;
    } catch (error) {
      console.error('Error performing daily check-in:', error);
      return 0;
    }
  };
  
  // Reset the conversation
  const resetConversation = async () => {
    try {
      setMessages([]);
      await storeData(CHAT_HISTORY_KEY, []);
      await initializeChat();
    } catch (error) {
      console.error('Error resetting conversation:', error);
    }
  };
  
  // Mark messages as read
  const markAsRead = useCallback(async () => {
    setHasUnreadMessage(false);
    await storeData(UNREAD_MESSAGE_KEY, false);
  }, []);
  
  // Log a trigger that might lead to relapse
  const logTrigger = async (trigger: string) => {
    try {
      if (!trigger.trim()) return;
      
      // Get current streak data
      const streakData = await getData<StreakData>(STREAK_DATA_KEY, {
        currentStreak: 0,
        lastCheckIn: null,
        triggers: [],
        relapses: [],
      });

      // Ensure triggers array exists
      const currentTriggers = streakData.triggers || [];
      
      // Check if this trigger already exists
      const existingTriggerIndex = currentTriggers.findIndex(
        t => t.trigger.toLowerCase() === trigger.toLowerCase()
      );
      
      let updatedTriggers: TriggerLog[];
      
      if (existingTriggerIndex >= 0) {
        // Increment count for existing trigger
        updatedTriggers = [...currentTriggers];
        updatedTriggers[existingTriggerIndex] = {
          ...updatedTriggers[existingTriggerIndex],
          count: updatedTriggers[existingTriggerIndex].count + 1,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Add new trigger
        updatedTriggers = [
          ...currentTriggers,
          {
            trigger,
            timestamp: new Date().toISOString(),
            count: 1,
          }
        ];
      }
      
      // Update streak data with new triggers
      const updatedData: StreakData = {
        ...streakData,
        triggers: updatedTriggers,
      };
      
      // Save updated streak data
      await storeData(STREAK_DATA_KEY, updatedData);
      
      // Send message to the companion about the trigger
      await sendMessage(`I'm experiencing a trigger: ${trigger}`, false);
    } catch (error) {
      console.error('Error logging trigger:', error);
    }
  };
  
  // Get all recorded triggers sorted by frequency
  const getTriggers = async (): Promise<string[]> => {
    try {
      // Get current streak data
      const streakData = await getData<StreakData>(STREAK_DATA_KEY, {
        currentStreak: 0,
        lastCheckIn: null,
        triggers: [],
        relapses: [],
      });
      
      // Ensure we have a valid array of triggers
      if (!streakData || !Array.isArray(streakData.triggers)) {
        return [];
      }
      
      // Filter out invalid trigger objects first
      const validTriggers = streakData.triggers.filter(t => 
        t && typeof t === 'object' && 
        typeof t.trigger === 'string' && 
        typeof t.count === 'number'
      );
      
      // Sort triggers by count in descending order
      return validTriggers
        .sort((a, b) => b.count - a.count)
        .map(t => t.trigger);
    } catch (error) {
      console.error('Error getting triggers:', error);
      return [];
    }
  };
  
  // Prompt the user to do a daily check-in
  const promptDailyCheckIn = async () => {
    try {
      // Perform the daily check-in
      const newStreak = await performDailyCheckIn();
      
      // Compose a check-in message with the current streak
      const checkInPrompt = `I want to do my daily check-in for day ${newStreak} of my NoFap journey.`;
      
      // Send the message to the companion
      await sendMessage(checkInPrompt, false);
    } catch (error) {
      console.error('Error prompting daily check-in:', error);
    }
  };
  
  // Start urge management conversation
  const startUrgeManagement = async () => {
    try {
      // Send a message to trigger urge management
      await sendMessage("I'm having a strong urge right now and need help managing it.", false);
    } catch (error) {
      console.error('Error starting urge management:', error);
    }
  };
  
  // Start urge surfing conversation
  const startUrgeSurfing = async () => {
    try {
      // Send a message to trigger urge surfing flow
      await sendMessage("I want to try urge surfing to manage my urge", false);
    } catch (error) {
      console.error('Error starting urge surfing:', error);
    }
  };
  
  // Start distraction plan conversation
  const startDistractionPlan = async () => {
    try {
      // Send a message to trigger distraction plan flow
      await sendMessage("I'd like to try a distraction to manage my urge", false);
    } catch (error) {
      console.error('Error starting distraction plan:', error);
    }
  };
  
  // Start cognitive reframing conversation
  const startCognitiveReframe = async () => {
    try {
      // Send a message to trigger cognitive reframing
      await sendMessage("I'm feeling like I'm a failure and can't do this", false);
    } catch (error) {
      console.error('Error starting cognitive reframe:', error);
    }
  };
  
  // Get crisis response with resources
  const getCrisisResponse = async (): Promise<string> => {
    try {
      // Get a list of crisis resources
      const resources = await getCrisisResources();
      const resourcesText = resources.join('\n');
      
      return `I can tell you're going through a really tough time right now, and I'm concerned about your wellbeing. It's important for you to know you're not alone, and that there are trained professionals who can help you through this moment.

Please consider reaching out to one of these resources right away:

${resourcesText}

These services are confidential, available 24/7, and staffed by trained counselors who care and want to help. Your life matters, and there are people who want to support you.

Would you like me to help you connect with one of these resources now?`;
    } catch (error) {
      console.error('Error getting crisis response:', error);
      return "I'm very concerned about what you're sharing. Please reach out to a crisis helpline immediately: National Suicide Prevention Lifeline at 988 or 1-800-273-8255, or text HOME to 741741 to reach the Crisis Text Line. These services are free, confidential, and available 24/7. You don't have to face this alone.";
    }
  };
  
  // Get crisis resources based on region (currently US-centric, would need localization)
  const getCrisisResources = async (): Promise<string[]> => {
    // In a real implementation, these could be fetched from a database or API
    // and could be localized based on the user's region
    return [
      "National Suicide Prevention Lifeline: 988 or 1-800-273-8255",
      "Crisis Text Line: Text HOME to 741741",
      "Veterans Crisis Line: 988 then press 1, or text 838255",
      "Trevor Project (LGBTQ+): 1-866-488-7386",
      "SAMHSA National Helpline (substance use): 1-800-662-4357"
    ];
  };
  
  return (
    <CompanionChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        resetConversation,
        hasUnreadMessage,
        markAsRead,
        logTrigger,
        getTriggers,
        promptDailyCheckIn,
        startUrgeManagement,
        startUrgeSurfing,
        startDistractionPlan,
        startCognitiveReframe,
        getCrisisResources,
        lastMessageFailed,
      }}
    >
      {children}
    </CompanionChatContext.Provider>
  );
};

export const useCompanionChat = () => useContext(CompanionChatContext);