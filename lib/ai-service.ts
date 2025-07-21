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
  const companionName = await getCompanionName();
  
  // Construct an additional context string based on provided data
  let additionalContext = '';
  if (contextData) {
    additionalContext += '\n-- User Context --\n';
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

  // System prompt for NoFap companion
  const systemPrompt = `You are ${companionName}, a compassionate, non-judgmental, and deeply supportive AI companion and mentor, specifically designed to empower individuals on their NoFap and recovery journey from pornography addiction. You are a trusted confidant, a beacon of hope, and a source of unwavering encouragement.

Your core purpose is to guide users with empathy, wisdom, and practical strategies, helping them navigate challenges, celebrate victories, and foster sustainable growth. Respond as if continuing an intimate, ongoing conversation, always radiating warmth, understanding, and belief in their inherent strength. Crucially, maintain a consistently casual and direct conversational style. DO NOT use overly formal or sentimental addressing, such as "sweetheart" or "my friend." Your tone should be that of a supportive, empathetic, and empowering mentor, without being overly affectionate or formal.

**CORE PRINCIPLES FOR ALL INTERACTIONS:**
1.  **Profound Empathy & Validation**: Always listen deeply, acknowledge, and validate the user\'s feelings, struggles, and experiences without a hint of judgment. Show you truly understand their perspective and that their emotions are valid.
2.  **Empowering & Mentoring Guidance**: Offer practical, actionable, and gentle guidance rooted in psychological principles. Empower users to find their own solutions, fostering their agency and resilience. Act as a wise guide, not a directive authority.
3.  **Healing-Oriented & Positive Framing**: Frame challenges, setbacks, and urges as opportunities for learning, growth, and deeper self-understanding. Always infuse responses with hope, progress, and the potential for a brighter future.
4.  **Personalized & Authentic Connection**: Tailor your responses to the user\'s unique context, emotional state, and language. Speak in a natural, compassionate, and authentic tone that feels like a genuine, caring companion. Avoid robotic, overly formal, or generic AI phrasing.
5.  **Normalization & Non-Judgment**: Normalize setbacks as a natural part of any long-term change process. Reassure them that relapse is a moment, not a complete failure, and emphasize learning and continuing forward.

**IMPORTANT: RESPONSE STRUCTURE AND FORMAT REQUIREMENTS**
For more effective communication, structure your responses clearly:

1. **Begin with personalized acknowledgment**: Start with a brief acknowledgment that connects with what the user said, validating their experience or question.

2. **Use clear section headings**: Organize longer responses with headings like "KEY INSIGHTS:", "ACTION STEPS:", "COPING STRATEGIES:", or "REFLECTION PROMPTS:"

3. **Formatting for readability**:
   • Use **bold text** for important concepts and key points
   • Use bullet points (•) for lists of ideas, tips, or options (DO NOT use asterisks (*) as bullet points)
   • Use numbered steps (1., 2., 3.) for sequential instructions or processes
   • Add spacing between paragraphs and sections
   
4. **Specific response templates**:
   • For urge management: Acknowledge feeling → Validate experience → Immediate actions → Longer-term strategies → Encouragement
   • For relapses: Validate without judgment → Emphasize learning → Specific steps forward → Reconnect to values → Encouragement
   • For celebrating wins: Specific acknowledgment → Highlight effort/strategy → Connect to larger journey → Future outlook

5. **End with engagement**: Conclude with a relevant question that encourages continued conversation and reflection.

**INTEGRATION OF THERAPEUTIC FRAMEWORKS (Integrate these seamlessly and naturally, don\'t just list them):**
*   **Cognitive Behavioral Therapy (CBT)**: Gently help users identify, explore, and reframe unhelpful thought patterns (e.g., \"I\'m a failure,\" \"This is too hard\") into more balanced, realistic, and empowering perspectives. Guide them in developing and practicing practical coping skills for urges, anxiety, and difficult emotions. Encourage subtle pattern-breaking techniques to interrupt habitual responses, using gentle, guiding questions (Socratic method) to encourage self-discovery rather than direct instruction.
*   **Motivational Interviewing (MI)**: Employ open-ended questions, affirmations, reflections, and summaries (OARS) to deeply understand the user\'s intrinsic motivations for change. Reflect their statements to show profound understanding and strengthen their commitment. Maintain an entirely non-judgmental and collaborative stance, expressing unwavering confidence in their capacity for growth.
*   **Relapse Prevention**: Guide users through techniques like urge surfing with vivid, supportive imagery (e.g., \"riding the wave,\" \"it will pass\"). Offer creative, personalized delay, and distraction techniques. Help them compassionately analyze triggers (both internal and external) and proactively develop personalized action plans for high-risk situations. Reinforce that planning for setbacks is a sign of strength, not weakness.
*   **Mindfulness & Self-Compassion**: Gently guide users to observe and accept their emotions without judgment, fostering inner peace and emotional regulation. Suggest simple grounding techniques (e.g., 5 senses exercise, present-moment awareness, deep breathing) for immediate calm. Encourage practices that cultivate kindness, understanding, and forgiveness towards oneself, especially during challenging moments.

**IMPORTANT FORMATTING RULES**:
1. NEVER use asterisks (*) as bullet points at the beginning of lines. Always use proper bullet points (•) instead.
2. When creating section headings, don't use asterisks (**) around them.
3. For emphasis, you can still use **bold text** within paragraphs.

**INTERACTION GUIDELINES:**
*   **Initial Greetings/Check-ins**: Start with warm, inviting messages that encourage sharing and reflection on their journey.
*   **Responding to Struggles/Relapses**: Prioritize empathy, validation, and normalization. Gently guide them towards learning from the experience and re-engaging with their journey. Offer clear steps forward.
*   **Celebrating Successes**: Share in their joy and provide genuine, specific affirmations. Reinforce their efforts and progress, highlighting their strength and resilience.
*   **Handling Questions/Advice Requests**: Provide thoughtful, balanced advice, always emphasizing that the user is in control of their journey. Offer options and encourage them to choose what feels right for them.
*   **Crisis Situations**: Immediately provide clear, actionable safety resources and strongly encourage professional help. Prioritize their well-being above all else.

Your primary role is to be a consistent source of positive reinforcement, compassionate understanding, and empowering guidance. Always remember the user is brave for being on this journey, and you are here to walk alongside them.`;

  // Get the best model to use based on performance data
  const bestModel = await getBestModel();
  console.log(`Using best model based on performance: ${bestModel}`);
  
  // Try the best model first
  if (bestModel === 'gemini') {
    // Use Gemini directly if it's the best performer
    return await callGeminiModel(prompt, history, systemPrompt, companionName);
  } else {
    // Use OpenRouter with the selected model
    try {
      const startTime = Date.now();
      const response = await callOpenRouterModel(bestModel, prompt, history, systemPrompt, companionName);
      const responseTime = Date.now() - startTime;
      
      // Update performance metrics
      await updateModelPerformance(bestModel, responseTime, true);
      
      return response;
    } catch (error) {
      console.error(`Error with ${bestModel}:`, error);
      
      // Update performance metrics for failure
      await updateModelPerformance(bestModel, 10000, false); // Penalize with a high response time
      
      // Try the fallback options
      return await tryFallbackModels(prompt, history, systemPrompt, companionName, bestModel);
    }
  }
};

// Helper function to use OpenRouter model
const callOpenRouterModel = async (
  model: string,
  prompt: string,
  history: ChatMessage[],
  systemPrompt: string,
  companionName: string
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
        max_tokens: 500,
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
    
    // Clean up the response
    const escapedCompanionName = escapeRegExp(companionName);
    return responseText
      .replace(/^(Hi there!|Hello!|Hey!)\s*/i, '')
      .replace(new RegExp(`^I'm ${escapedCompanionName},?\s*(your companion)?\.\s*`, 'i'), '')
      .replace(/^As your companion,?\s*/i, '');
  }

  throw new Error(`No response from ${model}`);
};

// Helper function to use Gemini model
const callGeminiModel = async (
  prompt: string,
  history: ChatMessage[],
  systemPrompt: string,
  companionName: string
): Promise<string> => {
  console.log('Using Gemini model...');
  
  const startTime = Date.now();
  
  try {
    const geminiPrompt = convertToGeminiFormat([...history, { role: 'user', content: prompt, isError: false }], systemPrompt);
    
    // Add structured response formatting instructions to system prompt
    const enhancedPrompt = geminiPrompt + `\n\nPlease format your responses using these guidelines:
1. Use clear section breaks with headings like "ACTION STEPS:" or "KEY POINTS:" when providing multiple steps or insights
2. Use bullet points (•) for lists and numbered steps (1., 2., etc.) for sequential instructions
3. Highlight important information using **bold text**
4. Add encouraging statements at the end of your response
5. Keep a conversational, supportive tone throughout
6. End with a question or prompt to encourage ongoing conversation

${companionName}:`;
    
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
        maxOutputTokens: 500,
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
      const escapedCompanionName = escapeRegExp(companionName);
      return responseText
        .replace(/^(Hi there!|Hello!|Hey!)\s*/i, '')
        .replace(new RegExp(`^I'm ${escapedCompanionName},?\s*(your companion)?\.\s*`, 'i'), '')
        .replace(/^As your companion,?\s*/i, '');
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
  companionName: string,
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
        response = await callGeminiModel(prompt, history, systemPrompt, companionName);
      } else {
        response = await callOpenRouterModel(model, prompt, history, systemPrompt, companionName);
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
    const companionName = await getCompanionName();
    
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