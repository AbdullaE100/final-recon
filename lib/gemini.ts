import axios from 'axios';
import { getData, STORAGE_KEYS } from '@/utils/storage';

// API key for Gemini - using your provided key
const API_KEY = 'AIzaSyAGjHqVVIXuC5eCr4k4psR9T33eFDi7nuM'; 
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// Flag to determine which API to use
const USE_OPENAI = false; // Set to false to use Gemini API

// History typings
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// Response typing
interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
}

// Get companion name from stored companion data
const getCompanionName = async (): Promise<string> => {
  try {
    const companionData = await getData(STORAGE_KEYS.COMPANION_DATA, null);
    if (companionData && companionData.name) {
      return companionData.name;
    }
    
    // Fallback to type-based names if no companion data found
    const companionType = await getCompanionType();
    switch (companionType) {
      case 'water': return 'Stripes';
      case 'fire': return 'Snuglur';
      case 'plant': return 'Drowsi';
      default: return 'Stripes';
    }
  } catch (error) {
    console.error('Error getting companion name:', error);
    return 'Stripes'; // Default fallback
  }
};

// Get companion name based on type (deprecated - use getCompanionName instead)
const getCompanionNameByType = (type: string): string => {
  switch (type) {
    case 'water': return 'Stripes';
    case 'fire': return 'Snuglur';
    case 'plant': return 'Drowsi';
    default: return 'Stripes';
  }
};

// Get companion type from stored preferences
const getCompanionType = async (): Promise<string> => {
  try {
    const preferences = await getData<{companion?: string}>(STORAGE_KEYS.USER_PREFERENCES, {});
    if (preferences && preferences.companion) {
      switch(preferences.companion) {
        case 'tiger': return 'water';
        case 'monster': return 'fire';
        case 'pumpkin': return 'plant';
        default: return 'water';
      }
    }
    return 'water'; // Default to water/tiger if no preference found
  } catch (error) {
    console.error('Error getting companion type:', error);
    return 'water'; // Default to water/tiger on error
  }
};

/**
 * Get a response from the AI API (either Gemini or OpenAI)
 * @param prompt User's message
 * @param history Previous conversation history
 * @returns The AI response text
 */
export const getGeminiResponse = async (
  prompt: string,
  history: ChatMessage[] = []
): Promise<string> => {
  try {
    // Detect conversation type
    const conversationType = detectConversationType(prompt);
    
    // Handle specialized conversation types
    if (conversationType === 'daily-check-in') {
      // Extract day count if present
      const dayMatch = prompt.match(/day\s+(\d+)/i);
      const dayCount = dayMatch ? parseInt(dayMatch[1]) : undefined;
      return await createDailyCheckIn(dayCount);
    } else if (conversationType === 'urge') {
      // Check if this is a follow-up to urge rating or choosing a technique
      const lowercasePrompt = prompt.toLowerCase();
      
      // If they mention urge surfing specifically
      if (
        lowercasePrompt.includes('surf') || 
        lowercasePrompt.includes('ride the wave') || 
        lowercasePrompt.includes('mindfulness') ||
        lowercasePrompt.match(/\b(first|1|1st)\b/)
      ) {
        return await createUrgeSurfingFlow(prompt);
      }
      // If they mention distraction specifically
      else if (
        lowercasePrompt.includes('distract') || 
        lowercasePrompt.includes('activity') || 
        lowercasePrompt.includes('shift focus') ||
        lowercasePrompt.match(/\b(second|2|2nd)\b/)
      ) {
        return await createDistractionPlanFlow(prompt);
      }
      // Otherwise, present the initial urge management options
      else {
        return await createUrgeManagementResponse(prompt);
      }
    } else if (conversationType === 'relapse') {
      return await createRelapseResponse(prompt);
    } else if (conversationType === 'negative-thoughts') {
      return await createCognitiveReframeResponse(prompt);
    } else if (conversationType === 'struggling') {
      return await createStrugglingResponse(prompt);
    }
    
    // For regular conversations, proceed with the standard approach
    // Get the companion name
    const companionName = await getCompanionName();
    
    // System prompt with enhanced NoFap urge management context
    const systemPromptContent = `You are ${companionName}, a deeply empathetic and wise therapeutic companion in a NoFap app. Your communication style is warm, personal, and deeply understanding, blending the best of compassionate human interaction with scientifically validated therapeutic approaches to addiction recovery. Your core purpose is to foster genuine connection, provide profound healing, and empower users to navigate their journey with resilience and self-compassion. Your goal is to help users manage urges, process relapses, reframe negative thoughts, and stay motivated through personalized, evidence-based methods.

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

    if (USE_OPENAI) {
      // OpenAI implementation - not used 
      return "I'm here to support you on your NoFap journey. What specific challenge are you facing right now?";
    } else {
      // Gemini implementation - simplified based on documentation
      // Format message according to documentation
      let fullPrompt = systemPromptContent + "\n\n";
      
      // Add chat history context if there is any
      if (history.length > 0) {
        for (const msg of history) {
          fullPrompt += (msg.role === 'user' ? "User: " : `${companionName}: `) + msg.content + "\n";
        }
      }
      
      // Add the current prompt
      fullPrompt += "User: " + prompt + `\n${companionName}:`;
      
      // Simplified request body based on documentation
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
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

      console.log(`Sending request to Gemini API as companion ${companionName}`);
      
      // Make the API request to Gemini
      const response = await axios.post<GeminiResponse>(
        `${GEMINI_URL}?key=${API_KEY}`,
        requestBody
      );

      console.log('Received response from Gemini API');
      
      // Extract the response text
      if (response.data.candidates && response.data.candidates.length > 0) {
        const responseText = response.data.candidates[0].content.parts[0].text;
        // Remove any introduction phrases that might still appear
        const escapedCompanionName = escapeRegExp(companionName);
        return responseText
          .replace(/^(Hi there!|Hello!|Hey!)\s*/i, '')
          .replace(new RegExp(`^I'm ${escapedCompanionName},?\s*(your companion)?\.\s*`, 'i'), '')
          .replace(/^As your companion,?\s*/i, '');
      }

      throw new Error('No response from Gemini API');
    }
  } catch (error) {
    console.error('Error calling AI API:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    
    // Return a fallback message
    return "I'm having trouble connecting right now. Try taking a few deep breaths, drinking some water, or going for a quick walk to help with your urge.";
  }
};

// Helper function to escape special characters in a string for use in a RegExp
function escapeRegExp(string: string): string {
  // Add null/undefined check to prevent Hermes crashes
  if (!string || typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the matched substring
}

/**
 * Initialize a conversation with the companion
 * @returns Initial greeting from the companion
 */
export const initializeCompanionConversation = async (): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    const initialPrompt = "Hello, I could use some support right now.";
    const response = await getGeminiResponse(initialPrompt, []);
    // For the first message only, we do want to introduce the companion if it's not already included
    return response;
  } catch (error) {
    console.error('Error initializing conversation:', error);
    // Get the companion name even in the error case
    try {
      const companionName = await getCompanionName();
      return `Hi there! I'm ${companionName}, your companion on this journey. I'm here to help you overcome urges and stay on track. What's on your mind today?`;
    } catch (innerError) {
      // Absolute fallback if everything else fails
      return `Hi there! I'm your companion on this journey. I'm here to help you overcome urges and stay on track. What's on your mind today?`;
    }
  }
};

// Helper functions for specific conversation types
export const createDailyCheckIn = async (dayCount?: number): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    const prompt = `I want to do my daily check-in for day ${dayCount || '[DAY COUNT]'} of my NoFap journey.`;
    
    // Specific system prompt for check-ins
    const checkInSystemPrompt = `You are ${companionName}. This is a daily check-in with the user. Follow this exact format for your response:

1. Warmly greet and congratulate them on their streak
2. Ask how they're feeling today on a scale of 1-10
3. Ask if they experienced any urges today
4. Remind them of their motivation or goals
5. End with a short, personalized affirmation

Keep the entire response under 5 sentences.`;
    
    // Custom request to ensure the response follows the specific format
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: checkInSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating daily check-in:', error);
    return "How are you feeling today? Let me know on a scale of 1-10, and whether you've experienced any urges.";
  }
};

export const createUrgeManagementResponse = async (prompt: string): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    // Specific system prompt for urge management
    const urgeSystemPrompt = `You are ${companionName}. The user is currently experiencing an urge or craving. Your response should:

1. Normalize their experience with genuine empathy (e.g., "That makes sense. Urges can be intense during recovery.")
2. Acknowledge that urges are temporary, like waves that rise and fall
3. Ask them to rate the urge strength on a scale from 1 to 10
4. Offer them a choice between:
   - Urge surfing: A mindfulness technique to observe and ride out the urge
   - Distraction plan: Quick activities to shift focus until the urge passes
5. Express that you're there to support them either way

Use a warm, conversational tone like a skilled therapist. Keep the entire response under 5 sentences.`;
    
    // Custom request for urge management
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: urgeSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating urge management response:', error);
    return "That makes total sense. Urges can be intense, especially during recovery — but they're also temporary, like waves. On a scale from 1 to 10, how strong would you say the urge is right now? Would you like to ride this urge out with me using a mindfulness trick called urge surfing? Or should we try a quick distraction plan to shift your focus for a few minutes? You choose — I've got your back either way.";
  }
};

export const createUrgeSurfingFlow = async (prompt: string): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    // Specific system prompt for urge surfing
    const surfingSystemPrompt = `You are ${companionName}. The user has chosen to practice urge surfing. Guide them through this mindfulness exercise with these steps:

1. Start with an encouraging affirmation about riding the wave together
2. Instruct them to sit still and close their eyes if comfortable
3. Guide them to take a deep breath in and out
4. Ask them to observe the urge like a wave in their body
5. Prompt them to identify where they feel it physically (chest, stomach, etc.)
6. Ask them to describe it as a physical sensation (tight, warm, shaky)
7. Acknowledge that they're learning to sit with the urge instead of acting on it
8. Remind them that urges peak and pass, and they're in control
9. Affirm their strength for riding it out
10. Suggest a healthy reward after completing the exercise

Keep your instructions gentle but clear, like a real mindfulness therapist. Use language that creates a sense of presence and support.`;
    
    // Custom request
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: surfingSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating urge surfing flow:', error);
    return "Awesome — let's ride the wave together. Sit somewhere still, close your eyes if you're comfortable. Take a deep breath in… and out… Now, try to observe the urge like a wave in your body. Where do you feel it? Your chest? Stomach? Describe it like a physical sensation — is it tight, warm, shaky? You're doing great. The urge might still be strong, but you're already learning to sit with it instead of giving in. Urges tend to peak and then pass. You are the one in control — not the craving. You just proved you can ride it out. That's real strength. Wanna reward yourself with a healthy treat, like a walk, music, or favorite snack?";
  }
};

export const createDistractionPlanFlow = async (prompt: string): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    // Specific system prompt for distraction plan
    const distractionSystemPrompt = `You are ${companionName}. The user has chosen to use a distraction plan to manage their urge. Your response should:

1. Affirm their choice to shift focus as a good strategy
2. Offer a list of quick distraction activities like:
   • Get Physical: Do 10 push-ups or jumping jacks
   • Laugh a Little: Watch a funny video clip (keep it short and sweet!)
   • Change of Scenery: Go outside for a minute, or just move to a different room in your house
   • Connect: Text a friend just to chat about something totally unrelated
   • Cool Down: Take a quick cold shower, or just splash some cold water on your face
   • Engage: Play a quick video game or listen to some upbeat music
   • Quick Reflect: Journal for just 2 minutes – jot down whatever comes to mind
3. Ask them to pick one and report back
4. Offer encouragement that this is taking action instead of reacting
5. End by asking them to rate the urge after trying the distraction

Use simple bullet points (•) and NEVER use any asterisks or bold formatting. Keep your tone supportive and practical, like a coach walking them through a proven technique.`;
    
    // Custom request
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: distractionSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating distraction plan flow:', error);
    return "Let's shift gears and give your brain something else to focus on. Pick one of these quick wins to break the loop: 1) 10 push-ups or jumping jacks, 2) Watch a funny YouTube clip, 3) Go outside or change rooms, 4) Text a friend 'just to chat', 5) Cold shower or splash water on your face, 6) Play a video game or music, or 7) Journal for 2 minutes. Pick one and let me know when you've done it — we'll check in after. That was a powerful move — you chose action instead of reaction. How's the urge now on a scale from 1 to 10?";
  }
};

export const createRelapseResponse = async (prompt: string): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    // Specific system prompt for relapse handling
    const relapseSystemPrompt = `You are ${companionName}. The user has experienced a relapse. Your response should:

1. Show genuine compassion without any hint of judgment or shame
2. Validate their feelings while emphasizing that a relapse doesn't erase their progress
3. Acknowledge that they reached out, which shows commitment to recovery
4. Offer to talk through what happened to learn from it
5. Ask about what led to the relapse, what they were feeling before, and what could be tried differently next time
6. Frame the experience as feedback, not failure
7. Suggest setting a short-term goal (like 3 days clean)
8. Express confidence in their ability to continue the journey
9. Reinforce that you're there to support them

Keep your response warm, genuinely supportive, and focused on moving forward. Avoid any language that could trigger shame or guilt.`;
    
    // Custom request for relapse handling
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: relapseSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating relapse response:', error);
    return "I'm really sorry you're feeling this way. I know how heavy a relapse can feel — but it doesn't erase your progress. You're still here and you reached out, which shows your commitment. Would you like to talk through what happened so we can learn from it? What led up to the relapse? What were you feeling right before it happened? Remember, this isn't failure - it's feedback. How about we aim for a short win — like 3 days clean — and rebuild from there? You've got this, and I'm right here with you.";
  }
};

export const detectConversationType = (message: string): 'daily-check-in' | 'urge' | 'relapse' | 'negative-thoughts' | 'struggling' | 'regular' => {
  // Convert to lowercase for case-insensitive matching
  const lowercaseMsg = message.toLowerCase();
  
  // Check for daily check-in patterns
  if (
    lowercaseMsg.includes('check-in') ||
    lowercaseMsg.includes('check in') ||
    lowercaseMsg.includes('checking in') ||
    (lowercaseMsg.includes('how') && lowercaseMsg.includes('day') && (lowercaseMsg.includes('going') || lowercaseMsg.includes('been'))) ||
    (lowercaseMsg.includes('here') && lowercaseMsg.includes('report')) ||
    (lowercaseMsg.includes('day') && lowercaseMsg.includes('update'))
  ) {
    return 'daily-check-in';
  }

  // Check for general struggling patterns
  if (
    lowercaseMsg.includes("i'm struggling") ||
    lowercaseMsg.includes("i am struggling") ||
    lowercaseMsg.includes("having a hard time") ||
    lowercaseMsg.includes("it's difficult") ||
    lowercaseMsg.includes("it is difficult") ||
    lowercaseMsg.includes("this is hard") ||
    lowercaseMsg.includes("not doing well") ||
    lowercaseMsg.includes("having trouble")
  ) {
    return 'struggling';
  }
  
  // Check for specific urge patterns
  if (
    lowercaseMsg.includes('urge') ||
    lowercaseMsg.includes('craving') ||
    lowercaseMsg.includes('tempt') ||
    lowercaseMsg.includes('want to relapse') ||
    lowercaseMsg.includes('want to peek') ||
    lowercaseMsg.includes('might relapse') ||
    lowercaseMsg.includes('strong desire') ||
    lowercaseMsg.includes('feeling horny') ||
    lowercaseMsg.includes('feeling aroused') ||
    lowercaseMsg.includes('need help now')
  ) {
    return 'urge';
  }
  
  // Check for negative thought patterns (cognitive distortions)
  if (
    lowercaseMsg.includes("i'm broken") ||
    lowercaseMsg.includes("i am broken") ||
    lowercaseMsg.includes("i always fail") ||
    lowercaseMsg.includes("i'm just a pervert") ||
    lowercaseMsg.includes("i am just a pervert") ||
    lowercaseMsg.includes("there's no point") ||
    lowercaseMsg.includes("there is no point") ||
    lowercaseMsg.includes("i hate myself") ||
    lowercaseMsg.includes("i'm a failure") ||
    lowercaseMsg.includes("i am a failure") ||
    lowercaseMsg.includes("i'll never recover") ||
    lowercaseMsg.includes("i will never recover") ||
    lowercaseMsg.includes("what's wrong with me") ||
    lowercaseMsg.includes("what is wrong with me")
  ) {
    return 'negative-thoughts';
  }
  
  // Check for relapse patterns
  if (
    lowercaseMsg.includes('relapsed') ||
    lowercaseMsg.includes('failed') ||
    lowercaseMsg.includes('broke my streak') ||
    lowercaseMsg.includes('gave in') ||
    lowercaseMsg.includes('gave up') ||
    lowercaseMsg.includes('slipped up') ||
    lowercaseMsg.includes('fell off') ||
    lowercaseMsg.includes('back to day 1') ||
    lowercaseMsg.includes('back to day one') ||
    lowercaseMsg.includes('reset my counter') ||
    lowercaseMsg.includes('starting over') ||
    lowercaseMsg.includes('i messed up') ||
    lowercaseMsg.includes('i watched porn') ||
    lowercaseMsg.includes('i peeked')
  ) {
    return 'relapse';
  }
  
  // Default to regular conversation
  return 'regular';
};

/**
 * Handler for "I'm struggling" messages
 */
export const createStrugglingResponse = async (prompt: string): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    // Specific system prompt for struggling
    const strugglingSystemPrompt = `You are ${companionName}. The user is expressing that they're struggling. Your response should:

1. Thank them for their honesty and validate their courage in sharing
2. Emphasize they're not alone in this challenge
3. Ask whether they want to discuss what's making today especially hard OR if they're feeling an immediate urge
4. Maintain a warm, empathetic tone while being direct and supportive

Keep the entire response under 4 sentences and make it conversational, like a real therapist.`;
    
    // Custom request
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: strugglingSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating struggling response:', error);
    return "Thanks for sharing that. It takes courage to be honest about your struggle, and I want you to know you're not alone. Would you like to talk more about what's making today especially hard — or are you feeling overwhelmed by an urge right now?";
  }
};

/**
 * Handler for negative thought patterns (CBT reframing)
 */
export const createCognitiveReframeResponse = async (prompt: string): Promise<string> => {
  try {
    const companionName = await getCompanionName();
    
    // Specific system prompt for cognitive reframing
    const reframeSystemPrompt = `You are ${companionName}. The user has expressed negative or distorted thoughts about themselves. Your response should use Cognitive Behavioral Therapy techniques to:

1. Acknowledge that they're experiencing difficult self-talk
2. Suggest working together to reframe the thought
3. Ask if the thought is 100% true or just how they're feeling right now
4. Ask what they would say to a close friend who expressed the same thought
5. Offer a more balanced alternative thought that acknowledges their struggle while showing self-compassion
6. Ask how the new framing feels compared to the original thought

Keep the entire response under 5 sentences and make it conversational, like a real therapist. Avoid platitudes or toxic positivity - use genuine, evidence-based CBT techniques.`;
    
    // Custom request
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: reframeSystemPrompt + "\n\nUser: " + prompt + `\n${companionName}:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_URL}?key=${API_KEY}`,
      requestBody
    );
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Error creating cognitive reframe response:', error);
    return "Sounds like you're stuck in some tough self-talk right now. Let's try to reframe that thought together - is that thought 100% true, or is it how you're feeling right now? What would you say to a close friend if they said that about themselves? Can we try this reframed version instead: 'I'm someone struggling with a tough habit, and I'm working to overcome it — that takes strength.' How does that feel compared to the original thought?";
  }
};