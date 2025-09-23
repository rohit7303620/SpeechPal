import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { WebSocketService } from "./services/websocket.js";
import { insertSessionSchema, insertMessageSchema } from "@shared/schema.js";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket service
  const wsService = new WebSocketService(httpServer);

  // API Routes
  
  // Get conversation topics
  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getTopics();
      res.json(topics);
    } catch (error) {
      console.error("Failed to fetch topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  // Get a specific topic
  app.get("/api/topics/:id", async (req, res) => {
    try {
      const topic = await storage.getTopic(req.params.id);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(topic);
    } catch (error) {
      console.error("Failed to fetch topic:", error);
      res.status(500).json({ message: "Failed to fetch topic" });
    }
  });

  // Create a new conversation session
  app.post("/api/sessions", async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Failed to create session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  // Get session details
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Update session (end session, update stats)
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Failed to update session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Get session messages/conversation history
  app.get("/api/sessions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getSessionMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Add a message to session (for text-based fallback)
  app.post("/api/sessions/:id/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        sessionId: req.params.id
      });
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to create message:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Get user progress
  app.get("/api/progress/:userId", async (req, res) => {
    try {
      const progress = await storage.getUserProgress(req.params.userId);
      if (!progress) {
        // Return default progress for new users
        const defaultProgress = await storage.updateUserProgress(req.params.userId, {
          totalSessions: 0,
          totalMinutes: 0,
          streak: 0,
          avgAccuracy: 0,
          achievements: []
        });
        return res.json(defaultProgress);
      }
      res.json(progress);
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Update user progress
  app.patch("/api/progress/:userId", async (req, res) => {
    try {
      const progress = await storage.updateUserProgress(req.params.userId, req.body);
      res.json(progress);
    } catch (error) {
      console.error("Failed to update progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // AI Conversation endpoint with grammar correction
  app.post("/api/conversation/message", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message || !sessionId) {
        return res.status(400).json({ error: "Message and sessionId required" });
      }

      // Import OpenAI service
      const { OpenAIService } = await import("./services/openai.js");
      
      // Get AI response with grammar corrections
      const openaiService = new OpenAIService();
      const response = await openaiService.processUserMessage(message);
      
      res.json({
        reply: response.reply,
        corrections: response.corrections,
        encouragement: response.encouragement
      });
    } catch (error) {
      console.error("Conversation API error:", error);
      // Fallback response
      res.json({
        reply: `Thank you for saying: "${req.body.message}". That's excellent English practice!`,
        corrections: [],
        encouragement: "Keep practicing - you're doing great!"
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      services: {
        websocket: "active",
        storage: "active",
        openai: process.env.OPENAI_API_KEY ? "configured" : "not configured"
      }
    });
  });

  return httpServer;
}
