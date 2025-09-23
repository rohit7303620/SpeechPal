import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type WSMessage, wsMessageSchema } from '@shared/schema';
import { openaiService } from './openai.js';
import { storage } from '../storage.js';

export class WebSocketService {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocket> = new Map();
  private sessions: Map<string, string> = new Map(); // websocket id -> session id

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false 
    });

    this.wss.on('connection', (ws) => {
      const connectionId = this.generateConnectionId();
      this.connections.set(connectionId, ws);

      console.log(`WebSocket connected: ${connectionId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          await this.handleMessage(connectionId, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected: ${connectionId}`);
        this.connections.delete(connectionId);
        this.sessions.delete(connectionId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.connections.delete(connectionId);
        this.sessions.delete(connectionId);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'session_update',
        payload: { 
          status: 'connected',
          message: 'Welcome to SpeakEasy! Ready to practice English?'
        }
      });
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleMessage(connectionId: string, message: WSMessage) {
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      switch (message.type) {
        case 'audio_start':
          await this.handleAudioStart(connectionId, message);
          break;
        
        case 'audio_chunk':
          await this.handleAudioChunk(connectionId, message);
          break;
        
        case 'audio_end':
          await this.handleAudioEnd(connectionId, message);
          break;
        
        case 'text_message':
          await this.handleTextMessage(connectionId, message);
          break;
        
        default:
          this.sendError(ws, 'Unknown message type');
      }
    } catch (error) {
      console.error('Message handling error:', error);
      this.sendError(ws, 'Failed to process message');
    }
  }

  private async handleAudioStart(connectionId: string, message: WSMessage) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    // Initialize or get session
    let sessionId = this.sessions.get(connectionId);
    if (!sessionId) {
      const session = await storage.createSession({
        userId: 'guest', // For now, using guest user
        durationMinutes: 0,
        messagesCount: 0,
        correctionsCount: 0,
        accuracyScore: 0,
        topicId: message.payload?.topicId,
        isActive: true,
      });
      sessionId = session.id;
      this.sessions.set(connectionId, sessionId);
    }

    this.sendMessage(ws, {
      type: 'session_update',
      payload: { 
        status: 'recording',
        sessionId,
        message: 'I\'m listening! Speak naturally.'
      }
    });
  }

  private async handleAudioChunk(connectionId: string, message: WSMessage) {
    // For now, we'll collect audio chunks and process them when complete
    // In a full implementation, this would stream to OpenAI Realtime API
    console.log(`Received audio chunk from ${connectionId}`);
  }

  private async handleAudioEnd(connectionId: string, message: WSMessage) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    const sessionId = this.sessions.get(connectionId);
    if (!sessionId) return;

    // Simulate speech-to-text conversion
    // In real implementation, this would use the audio data
    const transcribedText = message.payload?.transcribedText || "I want to practice my English speaking skills.";

    await this.processUserInput(connectionId, sessionId, transcribedText, message.payload?.topicId);
  }

  private async handleTextMessage(connectionId: string, message: WSMessage) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    let sessionId = this.sessions.get(connectionId);
    if (!sessionId) {
      const session = await storage.createSession({
        userId: 'guest',
        durationMinutes: 0,
        messagesCount: 0,
        correctionsCount: 0,
        accuracyScore: 0,
        topicId: message.payload?.topicId,
        isActive: true,
      });
      sessionId = session.id;
      this.sessions.set(connectionId, sessionId);
    }

    await this.processUserInput(connectionId, sessionId, message.payload.text, message.payload?.topicId);
  }

  private async processUserInput(connectionId: string, sessionId: string, userText: string, topicId?: string) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    try {
      // Save user message
      await storage.createMessage({
        sessionId,
        type: 'user',
        content: userText,
        audioUrl: null,
        corrections: null,
        metadata: { topicId }
      });

      // Process with OpenAI
      const response = await openaiService.processUserMessage(userText, topicId);

      // Save bot response
      await storage.createMessage({
        sessionId,
        type: 'bot',
        content: response.reply,
        audioUrl: null,
        corrections: response.corrections,
        metadata: { 
          encouragement: response.encouragement,
          nextPrompt: response.nextPrompt 
        }
      });

      // Update session stats
      const session = await storage.getSession(sessionId);
      if (session) {
        await storage.updateSession(sessionId, {
          messagesCount: (session.messagesCount || 0) + 2,
          correctionsCount: (session.correctionsCount || 0) + response.corrections.length,
          accuracyScore: this.calculateAccuracy(response.corrections.length, userText.split(' ').length)
        });
      }

      // Send response to client
      this.sendMessage(ws, {
        type: 'text_message',
        sessionId,
        payload: {
          type: 'bot',
          content: response.reply,
          corrections: response.corrections,
          encouragement: response.encouragement,
          nextPrompt: response.nextPrompt,
          timestamp: new Date().toISOString()
        }
      });

      // Send corrections if any
      if (response.corrections.length > 0) {
        this.sendMessage(ws, {
          type: 'correction',
          sessionId,
          payload: {
            corrections: response.corrections,
            encouragement: response.encouragement
          }
        });
      }

    } catch (error) {
      console.error('Processing error:', error);
      this.sendError(ws, 'Failed to process your message. Please try again.');
    }
  }

  private calculateAccuracy(corrections: number, wordCount: number): number {
    if (wordCount === 0) return 100;
    const errorRate = corrections / wordCount;
    return Math.max(0, Math.min(100, Math.round((1 - errorRate) * 100)));
  }

  private sendMessage(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, errorMessage: string) {
    this.sendMessage(ws, {
      type: 'session_update',
      payload: {
        status: 'error',
        message: errorMessage
      }
    });
  }

  // Method to broadcast to all connections (if needed)
  broadcast(message: WSMessage) {
    this.connections.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }
}
