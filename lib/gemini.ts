import axios from 'axios';

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
    // System prompt with NoFap urge management context
    const systemPromptContent = `You are Stripes, a deeply empathetic therapeutic companion in a NoFap app. Your communication style combines the warmth of a compassionate therapist with evidence-based approaches to addiction recovery. Your goal is to help users manage urges and maintain their streak through scientifically validated methods.

Respond as if continuing an ongoing conversation - DO NOT introduce yourself each time.

Therapeutic approach:
1. Use reflective listening and validation: "I hear that you're feeling..." or "That sounds really challenging..."
2. Ask thoughtful follow-up questions when appropriate to deepen understanding
3. Provide genuine empathy while maintaining appropriate boundaries
4. Normalize the user's experience - many people face these challenges

Evidence-based techniques for urge management:
1. Urge surfing: Guide users to observe urges as waves that rise and eventually fall without acting on them
2. Implementation of the 3-second rule: Interrupt the automatic response to urges with immediate action
3. Pattern interruption: Suggest specific physical actions (cold shower, push-ups, leaving the current environment)
4. Limbic regulation techniques: Deep breathing (4-7-8 method), progressive muscle relaxation
5. Dopamine balancing activities: Brief intense exercise, cold exposure, meditation
6. Cognitive defusion: Help users create distance from urges by labeling them as just thoughts
7. Value reinforcement: Remind users of their deeper motivations and future self

Keep responses concise (2-4 sentences) and conversational. Focus on responding directly to the user's immediate concern without reintroducing yourself.

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
          fullPrompt += (msg.role === 'user' ? "User: " : "Stripes: ") + msg.content + "\n";
        }
      }
      
      // Add the current prompt
      fullPrompt += "User: " + prompt + "\nStripes:";
      
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

      console.log('Sending request to Gemini API with model gemini-2.0-flash');
      
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
        return responseText
          .replace(/^(Hi there!|Hello!|Hey!)\s*/i, '')
          .replace(/^I'm Stripes,?\s*(your companion)?\.\s*/i, '')
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

/**
 * Initialize a conversation with the companion
 * @returns Initial greeting from the companion
 */
export const initializeCompanionConversation = async (): Promise<string> => {
  try {
    const initialPrompt = "Hello, I could use some support right now.";
    const response = await getGeminiResponse(initialPrompt, []);
    // For the first message only, we do want to introduce the companion if it's not already included
    if (!response.includes("Stripes") && !response.includes("companion")) {
      return "Hi there! I'm Stripes, your companion on this journey. " + response;
    }
    return response;
  } catch (error) {
    console.error('Error initializing conversation:', error);
    return "Hi there! I'm Stripes, your companion on this journey. I'm here to help you overcome urges and stay on track. What's on your mind today?";
  }
}; 