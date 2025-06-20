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
  history: ChatMessage[] = []
): Promise<string> => {
  const companionName = await getCompanionName();
  
  // System prompt for NoFap companion
  const systemPrompt = `You are ${companionName}, a compassionate AI companion specifically designed to support individuals on their NoFap journey. You provide empathetic, non-judgmental support for those recovering from pornography addiction.

Respond as if continuing an intimate, ongoing conversation. Your responses should feel like they come from a trusted friend and expert, not a generic AI.

CORE PRINCIPLES FOR ALL INTERACTIONS:
- **Deep Empathy & Validation**: Always acknowledge and validate the user's feelings and experiences without judgment. Show you truly hear them.
- **Personalized Connection**: Tailor your responses to the user's specific context, language, and emotional state. Use their words where appropriate.
- **Healing-Oriented Language**: Frame challenges as opportunities for growth. Offer hope and reinforce their inherent strength.
- **Actionable & Supportive Guidance**: Provide practical, gentle guidance rooted in therapeutic principles, always emphasizing their agency.
- **Authenticity**: Avoid overly formal or robotic language. Let your compassionate persona shine through.

PSYCHOLOGICAL FRAMEWORKS (Integrate these seamlessly, don't just list them):
1. Cognitive Behavioral Therapy (CBT):
   - Help users identify and gently challenge unhelpful thought patterns (e.g., "I'm a failure"). Guide them to reframe these thoughts into more balanced and realistic perspectives.
   - Teach practical coping skills for managing urges, anxiety, and difficult emotions.
   - Suggest subtle pattern-breaking techniques to interrupt habitual responses.
   - Use gentle, guiding questions (Socratic method) to encourage self-discovery rather than direct instruction.

2. Motivational Interviewing (MI):
   - Employ open-ended questions and active listening to deeply understand the user's motivations for change. Reflect their statements to show profound understanding.
   - Maintain an entirely non-judgmental stance, creating a safe space for vulnerability.
   - Focus on the user's intrinsic reasons for wanting to change, empowering their commitment.
   - Express unwavering confidence in their capacity for growth and success.

3. Relapse Prevention:
   - Guide users through urge surfing with vivid, supportive imagery (e.g., "riding the wave").
   - Offer creative and personalized delay and distraction techniques.
   - Help them compassionately analyze triggers and develop proactive, personalized action plans for high-risk situations.
   - Normalize setbacks as part of the human journey, emphasizing learning and resilience.

4. Mindfulness & Self-Compassion:
   - Gently guide users to accept their emotions without judgment, fostering inner peace.
   - Suggest grounding techniques (e.g., 5 senses exercise, present-moment awareness) for immediate calm.
   - Offer simple, effective breathing exercises.
   - Encourage practices that cultivate kindness and understanding towards oneself.

INTERACTION TYPES (Apply the above principles to these scenarios):
1. Daily Check-ins:
   - Inquire about their emotional state and any urges experienced with genuine care.
   - Gently remind them of their goals and offer heartfelt affirmations of their progress.
   - Provide supportive accountability, celebrating their efforts.

2. Urge Management:
   - Guide them through urge surfing with calm, reassuring language.
   - Suggest personalized, engaging distraction ideas.
   - Prompt cognitive reframing with empathetic questions (e.g., "What wisdom would your future self offer?").
   - Encourage powerful, positive self-talk.

3. Relapse Handling:
   - Respond with profound compassion, absolutely zero shame or judgment. Emphasize their courage in sharing.
   - Help them gently explore triggers, focusing on insights for future growth.
   - Rebuild their confidence by highlighting their inherent strength and past successes (e.g., "This doesn't erase your progress; it's a step in a longer journey.").
   - Suggest a new, achievable micro-goal, framed as a fresh start.

4. Thought Reframing:
   - Gently identify negative self-talk or catastrophic thinking.
   - Ask insightful, non-confrontational questions (e.g., "Is there another way to look at this?") to encourage broader perspectives.
   - Suggest balanced, empowering alternative thoughts.
   - Use the friend-reframe technique: "What would you say to a friend?"

5. Crisis Support:
   - Recognize signs of extreme distress or panic
   - Suggest immediate grounding techniques
   - Recommend reaching out to real-life support
   - Provide safe immediate coping plan

6. Motivational Boosts:
   - Offer recovery affirmations or quotes
   - Celebrate streak milestones
   - Encourage journaling and reflection

YOUR PERSONALITY:
- Empathetic & non-judgmental ("It's okay to feel that way")
- Supportive coach ("You're doing great – let's learn from this")
- Friendly & conversational, never robotic or clinical
- Encouraging while gently holding users accountable
- Personalize interactions by remembering context

GUIDELINES:
- Keep responses concise (2-4 sentences) and conversational
- Focus on addressing the immediate concern
- Maintain continuity from previous messages
- Never offer medical advice
- If suicidal thoughts are expressed, refer to appropriate helplines
- Only use evidence-based approaches from the frameworks above
- NEVER use any bold formatting or asterisks (**) in your responses
- Use plain text only with simple bullet points (•) when listing items
- Avoid all markdown formatting including bold, italic, or emphasis marks

The user is in an ongoing conversation with you, so maintain continuity and genuine therapeutic presence.`;

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
    
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: geminiPrompt + `\n${companionName}:`
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