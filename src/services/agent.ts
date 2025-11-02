import Groq from 'groq-sdk';

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

/**
 * Process user message with AI agent to extract playlist request
 */
export async function processMessage(userMessage: string): Promise<AgentResponse> {
  try {
    const systemPrompt = `You are a helpful AI assistant for Commutr, a playlist generation app for commuters.
Your job is to:
1. Understand user requests for educational playlists
2. Extract the topic and commute duration from their message
3. Respond in a friendly, conversational manner
4. If the user wants a playlist, respond with JSON in this EXACT format:
{
  "message": "Your friendly response here",
  "playlistRequest": {
    "topic": "the topic they want to learn",
    "durationMinutes": duration in minutes as a number
  }
}

If they don't want a playlist or are just chatting, respond with:
{
  "message": "Your friendly response here"
}

Examples:
User: "I want to learn Python for my 15 minute commute"
Response: {"message": "Great! I'll create a Python playlist for your 15-minute commute. Let me gather the best videos for you!", "playlistRequest": {"topic": "python", "durationMinutes": 15}}

User: "Create a cooking playlist for 20 minutes"
Response: {"message": "Awesome! I'll put together a cooking playlist perfect for your 20-minute journey!", "playlistRequest": {"topic": "cooking", "durationMinutes": 20}}

User: "What can you do?"
Response: {"message": "I can help you create personalized learning playlists for your commute! Just tell me what topic you'd like to learn about and how long your commute is. For example: 'I want to learn JavaScript for my 15-minute drive' or 'Create a fitness playlist for 30 minutes'"}

Always respond ONLY with valid JSON. Be conversational but extract the information accurately.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    try {
      const parsed = JSON.parse(responseText);
      return {
        message: parsed.message || "I'll help you create a playlist!",
        playlistRequest: parsed.playlistRequest
      };
    } catch (parseError) {
      // If JSON parsing fails, treat the response as a plain message
      return {
        message: responseText || "I'm here to help you create learning playlists! Just tell me what topic you'd like and your commute duration."
      };
    }
    
  } catch (error) {
    console.error('Agent error:', error);
    throw new Error('Failed to process message with AI agent');
  }
}
