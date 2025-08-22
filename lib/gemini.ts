// Re-export everything from the new AI service for backward compatibility
export { 
  ChatMessage, 
  getAIResponse as getGeminiResponse, 
  initializeCompanionConversation 
} from './ai-service';

import { getAIResponse, ChatMessage } from './ai-service';
import { getData, STORAGE_KEYS } from '@/utils/storage';

// Companion data interface
interface CompanionData {
  name: string;
  type: string;
  level: number;
}

// Get user's actual name from storage
const getUserName = async (): Promise<string | null> => {
  try {
    const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {});
    return userPreferences?.username || null;
  } catch (error) {
    console.error('Error getting user name:', error);
    return null;
  }
};

// Detect conversation type based on user input
const detectConversationType = (prompt: string): string => {
  const lowercasePrompt = prompt.toLowerCase();
  
  if (
    lowercasePrompt.includes('daily check') || 
    lowercasePrompt.includes('how am i doing') ||
    lowercasePrompt.includes('check in') ||
    lowercasePrompt.includes('day ') ||
    lowercasePrompt.includes('today')
  ) {
    return 'daily-check-in';
  }
  
  if (
    lowercasePrompt.includes('urge') || 
    lowercasePrompt.includes('craving') || 
    lowercasePrompt.includes('tempt') ||
    lowercasePrompt.includes('want to watch') ||
    lowercasePrompt.includes('feeling triggered')
  ) {
    return 'urge';
  }
  
  if (
    lowercasePrompt.includes('relapsed') || 
    lowercasePrompt.includes('gave in') || 
    lowercasePrompt.includes('failed') ||
    lowercasePrompt.includes('messed up') ||
    lowercasePrompt.includes('reset my streak')
  ) {
    return 'relapse';
  }
  
  if (
    lowercasePrompt.includes('negative thoughts') || 
    lowercasePrompt.includes('thinking bad') || 
    lowercasePrompt.includes('can\'t do this') ||
    lowercasePrompt.includes('failure') ||
    lowercasePrompt.includes('worthless')
  ) {
    return 'negative-thoughts';
  }
  
  if (
    lowercasePrompt.includes('struggling') || 
    lowercasePrompt.includes('hard time') || 
    lowercasePrompt.includes('difficult') ||
    lowercasePrompt.includes('help me')
  ) {
    return 'struggling';
  }
  
  return 'general';
};

// Helper functions for specific conversation types
export const createDailyCheckIn = async (dayCount?: number): Promise<string> => {
  try {
    let prompt = "Let's do a daily check-in. ";
    if (dayCount) {
      prompt += `Today is day ${dayCount} of my NoFap journey. `;
    }
    prompt += "How am I doing today and what support do I need?";
    
    return await getAIResponse(prompt, []);
  } catch (error) {
    console.error('Error creating daily check-in:', error);
    return "Tracking progress is **systems thinking** - you're measuring what matters. Identify your highest-leverage daily actions and double down on those. Consistency in the right areas compounds exponentially.";
    }
};

export const createUrgeManagementResponse = async (prompt: string): Promise<string> => {
  try {
    const urgePrompt = "I'm experiencing an urge right now and need help managing it. Can you guide me through some techniques?";
    return await getAIResponse(urgePrompt, []);
  } catch (error) {
    console.error('Error creating urge management response:', error);
    return "Urges are **decision points** - you're either reinforcing the old pattern or building a new one. Use the 10-minute rule: commit to waiting 10 minutes while doing something physical. Most urges peak and fade in that window.";
  }
};

export const createUrgeSurfingFlow = async (prompt: string): Promise<string> => {
  try {
    const surfingPrompt = "I want to try urge surfing to manage my current urge. Please guide me through the mindfulness technique.";
    return await getAIResponse(surfingPrompt, []);
  } catch (error) {
    console.error('Error creating urge surfing flow:', error);
    return "Sitting with discomfort is **antifragility training** - you're building resilience through controlled stress. Use the 4-4-8 breathing pattern to activate your parasympathetic nervous system. This rewires your response to future challenges.";
  }
};

export const createDistractionPlanFlow = async (prompt: string): Promise<string> => {
  try {
    const distractionPrompt = "I'd like to use distraction techniques to manage my urge. What activities can help me shift focus?";
    return await getAIResponse(distractionPrompt, []);
  } catch (error) {
    console.error('Error creating distraction plan flow:', error);
    return "Energy redirection is **leverage** - you're using the urge's power against itself. Physical movement shifts your biochemistry and breaks the mental loop. Channel that energy into building something valuable.";
      }
};

export const createRelapseResponse = async (prompt: string): Promise<string> => {
  try {
    const relapsePrompt = "I relapsed and I'm feeling really bad about myself. I need support and guidance on how to move forward.";
    return await getAIResponse(relapsePrompt, []);
  } catch (error) {
    console.error('Error creating relapse response:', error);
    return "Failure is **data collection** - analyze the trigger patterns and system failures that led here. Build specific protocols for those exact scenarios. Your comeback strategy matters more than the setback itself.";
      }
};

export const createCognitiveReframeResponse = async (prompt: string): Promise<string> => {
  try {
    const reframePrompt = "I'm having negative thoughts about myself and my ability to succeed in NoFap. I need help reframing these thoughts.";
    return await getAIResponse(reframePrompt, []);
  } catch (error) {
    console.error('Error creating cognitive reframe response:', error);
    return "Negative thought loops are **mental habits** running on autopilot. Interrupt the pattern by asking: 'Is this thought helping me move forward?' Then redirect to your next strategic action. Control your focus, control your outcomes.";
  }
};

export const createStrugglingResponse = async (prompt: string): Promise<string> => {
  try {
    const strugglingPrompt = "I'm really struggling with my NoFap journey and could use some encouragement and practical support.";
    return await getAIResponse(strugglingPrompt, []);
  } catch (error) {
    console.error('Error creating struggling response:', error);
    return "Struggle indicates you're at the **edge of your comfort zone** - exactly where growth happens. Identify the smallest meaningful action that builds momentum. Momentum creates confidence, confidence enables bigger actions.";
  }
};

// Crisis response function
const getCrisisResponse = async (): Promise<string> => {
  
  return `I'm really concerned about you right now. Your safety is the most important thing. Please reach out to someone who can help immediately:

• National Suicide Prevention Lifeline: 988 or 1-800-273-8255
• Crisis Text Line: Text HOME to 741741
• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

You don't have to go through this alone. There are people who want to help you. Please reach out to a trusted friend, family member, counselor, or emergency services.

I'm here to support you, but I want to make sure you get the immediate help you need. You matter, and your life has value.`;
};

// Main response function that handles different conversation types
export const getGeminiResponseWithContext = async (
  prompt: string,
  history: ChatMessage[] = []
): Promise<string> => {
  try {
    // Detect conversation type
    const conversationType = detectConversationType(prompt);
      
    // Handle specialized conversation types
    if (conversationType === 'daily-check-in') {
      const dayMatch = prompt.match(/day\s+(\d+)/i);
      const dayCount = dayMatch ? parseInt(dayMatch[1]) : undefined;
      return await createDailyCheckIn(dayCount);
    } else if (conversationType === 'urge') {
      const lowercasePrompt = prompt.toLowerCase();
      
      if (
        lowercasePrompt.includes('surf') || 
        lowercasePrompt.includes('ride the wave') || 
        lowercasePrompt.includes('mindfulness') ||
        lowercasePrompt.match(/\b(first|1|1st)\b/)
      ) {
        return await createUrgeSurfingFlow(prompt);
      } else if (
        lowercasePrompt.includes('distract') || 
        lowercasePrompt.includes('activity') || 
        lowercasePrompt.includes('shift focus') ||
        lowercasePrompt.match(/\b(second|2|2nd)\b/)
      ) {
        return await createDistractionPlanFlow(prompt);
      } else {
        return await createUrgeManagementResponse(prompt);
      }
    } else if (conversationType === 'relapse') {
      return await createRelapseResponse(prompt);
    } else if (conversationType === 'negative-thoughts') {
      return await createCognitiveReframeResponse(prompt);
    } else if (conversationType === 'struggling') {
      return await createStrugglingResponse(prompt);
    }
      
    // For regular conversations, use the main AI service
    return await getAIResponse(prompt, history);
      
  } catch (error) {
    console.error('Error in getGeminiResponseWithContext:', error);
    throw error;
  }
};