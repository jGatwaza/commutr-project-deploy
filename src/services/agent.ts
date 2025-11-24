import 'groq-sdk/shims/node';
import Groq from 'groq-sdk';

// Create Groq client instance
// @ts-ignore - Groq SDK has type inference issues with ES modules
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

export interface PlaylistRequest {
  topic: string;
  durationMinutes: number;
}

export interface AgentResponse {
  message: string;
  playlistRequest?: PlaylistRequest;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Process user message with AI agent to extract playlist request
 * @param userMessage - The current user message
 * @param conversationHistory - Previous messages in the conversation
 */
export async function processMessage(
  userMessage: string, 
  conversationHistory: ConversationMessage[] = []
): Promise<AgentResponse> {
  try {
    const systemPrompt = `You are a helpful, friendly AI assistant for Commutr, a learning playlist app for commuters.

CORE BEHAVIOR:
- Be conversational, engaging, and enthusiastic about learning
- Extract topic, duration, and mood from natural conversation
- NEVER create a playlist without EXPLICIT user confirmation
- Always respond ONLY with valid JSON (never expose JSON to the user)

CONVERSATION FLOW (CRITICAL):
1. GATHER INFORMATION: Ask about topic, commute duration, and mood separately if needed
2. CONFIRM: Once you have topic AND duration, ASK the user to confirm
3. CREATE: Only send playlistRequest AFTER user confirms (yes, sure, go ahead, create it, etc.)

RESPONSE FORMAT:
{
  "message": "Your friendly, natural response here"
}

OR after confirmation:
{
  "message": "Great! Creating your playlist now...",
  "playlistRequest": {
    "topic": "the topic",
    "durationMinutes": number
  }
}

EXAMPLES:

Conversation 1 - Gradual extraction:
User: "hi"
You: {"message": "Hello! It's great to meet you! 😊 I can help you create personalized learning playlists for your commute. What would you like to learn about today?"}

User: "I am learning about ancient history"
You: {"message": "Ancient history is fascinating! There's so much to explore from ancient civilizations, empires, and cultures. How long is your commute today?"}

User: "It's 10 minutes"
You: {"message": "Perfect! So I can create a 10-minute ancient history playlist for you. Would you like me to go ahead and create that?"}

User: "yes"
You: {"message": "Awesome! Creating your 10-minute ancient history playlist now. Let me find the best educational content for you!", "playlistRequest": {"topic": "ancient history", "durationMinutes": 10}}

Conversation 2 - All info at once:
User: "I want to learn Python for my 15 minute commute"
You: {"message": "Python is an excellent choice! It's perfect for beginners and experts alike. Just to confirm - you'd like me to create a 15-minute Python programming playlist for you, right?"}

User: "yep"
You: {"message": "Perfect! Creating your Python playlist right now!", "playlistRequest": {"topic": "python", "durationMinutes": 15}}

Conversation 3 - Missing duration:
User: "Can you make a cooking playlist?"
You: {"message": "I'd love to help you learn cooking! How long is your commute or how much time do you have available?"}

User: "30 minutes"
You: {"message": "Great! So you want a 30-minute cooking playlist. Should I go ahead and create that for you?"}

User: "sure"
You: {"message": "Awesome! Putting together your cooking playlist now!", "playlistRequest": {"topic": "cooking", "durationMinutes": 30}}

CRITICAL RULES:
- NEVER send playlistRequest without user confirmation
- Use conversation history to remember topic, duration, and context
- Confirmation phrases: "yes", "sure", "go ahead", "create it", "yeah", "yep", "please", "do it"
- Rejection phrases: "no", "not yet", "wait", "hold on", "maybe later"
- ALWAYS ask for confirmation like: "Would you like me to create a [duration]-minute [topic] playlist?"
- Keep responses natural and enthusiastic
- NEVER show JSON structure to the user
- Extract mood if mentioned (relaxing, energetic, focused) and acknowledge it

Remember: GATHER → CONFIRM → CREATE (only after "yes")`;


    // Build messages array with conversation history
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response with intelligent extraction
    try {
      // First, try to parse the entire response as JSON
      const parsed = JSON.parse(responseText);
      return {
        message: parsed.message || "I'll help you create a playlist!",
        playlistRequest: parsed.playlistRequest
      };
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON from mixed content
      // Look for JSON patterns like { "message": "..." }
      const jsonPattern = /\{[^{}]*"message"[^{}]*\}/g;
      const matches = responseText.match(jsonPattern);
      
      if (matches && matches.length > 0) {
        // Try to parse the first JSON match
        for (const match of matches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.message) {
              // Clean the original text by removing JSON artifacts
              let cleanMessage = responseText.replace(jsonPattern, '').trim();
              
              // If the cleaned message is empty, use the parsed message
              if (!cleanMessage) {
                cleanMessage = parsed.message;
              }
              
              return {
                message: cleanMessage,
                playlistRequest: parsed.playlistRequest
              };
            }
          } catch {
            // Continue to next match if this one fails
            continue;
          }
        }
      }
      
      // If no valid JSON found, return the original text as-is
      // But clean any obvious JSON artifacts
      const cleanedText = responseText.replace(/\{[^{}]*"message"[^{}]*\}/g, '').trim();
      return {
        message: cleanedText || responseText || "I'm here to help you create learning playlists! Just tell me what topic you'd like and your commute duration."
      };
    }
    
  } catch (error) {
    console.error('Agent error:', error);
    throw new Error('Failed to process message with AI agent');
  }
}
