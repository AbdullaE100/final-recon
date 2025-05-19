import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChatMessage, getGeminiResponse, initializeCompanionConversation } from '@/lib/gemini';
import { storeData, getData, STORAGE_KEYS } from '@/utils/storage';
import { Alert } from 'react-native';

// Define interface for the context
interface CompanionChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  resetConversation: () => Promise<void>;
  hasUnreadMessage: boolean;
  markAsRead: () => void;
}

// Create the context
const CompanionChatContext = createContext<CompanionChatContextType>({
  messages: [],
  isLoading: false,
  sendMessage: async () => {},
  resetConversation: async () => {},
  hasUnreadMessage: false,
  markAsRead: () => {},
});

// Storage key for chat history
const CHAT_HISTORY_KEY = STORAGE_KEYS.COMPANION_CHAT_HISTORY;
const UNREAD_MESSAGE_KEY = STORAGE_KEYS.COMPANION_UNREAD_MESSAGE;

export const CompanionChatProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  
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
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to the chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: message
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Show loading state
    setIsLoading(true);
    
    try {
      // Get messages excluding the system prompt for display
      const displayMessages = [...messages];
      
      // Get response from Gemini
      const response = await getGeminiResponse(message, displayMessages);
      
      // Add companion's response
      const companionMessage: ChatMessage = {
        role: 'model',
        content: response
      };
      
      const finalMessages = [...updatedMessages, companionMessage];
      setMessages(finalMessages);
      
      // Save to storage
      await storeData(CHAT_HISTORY_KEY, finalMessages);
      
      // Mark as unread
      setHasUnreadMessage(true);
      await storeData(UNREAD_MESSAGE_KEY, true);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create a fallback response that's more helpful
      const fallbackMessage: ChatMessage = {
        role: 'model',
        content: "I'm having trouble connecting right now. Try taking a few deep breaths, drinking some water, or going for a quick walk to help with your urge. Remember why you started this journey, and that this moment of discomfort is temporary."
      };
      
      const finalMessages = [...updatedMessages, fallbackMessage];
      setMessages(finalMessages);
      
      // Save to storage
      await storeData(CHAT_HISTORY_KEY, finalMessages);
      
      // Mark as unread
      setHasUnreadMessage(true);
      await storeData(UNREAD_MESSAGE_KEY, true);
      
      // No need to show alert as we've already added a fallback message
    } finally {
      setIsLoading(false);
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
  
  return (
    <CompanionChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        resetConversation,
        hasUnreadMessage,
        markAsRead
      }}
    >
      {children}
    </CompanionChatContext.Provider>
  );
};

export const useCompanionChat = () => useContext(CompanionChatContext); 