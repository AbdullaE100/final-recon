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

// Get companion name from storage
const getCompanionName = async (): Promise<string> => {
  try {
    const defaultCompanion: CompanionData = { name: 'Buddy', type: 'tiger', level: 1 };
    const companionData = await getData<CompanionData>(STORAGE_KEYS.COMPANION_DATA, defaultCompanion);
    return companionData?.name || 'Buddy';
  } catch (error) {
    console.error('Error getting companion name:', error);
    return 'Buddy';
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
    const companionName = await getCompanionName();
    
    let prompt = "Let's do a daily check-in. ";
    if (dayCount) {
      prompt += `Today is day ${dayCount} of my NoFap journey. `;
    }
    prompt += "How am I doing today and what support do I need?";
    
    return await getAIResponse(prompt, []);
  } catch (error) {
    console.error('Error creating daily check-in:', error);
    return "Let's check in on how you're doing today. On a scale of 1-10, how are you feeling about your progress? Have you experienced any urges today? Remember, every day is a step forward in your journey.";
    }
};

export const createUrgeManagementResponse = async (prompt: string): Promise<string> => {
  try {
    const urgePrompt = "I'm experiencing an urge right now and need help managing it. Can you guide me through some techniques?";
    return await getAIResponse(urgePrompt, []);
  } catch (error) {
    console.error('Error creating urge management response:', error);
    return "I understand you're experiencing an urge right now. That's completely normal and shows your brain is healing. Let's work through this together. First, can you rate this urge from 1-10? Then choose: 1) Urge surfing (mindfulness technique) or 2) Distraction plan (shift focus activities). Which feels right for you?";
  }
};

export const createUrgeSurfingFlow = async (prompt: string): Promise<string> => {
  try {
    const surfingPrompt = "I want to try urge surfing to manage my current urge. Please guide me through the mindfulness technique.";
    return await getAIResponse(surfingPrompt, []);
  } catch (error) {
    console.error('Error creating urge surfing flow:', error);
    return "Perfect choice. Urge surfing is like riding a wave - urges rise, peak, and naturally fall. Find a comfortable position and breathe deeply. Notice the urge without fighting it. Imagine it as a wave you're surfing - you're not the wave, you're the surfer. Feel it building, acknowledge it, and watch it start to fade. This usually takes 10-20 minutes. How does the urge feel now?";
  }
};

export const createDistractionPlanFlow = async (prompt: string): Promise<string> => {
  try {
    const distractionPrompt = "I'd like to use distraction techniques to manage my urge. What activities can help me shift focus?";
    return await getAIResponse(distractionPrompt, []);
  } catch (error) {
    console.error('Error creating distraction plan flow:', error);
    return "Great strategy! Here are some quick distraction options: 1) Physical: 20 push-ups, cold shower, or walk outside 2) Mental: Call a friend, play a game, or watch something funny 3) Creative: Draw, write, or play music 4) Productive: Clean your space, organize, or work on a project. Pick one that feels doable right now and commit to 15 minutes. Which one calls to you?";
      }
};

export const createRelapseResponse = async (prompt: string): Promise<string> => {
  try {
    const relapsePrompt = "I relapsed and I'm feeling really bad about myself. I need support and guidance on how to move forward.";
    return await getAIResponse(relapsePrompt, []);
  } catch (error) {
    console.error('Error creating relapse response:', error);
    return "First, thank you for sharing this with me - that takes real courage. A relapse doesn't erase your progress or make you a failure. It's data about what triggers to watch for next time. Your brain is still healing from all the days you've been clean. What matters most is what you do next. Can you identify what led to this moment? Let's use this as fuel for an even stronger comeback.";
      }
};

export const createCognitiveReframeResponse = async (prompt: string): Promise<string> => {
  try {
    const reframePrompt = "I'm having negative thoughts about myself and my ability to succeed in NoFap. I need help reframing these thoughts.";
    return await getAIResponse(reframePrompt, []);
  } catch (error) {
    console.error('Error creating cognitive reframe response:', error);
    return "I hear those harsh thoughts, and I want you to know they're not facts - they're just thoughts. Let's challenge them together. Instead of 'I'm a failure,' try 'I'm learning and growing.' Instead of 'I can't do this,' try 'This is challenging, and I'm getting stronger.' What would you say to a good friend going through the same thing? Treat yourself with that same kindness.";
  }
};

export const createStrugglingResponse = async (prompt: string): Promise<string> => {
  try {
    const strugglingPrompt = "I'm really struggling with my NoFap journey and could use some encouragement and practical support.";
    return await getAIResponse(strugglingPrompt, []);
  } catch (error) {
    console.error('Error creating struggling response:', error);
    return "I can hear that you're going through a tough time, and that's completely understandable. Recovery isn't linear - it has ups and downs. The fact that you're here asking for help shows incredible strength. What specific part feels most challenging right now? Let's break it down into smaller, manageable pieces and create a plan that feels doable for you.";
  }
};

// Crisis response function
const getCrisisResponse = async (): Promise<string> => {
  const companionName = await getCompanionName();
  
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