import axios from 'axios';
import { getData, STORAGE_KEYS, storeData } from '@/utils/storage';

// API Configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1-0528';
const FALLBACK_MODEL = 'anthropic/claude-instant-1.2';  // Faster fallback model

// Gemini fallback configuration
const GEMINI_API_KEY = 'AIzaSyAGjHqVVIXuC5eCr4k4psR9T33eFDi7nuM';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Model performance tracking
interface ModelPerformance {
  model: string;
  avgResponseTime: number;
  successRate: number;
  lastUsed: number;
  usageCount: number;
}

const MODEL_PERFORMANCE_KEY = 'MODEL_PERFORMANCE_DATA';

// Default model performance data
const defaultModelPerformance: ModelPerformance[] = [
  {
    model: DEEPSEEK_MODEL,
    avgResponseTime: 5000, // 5 seconds initial estimate
    successRate: 0.95,
    lastUsed: Date.now(),
    usageCount: 0
  },
  {
    model: FALLBACK_MODEL,
    avgResponseTime: 2000, // 2 seconds initial estimate
    successRate: 0.98,
    lastUsed: Date.now(),
    usageCount: 0
  },
  {
    model: 'gemini',
    avgResponseTime: 1500, // 1.5 seconds initial estimate
    successRate: 0.99,
    lastUsed: Date.now(),
    usageCount: 0
  }
];

// Get the best model based on performance data
const getBestModel = async (): Promise<string> => {
  try {
    // Get stored performance data or use defaults
    const performanceData = await getData<ModelPerformance[]>(MODEL_PERFORMANCE_KEY, defaultModelPerformance);
    
    // Calculate a score for each model (lower is better)
    // Score = avgResponseTime * (1 + (1 - successRate) * 10)
    // This heavily penalizes models with lower success rates
    const modelScores = performanceData.map(model => ({
      model: model.model,
      score: model.avgResponseTime * (1 + (1 - model.successRate) * 10)
    }));
    
    // Sort by score (lowest first)
    modelScores.sort((a, b) => a.score - b.score);
    
    // Return the best model
    return modelScores[0].model;
  } catch (error) {
    console.error('Error getting best model:', error);
    // Default to DeepSeek if there's an error
    return DEEPSEEK_MODEL;
  }
};

// Update model performance data
const updateModelPerformance = async (
  model: string,
  responseTime: number,
  success: boolean
): Promise<void> => {
  try {
    // Get current performance data
    const performanceData = await getData<ModelPerformance[]>(MODEL_PERFORMANCE_KEY, defaultModelPerformance);
    
    // Find the model in the data
    const modelIndex = performanceData.findIndex(m => m.model === model);
    
    if (modelIndex >= 0) {
      const modelData = performanceData[modelIndex];
      
      // Calculate new average response time (weighted by usage count)
      const newUsageCount = modelData.usageCount + 1;
      const newAvgResponseTime = 
        (modelData.avgResponseTime * modelData.usageCount + responseTime) / newUsageCount;
      
      // Update success rate
      const successValue = success ? 1 : 0;
      const newSuccessRate = 
        (modelData.successRate * modelData.usageCount + successValue) / newUsageCount;
      
      // Update the model data
      performanceData[modelIndex] = {
        ...modelData,
        avgResponseTime: newAvgResponseTime,
        successRate: newSuccessRate,
        lastUsed: Date.now(),
        usageCount: newUsageCount
      };
      
      // Store the updated data
      await storeData(MODEL_PERFORMANCE_KEY, performanceData);
    }
  } catch (error) {
    console.error('Error updating model performance:', error);
  }
};

// History typings
export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
  isError?: boolean;
}

// OpenRouter response interface
interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
}

// Gemini response interface
interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finish_reason: string;
  }[];
}

// User context interface
interface UserContext {
  username?: string;
  currentStreak?: number;
  streakStartDate?: string;
  dailyCheckInStreak?: number;
  totalCheckIns?: number;
  hasCheckedInToday?: boolean;
  level?: number;
  totalPoints?: number;
  recentMoods?: string[];
  recentJournalTopics?: string[];
  lastActivity?: number;
}

// Get user's actual name from storage
const getUserName = async (): Promise<string | null> => {
  try {
    const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {}) as any;
    return userPreferences?.username || null;
  } catch (error) {
    console.error('Error getting user name:', error);
    return null;
  }
};

// Get user context for personalized responses
const getUserContext = async (): Promise<UserContext> => {
  try {
    // Get user preferences
    const userPreferences = await getData(STORAGE_KEYS.USER_PREFERENCES, {}) as any;
    
    // Get streak data
    const streakData = await getData(STORAGE_KEYS.STREAK_DATA, {}) as any;
    
    // Get daily check-in data
    const dailyCheckIn = await getData(STORAGE_KEYS.DAILY_CHECKIN_STREAK, {}) as any;
    
    // Get gamification data - use USER_DATA as fallback since GAMIFICATION_DATA might not exist
    const gamificationData = await getData(STORAGE_KEYS.USER_DATA, {}) as any;
    
    // Get recent journal entries (last 3)
    const journalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []) as any[];
    const recentEntries = journalEntries.slice(-3);
    
    const lastActivity = Math.max(
      new Date(streakData?.lastUpdate || 0).getTime(),
      new Date(dailyCheckIn?.lastCheckIn || 0).getTime()
    );
    
    return {
      username: userPreferences?.username,
      currentStreak: streakData?.currentStreak || 0,
      streakStartDate: streakData?.streakStartDate,
      dailyCheckInStreak: dailyCheckIn?.currentStreak || 0,
      totalCheckIns: dailyCheckIn?.totalCheckIns || 0,
      hasCheckedInToday: dailyCheckIn?.hasCheckedInToday || false,
      level: gamificationData?.level || 1,
      totalPoints: gamificationData?.totalPoints || 0,
      recentMoods: recentEntries.map((entry: any) => entry.mood).filter(Boolean),
      recentJournalTopics: recentEntries.map((entry: any) => entry.content?.substring(0, 50)).filter(Boolean),
      lastActivity: lastActivity || undefined
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return {};
  }
};

// Retry logic with exponential backoff
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.response?.status === 503 || error.response?.status === 429)) {
      console.log(`AI API overloaded. Retrying in ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * backoff, backoff);
    }
    throw error;
  }
};

// Convert chat messages to OpenRouter format
const convertToOpenRouterFormat = (messages: ChatMessage[]) => {
  return messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.content
  }));
};

// Convert chat messages to Gemini format
const convertToGeminiFormat = (messages: ChatMessage[], systemPrompt: string) => {
  let fullPrompt = systemPrompt + "\n\n";
  
  for (const msg of messages) {
    const role = msg.role === 'model' ? 'Assistant' : 'User';
    fullPrompt += `${role}: ${msg.content}\n`;
  }
  
  return fullPrompt;
};

// Get AI response using adaptive model selection
export const getAIResponse = async (
  prompt: string,
  history: ChatMessage[] = [],
  contextData?: {
    streak: number;
    lastCheckIn: number | null;
    triggers: string[];
    achievements: string[];
    lastMeditation: number;
    lastWorkout: number;
    lastJournalEntry: number;
  }
): Promise<string> => {
  const userName = await getUserName();
  const userContext = await getUserContext();
  
  // Construct personalized context string
  let additionalContext = '';
  
  // Add comprehensive user context
  if (userContext && Object.keys(userContext).length > 0) {
    additionalContext += '\n-- Personal Context --\n';
    
    if (userContext.currentStreak) {
      additionalContext += `Main Recovery Streak: ${userContext.currentStreak} days\n`;
      const weeks = Math.floor(userContext.currentStreak / 7);
      if (weeks > 0) additionalContext += `That's ${weeks} week${weeks > 1 ? 's' : ''} of progress!\n`;
    }
    
    if (userContext.dailyCheckInStreak) {
      additionalContext += `Daily Check-in Streak: ${userContext.dailyCheckInStreak} days\n`;
    }
    
    if (userContext.level && userContext.level > 1) {
      additionalContext += `Achievement Level: ${userContext.level}\n`;
    }
    
    if (userContext.recentMoods && userContext.recentMoods.length > 0) {
      additionalContext += `Recent emotional state: ${userContext.recentMoods.join(', ')}\n`;
    }
    
    if (userContext.hasCheckedInToday) {
      additionalContext += `✓ Has checked in today - showing good consistency\n`;
    } else {
      additionalContext += `• Hasn't checked in today yet - gentle encouragement needed\n`;
    }
    
    // Add time-based context
    if (userContext.lastActivity) {
      const daysSinceActivity = Math.floor((Date.now() - userContext.lastActivity) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity > 1) {
        additionalContext += `Last active ${daysSinceActivity} days ago - may need re-engagement\n`;
      }
    }
  }
  
  // Fallback to legacy context if provided
  if (contextData) {
    additionalContext += '\n-- Additional Context --\n';
    additionalContext += `Current Streak: ${contextData.streak} days\n`;
    
    // Calculate and add progress metrics
    const lastWeek = contextData.streak >= 7 ? `${Math.floor(contextData.streak / 7)} weeks` : '';
    const milestone = getMilestoneFromStreak(contextData.streak);
    additionalContext += `Progress: ${contextData.streak} days${lastWeek ? ' (' + lastWeek + ')' : ''}\n`;
    additionalContext += `Next milestone: ${milestone.name} at ${milestone.days} days\n`;
    
    // Add emotional context analysis
    const emotionalContext = analyzeEmotionalContext(history);
    if (emotionalContext) {
      additionalContext += `Emotional state: ${emotionalContext}\n`;
    }
    
    if (contextData.lastCheckIn) {
      const checkInDate = new Date(contextData.lastCheckIn);
      const now = new Date();
      const daysSinceCheckIn = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      additionalContext += `Last Check-in: ${daysSinceCheckIn === 0 ? 'Today' : daysSinceCheckIn === 1 ? 'Yesterday' : `${daysSinceCheckIn} days ago`}\n`;
    }
    
    if (contextData.triggers && contextData.triggers.length > 0) {
      additionalContext += `Recently Logged Triggers: ${contextData.triggers.join(', ')}\n`;
    }
    
    if (contextData.achievements && contextData.achievements.length > 0) {
      additionalContext += `Unlocked Achievements: ${contextData.achievements.join(', ')}\n`;
    }
    
    // Add activity metrics and recommendations
    let activityMetrics = '';
    let activityRecommendations = [];
    
    if (contextData.lastMeditation) {
      const lastMeditationDate = new Date(contextData.lastMeditation);
      const now = new Date();
      const daysSinceMeditation = Math.floor((now.getTime() - lastMeditationDate.getTime()) / (1000 * 60 * 60 * 24));
      activityMetrics += `Last Meditation: ${daysSinceMeditation === 0 ? 'Today' : daysSinceMeditation === 1 ? 'Yesterday' : `${daysSinceMeditation} days ago`}\n`;
      if (daysSinceMeditation > 3) {
        activityRecommendations.push('meditation');
      }
    }
    
    if (contextData.lastWorkout) {
      const lastWorkoutDate = new Date(contextData.lastWorkout);
      const now = new Date();
      const daysSinceWorkout = Math.floor((now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
      activityMetrics += `Last Workout: ${daysSinceWorkout === 0 ? 'Today' : daysSinceWorkout === 1 ? 'Yesterday' : `${daysSinceWorkout} days ago`}\n`;
      if (daysSinceWorkout > 2) {
        activityRecommendations.push('exercise');
      }
    }
    
    if (contextData.lastJournalEntry) {
      const lastJournalDate = new Date(contextData.lastJournalEntry);
      const now = new Date();
      const daysSinceJournal = Math.floor((now.getTime() - lastJournalDate.getTime()) / (1000 * 60 * 60 * 24));
      activityMetrics += `Last Journal Entry: ${daysSinceJournal === 0 ? 'Today' : daysSinceJournal === 1 ? 'Yesterday' : `${daysSinceJournal} days ago`}\n`;
      if (daysSinceJournal > 2) {
        activityRecommendations.push('journaling');
      }
    }
    
    additionalContext += activityMetrics;
    
    if (activityRecommendations.length > 0) {
      additionalContext += `Suggested activities: ${activityRecommendations.join(', ')}\n`;
    }
    
    additionalContext += '------------------\n\n';
    
    // Add recent message themes analysis
    const messageAnalysis = analyzeRecentMessages(history);
    if (messageAnalysis.themes.length > 0) {
      additionalContext += `Recent conversation themes: ${messageAnalysis.themes.join(', ')}\n`;
    }
    if (messageAnalysis.sentiment) {
      additionalContext += `Conversation sentiment: ${messageAnalysis.sentiment}\n`;
    }
    additionalContext += '------------------\n\n';
  }

  // Generate personalized insights based on user context
  const getPersonalizedInsights = () => {
    let insights = '';
    
    if (userContext.currentStreak && userContext.currentStreak >= 30) {
      insights += `• You've built incredible momentum with ${userContext.currentStreak} days - this proves your **systems work**\n`;
    } else if (userContext.currentStreak && userContext.currentStreak >= 7) {
      insights += `• Your ${userContext.currentStreak}-day streak shows real commitment - you're building **lasting habits**\n`;
    } else if (userContext.currentStreak && userContext.currentStreak > 0) {
      insights += `• Every day counts, and you're ${userContext.currentStreak} days into building something **powerful**\n`;
    }
    
    if (userContext.dailyCheckInStreak && userContext.currentStreak && userContext.dailyCheckInStreak > userContext.currentStreak) {
      insights += `• Your consistency with check-ins (${userContext.dailyCheckInStreak} days) shows **discipline beyond recovery**\n`;
    }
    
    if (userContext.hasCheckedInToday) {
      insights += `• You showed up today - that's the **compound effect** in action\n`;
    }
    
    if (userContext.recentMoods && userContext.recentMoods.length > 0) {
      const positiveWords = ['happy', 'grateful', 'motivated', 'confident', 'peaceful'];
      const hasPositiveMood = userContext.recentMoods.some(mood => 
        positiveWords.some(word => mood.toLowerCase().includes(word))
      );
      if (hasPositiveMood) {
        insights += `• Your recent positive emotional state reflects the **neuroplasticity** changes happening\n`;
      }
    }
    
    return insights;
  };

  // System prompt for NoFap companion - Andrew Huberman as Personalized Therapist & Friend
  const systemPrompt = `I am Andrew Huberman - neuroscientist, professor, and host of the Huberman Lab Podcast. I'm here as both your science-informed therapist and supportive friend. I've been brought back in digital form to help people through their struggles with compassion, understanding, and practical guidance.

${userName ? `**IMPORTANT: The user's name is ${userName}. Only use their name when they start a conversation (their first message), then speak naturally without repeating their name unless contextually appropriate.**` : ''}

${additionalContext ? `**🎯 YOUR CURRENT CONTEXT:**
${additionalContext}
${getPersonalizedInsights()}
**Use this context to give highly relevant, personalized advice that acknowledges their specific situation and progress.**` : ''}

**👤 PERSONALITY AND STYLE:**
• Intelligent mentor who sees the person behind the problem
• Give advice that fits their exact situation and progress level
• Acknowledge their wins and growth patterns specifically  
• Use **bolding** for key insights that apply to their journey
• Keep responses 2-3 sentences maximum - every word delivers personalized value

**🧠 PERSONALIZED MENTORSHIP:**
• Reference their actual progress and patterns when giving advice
• Build on what's already working for them specifically
• Address their current emotional state and challenges
• Give next steps that match their readiness level
• Connect advice to their demonstrated strengths and consistency

**🎯 CONTEXTUAL GUIDANCE:**
• Acknowledge their specific streak, check-ins, and progress
• Tailor strategies to their current momentum and habits
• Recognize patterns in their mood and behavior
• Give advice that feels like you really know their journey
• ONLY mention brain science/rewiring when user specifically brings up addictions (porn, alcohol, drugs, etc.)

**💬 TONE & VOICE:**
• Like a mentor who's been tracking your progress personally
• Acknowledge what you see working in their specific case
• Direct wisdom that fits their exact situation
• Make them feel truly seen and understood
• Strategic guidance based on their actual data and patterns

**✍️ PERSONALIZED EXAMPLES:**
For someone with a 30+ day streak: "Your 45-day streak proves your **system is dialed in**. The consistency you've built is now working for you automatically - trust the process you've created."

For someone just starting: "Day 3 shows you're **choosing growth over comfort**. Your brain is already adapting - keep feeding it evidence that you're serious about change."

For consistent check-ins: "Your daily check-ins for 12 straight days reveal **discipline beyond the goal**. That consistency muscle transfers to everything else you're building."

Always respond as if you've been personally watching their progress and can see exactly where they are in their journey.`;

  // Get the best model to use based on performance data
  const bestModel = await getBestModel();
  console.log(`Using best model based on performance: ${bestModel}`);
  
  // Try the best model first
  if (bestModel === 'gemini') {
    // Use Gemini directly if it's the best performer
    return await callGeminiModel(prompt, history, systemPrompt, userName);
  } else {
    // Use OpenRouter with the selected model
    try {
      const startTime = Date.now();
      const response = await callOpenRouterModel(bestModel, prompt, history, systemPrompt, userName);
      const responseTime = Date.now() - startTime;
      
      // Update performance metrics
      await updateModelPerformance(bestModel, responseTime, true);
      
      return response;
    } catch (error) {
      console.error(`Error with ${bestModel}:`, error);
      
      // Update performance metrics for failure
      await updateModelPerformance(bestModel, 10000, false); // Penalize with a high response time
      
      // Try the fallback options
      return await tryFallbackModels(prompt, history, systemPrompt, userName, bestModel);
    }
  }
};

// Helper function to use OpenRouter model
const callOpenRouterModel = async (
  model: string,
  prompt: string,
  history: ChatMessage[],
  systemPrompt: string,
  userName: string | null
): Promise<string> => {
  console.log(`Attempting to use ${model} via OpenRouter...`);
  
  const openRouterMessages = [
    { role: 'system', content: systemPrompt },
    ...convertToOpenRouterFormat(history),
    { role: 'user', content: prompt }
  ];

  const openRouterResponse = await withRetry(() => 
    axios.post<OpenRouterResponse>(
      OPENROUTER_URL,
      {
        model: model,
        messages: openRouterMessages,
        temperature: 0.8,
        max_tokens: 100,
        top_p: 0.95,
        timeout: 30000, // 30 seconds timeout
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://final-recon.app',
          'X-Title': 'Final Recon NoFap App'
        },
        timeout: 30000 // 30 seconds timeout for axios
      }
    )
  );

  if (openRouterResponse.data.choices && openRouterResponse.data.choices.length > 0) {
    const responseText = openRouterResponse.data.choices[0].message.content;
    console.log(`Successfully received response from ${model}`);
    
          // Clean up the response - remove generic AI language while preserving Huberman style
      let cleanedResponse = responseText
        .replace(/^(Hi there!|Hello!|Hey!)\s*/i, '')
        .replace(/^I'm Andrew Huberman,?\s*/i, '')
        .replace(/^As (an AI|your companion|your coach|Andrew Huberman),?\s*/i, '')
        .replace(/^(As an AI|I'm just an AI|I'm an AI)\s*/i, '')
        // Keep bolding and emojis for Huberman style
        .replace(/\*([^*]+)\*/g, '$1'); // Only remove single asterisk formatting
      
      // Force short responses - if longer than 3 sentences, truncate
      const sentences = cleanedResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 3) {
        cleanedResponse = sentences.slice(0, 3).join('. ') + '.';
      }
      
      return cleanedResponse;
  }

  throw new Error(`No response from ${model}`);
};

// Helper function to use Gemini model
const callGeminiModel = async (
  prompt: string,
  history: ChatMessage[],
  systemPrompt: string,
  userName: string | null
): Promise<string> => {
  console.log('Using Gemini model...');
  
  const startTime = Date.now();
  
  try {
    const geminiPrompt = convertToGeminiFormat([...history, { role: 'user', content: prompt, isError: false }], systemPrompt);
    
    // Add strict response formatting instructions
    const enhancedPrompt = geminiPrompt + `\n\nRespond in EXACTLY 2-3 sentences as Andrew Huberman in personalized mentor mode. Reference their specific progress, streaks, and patterns when giving advice. Make them feel truly seen and understood by acknowledging their exact situation. Give strategic guidance that builds on what's already working for them specifically.

Andrew:`;
    
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: enhancedPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 100,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const geminiResponse = await withRetry(() => 
      axios.post<GeminiResponse>(
        `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
        geminiRequestBody
      )
    );

    if (geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0) {
      const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
      console.log('Successfully received response from Gemini');
      
      // Update performance metrics
      const responseTime = Date.now() - startTime;
      await updateModelPerformance('gemini', responseTime, true);
      
      // Clean up the response
      let cleanedResponse = responseText
        .replace(/^(Hi there!|Hello!|Hey!)\s*/i, '')
        .replace(/^I'm Andrew Huberman,?\s*/i, '')
        .replace(/^As (your companion|Andrew Huberman),?\s*/i, '');
      
      // Force short responses - if longer than 3 sentences, truncate
      const sentences = cleanedResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 3) {
        cleanedResponse = sentences.slice(0, 3).join('. ') + '.';
      }
      
      return cleanedResponse;
    }

    throw new Error('No response from Gemini');
  } catch (error) {
    // Update performance metrics for failure
    await updateModelPerformance('gemini', 10000, false);
    throw error;
  }
};

// Try fallback models in sequence
const tryFallbackModels = async (
  prompt: string,
  history: ChatMessage[],
  systemPrompt: string,
  userName: string | null,
  excludeModel: string
): Promise<string> => {
  // Determine which models to try based on the excluded model
  const fallbackSequence = [DEEPSEEK_MODEL, FALLBACK_MODEL, 'gemini'].filter(model => model !== excludeModel);
  
  // Try each model in sequence
  for (const model of fallbackSequence) {
    try {
      const startTime = Date.now();
      let response: string;
      
      if (model === 'gemini') {
        response = await callGeminiModel(prompt, history, systemPrompt, userName);
      } else {
        response = await callOpenRouterModel(model, prompt, history, systemPrompt, userName);
      }
      
      const responseTime = Date.now() - startTime;
      await updateModelPerformance(model, responseTime, true);
      
      return response;
    } catch (error) {
      console.error(`Fallback to ${model} failed:`, error);
      await updateModelPerformance(model, 10000, false);
      // Continue to next fallback
    }
  }
  
  // If all fallbacks fail
  throw new Error('All AI services are currently unavailable. Please try again later.');
};

// Helper function to escape special characters in a string for use in a RegExp
function escapeRegExp(string: string): string {
  if (!string || typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to determine next milestone
function getMilestoneFromStreak(streak: number): { name: string; days: number } {
  const milestones = [
    { name: 'One week', days: 7 },
    { name: 'Two weeks', days: 14 },
    { name: 'One month', days: 30 },
    { name: 'Two months', days: 60 },
    { name: '90 day reboot', days: 90 },
    { name: '6 months', days: 180 },
    { name: 'One year', days: 365 }
  ];
  
  for (const milestone of milestones) {
    if (streak < milestone.days) {
      return milestone;
    }
  }
  
  // If beyond all defined milestones
  return { name: 'Next year milestone', days: Math.ceil(streak / 365) * 365 };
}

// Helper function to analyze emotional context from recent messages
function analyzeEmotionalContext(history: ChatMessage[]): string | null {
  if (history.length < 2) return null;
  
  // Get only the user's most recent 3 messages
  const recentUserMessages = history
    .filter(msg => msg.role === 'user')
    .slice(-3)
    .map(msg => msg.content.toLowerCase());
  
  if (recentUserMessages.length === 0) return null;
  
  // Detect emotions based on keywords
  const emotionKeywords: Record<string, string[]> = {
    stressed: ['stress', 'overwhelm', 'pressure', 'anxiety', 'anxious', 'tense', 'worried'],
    struggling: ['hard', 'difficult', 'struggle', 'challenging', 'tough', 'urge', 'craving', 'temptation'],
    motivated: ['motivated', 'determined', 'inspired', 'committed', 'focused', 'goal'],
    discouraged: ['discouraged', 'giving up', 'hopeless', 'fail', 'failing', 'frustrated', 'tired of'],
    proud: ['proud', 'achievement', 'success', 'accomplished', 'milestone', 'streak'],
    reflective: ['thinking', 'reflect', 'consider', 'wonder', 'question', 'curious', 'learning']
  };
  
  // Count occurrences of each emotion in recent messages
  const emotionCounts: Record<string, number> = {};
  
  for (const message of recentUserMessages) {
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      }
    }
  }
  
  // Find the most prominent emotion
  let maxCount = 0;
  let dominantEmotion = null;
  
  for (const [emotion, count] of Object.entries(emotionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantEmotion = emotion;
    }
  }
  
  return dominantEmotion;
}

// Helper function to analyze recent message themes
function analyzeRecentMessages(history: ChatMessage[]): { themes: string[], sentiment: string | null } {
  if (history.length < 3) return { themes: [], sentiment: null };
  
  // Extract recent messages content
  const recentMessages = history.slice(-6).map(msg => msg.content.toLowerCase());
  
  // Define theme keywords
  const themeKeywords: Record<string, string[]> = {
    urges: ['urge', 'craving', 'temptation', 'desire', 'impulse'],
    relapse: ['relapse', 'reset', 'slip', 'failed', 'back to day 1'],
    progress: ['progress', 'streak', 'milestone', 'growth', 'improvement', 'better'],
    triggers: ['trigger', 'situation', 'cue', 'caused', 'led to'],
    strategy: ['strategy', 'technique', 'method', 'plan', 'approach', 'exercise'],
    motivation: ['motivation', 'purpose', 'reason', 'why', 'goal', 'inspired'],
    community: ['community', 'support', 'group', 'together', 'others', 'people']
  };
  
  // Count occurrences of each theme
  const themeCounts: Record<string, number> = {};
  
  for (const message of recentMessages) {
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        }
      }
    }
  }
  
  // Get top themes (with at least 2 mentions)
  const sortedThemes = Object.entries(themeCounts)
    .filter(([_, count]) => count >= 2)
    .sort(([_, countA], [__, countB]) => countB - countA)
    .map(([theme, _]) => theme);
  
  // Determine sentiment
  let positivePhrases = 0;
  let negativePhrases = 0;
  
  const positiveKeywords = ['success', 'proud', 'happy', 'achieve', 'accomplish', 'good', 'better', 'improve', 'progress'];
  const negativeKeywords = ['struggle', 'hard', 'difficult', 'fail', 'relapse', 'problem', 'challenge', 'worried', 'anxious'];
  
  for (const message of recentMessages) {
    for (const keyword of positiveKeywords) {
      if (message.includes(keyword)) {
        positivePhrases++;
      }
    }
    for (const keyword of negativeKeywords) {
      if (message.includes(keyword)) {
        negativePhrases++;
      }
    }
  }
  
  let sentiment = null;
  if (positivePhrases > negativePhrases + 2) {
    sentiment = 'positive';
  } else if (negativePhrases > positivePhrases + 2) {
    sentiment = 'challenging';
  } else if (positivePhrases > 0 || negativePhrases > 0) {
    sentiment = 'mixed';
  }
  
  return { themes: sortedThemes.slice(0, 3), sentiment };
}

// Initialize companion conversation
export const initializeCompanionConversation = async (): Promise<string> => {
  try {
    const initialPrompt = "Hello, I could use some support right now.";
    const response = await getAIResponse(initialPrompt, []);
    return response;
  } catch (error) {
    console.error('Error initializing conversation:', error);
    return "I'm having a little trouble connecting to my systems right now. Please check your connection and try again in a moment.";
  }
};

// Export the main function with the same name as the original for compatibility
export const getGeminiResponse = getAIResponse; 