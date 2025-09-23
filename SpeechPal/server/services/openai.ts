import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'pronunciation' | 'vocabulary' | 'fluency';
}

export interface ConversationResponse {
  reply: string;
  corrections: GrammarCorrection[];
  encouragement: string;
  nextPrompt?: string;
}

export class OpenAIService {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor() {
    // Initialize with system message for English learning bot personality
    this.conversationHistory.push({
      role: 'assistant',
      content: `You are a friendly English conversation practice bot. Your goal is to help users improve their English speaking skills through natural conversation. 

Guidelines:
- Be encouraging and supportive
- Provide gentle grammar corrections when needed
- Use humor appropriately to keep the mood light
- Ask follow-up questions to keep conversations flowing
- Adapt your language level to match the user's proficiency
- Focus on practical, everyday English usage
- Celebrate improvements and progress

When you notice mistakes:
- Correct them in a friendly, non-judgmental way
- Explain the correction briefly
- Continue the conversation naturally
- Use phrases like "Great point! Just a quick tip..." or "I love your enthusiasm! One small suggestion..."

Keep responses conversational and engaging while being educational.`
    });
  }

  async processUserMessage(userText: string, topicId?: string): Promise<ConversationResponse> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userText
      });

      // Analyze for grammar corrections first
      const corrections = await this.analyzeGrammar(userText);

      // Generate conversational response
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a friendly English practice bot. The user just said: "${userText}". 
            ${corrections.length > 0 ? `You've identified these corrections: ${JSON.stringify(corrections)}. ` : ''}
            
            Respond naturally and conversationally. If there are corrections, mention them gently and encouragingly. 
            Then continue the conversation with a follow-up question or comment.
            
            Keep your response under 150 words and maintain a supportive, friendly tone.`
          },
          ...this.conversationHistory.slice(-10) // Keep last 10 messages for context
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const reply = response.choices[0].message.content || "";
      
      // Add bot response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: reply
      });

      // Generate encouragement
      const encouragement = await this.generateEncouragement(userText, corrections);

      return {
        reply,
        corrections,
        encouragement,
        nextPrompt: await this.suggestNextPrompt(topicId)
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to process message with AI');
    }
  }

  private async analyzeGrammar(text: string): Promise<GrammarCorrection[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `Analyze the following text for grammar, vocabulary, and fluency issues. 
            Return a JSON array of corrections with this format:
            [
              {
                "original": "incorrect phrase",
                "corrected": "correct phrase", 
                "explanation": "brief friendly explanation",
                "type": "grammar|pronunciation|vocabulary|fluency"
              }
            ]
            
            Only include significant corrections that would help improve English proficiency. 
            Ignore minor stylistic preferences. If no corrections are needed, return empty array.`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"corrections": []}');
      return result.corrections || [];
    } catch (error) {
      console.error('Grammar analysis error:', error);
      return [];
    }
  }

  private async generateEncouragement(userText: string, corrections: GrammarCorrection[]): Promise<string> {
    const encouragements = [
      "Great job practicing! Keep it up! 🌟",
      "You're doing wonderfully! I can see your confidence growing! 💪",
      "Excellent effort! Every conversation makes you better! 🎉",
      "Love your enthusiasm for learning! 🚀",
      "You're making fantastic progress! 👏",
      "Keep up the amazing work! You're getting more fluent! ✨"
    ];

    if (corrections.length === 0) {
      return "Perfect! Your English is spot on! " + encouragements[Math.floor(Math.random() * encouragements.length)];
    } else if (corrections.length <= 2) {
      return "Almost perfect! Just small tweaks! " + encouragements[Math.floor(Math.random() * encouragements.length)];
    } else {
      return "Good effort! We're learning together! " + encouragements[Math.floor(Math.random() * encouragements.length)];
    }
  }

  private async suggestNextPrompt(topicId?: string): Promise<string | undefined> {
    if (!topicId) return undefined;

    const prompts = {
      'daily-routines': [
        "What's your favorite part of the day?",
        "How has your routine changed recently?",
        "What would you like to add to your daily routine?"
      ],
      'travel': [
        "What type of traveler are you - adventurous or relaxed?",
        "How do you usually plan your trips?",
        "What's the most interesting person you've met while traveling?"
      ],
      'hobbies': [
        "How much time do you spend on your hobbies each week?",
        "Have you ever taught someone else your hobby?",
        "What tools or equipment do you need for your hobby?"
      ],
      'food-cooking': [
        "What's the most challenging dish you've ever tried to make?",
        "Do you have any family recipes?",
        "What's your go-to comfort food?"
      ],
      'books-movies': [
        "What genre do you usually prefer and why?",
        "Do you like to discuss stories with friends?",
        "What makes a story memorable for you?"
      ]
    };

    const topicPrompts = prompts[topicId as keyof typeof prompts];
    if (topicPrompts) {
      return topicPrompts[Math.floor(Math.random() * topicPrompts.length)];
    }

    return undefined;
  }

  // For real-time API integration (future enhancement)
  async createRealtimeSession(): Promise<string> {
    // This would integrate with OpenAI's Realtime API
    // For now, return a session ID for WebSocket handling
    return `realtime_${Date.now()}`;
  }

  clearHistory(): void {
    this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep system message
  }
}

export const openaiService = new OpenAIService();
