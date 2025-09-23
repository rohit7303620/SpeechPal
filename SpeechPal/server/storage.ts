import { type Session, type InsertSession, type Message, type InsertMessage, type ConversationTopic, type InsertTopic, type UserProgress, type InsertProgress } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Session management
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  
  // Message management
  createMessage(message: InsertMessage): Promise<Message>;
  getSessionMessages(sessionId: string): Promise<Message[]>;
  
  // Topics
  getTopics(): Promise<ConversationTopic[]>;
  getTopic(id: string): Promise<ConversationTopic | undefined>;
  
  // Progress tracking
  getUserProgress(userId: string): Promise<UserProgress | undefined>;
  updateUserProgress(userId: string, progress: Partial<UserProgress>): Promise<UserProgress>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private messages: Map<string, Message>;
  private topics: Map<string, ConversationTopic>;
  private userProgress: Map<string, UserProgress>;

  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.topics = new Map();
    this.userProgress = new Map();
    
    // Initialize default topics
    this.initializeDefaultTopics();
  }

  private initializeDefaultTopics() {
    const defaultTopics: ConversationTopic[] = [
      {
        id: "daily-routines",
        title: "Daily Routines & Habits",
        description: "Talk about your daily life and habits",
        icon: "fas fa-coffee",
        difficulty: "beginner",
        prompts: [
          "What does your typical morning routine look like?",
          "How do you usually spend your weekends?",
          "What healthy habits are you trying to develop?"
        ],
        isActive: true,
      },
      {
        id: "travel",
        title: "Travel Experiences",
        description: "Share your travel stories and dreams",
        icon: "fas fa-plane",
        difficulty: "intermediate",
        prompts: [
          "Tell me about your most memorable travel experience",
          "Where would you like to visit next and why?",
          "What's the best local food you've tried while traveling?"
        ],
        isActive: true,
      },
      {
        id: "hobbies",
        title: "Hobbies & Interests",
        description: "Discuss your favorite activities and pastimes",
        icon: "fas fa-gamepad",
        difficulty: "beginner",
        prompts: [
          "What hobbies do you enjoy in your free time?",
          "How did you get started with your favorite hobby?",
          "What new skill would you like to learn?"
        ],
        isActive: true,
      },
      {
        id: "food-cooking",
        title: "Food & Cooking",
        description: "Talk about cuisine, recipes, and cooking experiences",
        icon: "fas fa-utensils",
        difficulty: "intermediate",
        prompts: [
          "What's your favorite dish to cook?",
          "Tell me about the cuisine from your country",
          "Do you prefer cooking at home or eating out?"
        ],
        isActive: true,
      },
      {
        id: "books-movies",
        title: "Books & Movies",
        description: "Discuss entertainment, stories, and recommendations",
        icon: "fas fa-book",
        difficulty: "advanced",
        prompts: [
          "What's the last book you read that you really enjoyed?",
          "Can you recommend a movie that made you think?",
          "Do you prefer reading books or watching their movie adaptations?"
        ],
        isActive: true,
      }
    ];

    defaultTopics.forEach(topic => {
      this.topics.set(topic.id, topic);
    });
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      id,
      userId: insertSession.userId || null,
      startTime: new Date(),
      endTime: insertSession.endTime || null,
      durationMinutes: insertSession.durationMinutes || null,
      messagesCount: insertSession.messagesCount || null,
      correctionsCount: insertSession.correctionsCount || null,
      accuracyScore: insertSession.accuracyScore || null,
      topicId: insertSession.topicId || null,
      isActive: insertSession.isActive ?? true,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      id,
      sessionId: insertMessage.sessionId,
      type: insertMessage.type,
      content: insertMessage.content,
      timestamp: new Date(),
      audioUrl: insertMessage.audioUrl || null,
      corrections: insertMessage.corrections || null,
      metadata: insertMessage.metadata || null,
    };
    this.messages.set(id, message);
    return message;
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  async getTopics(): Promise<ConversationTopic[]> {
    return Array.from(this.topics.values()).filter(t => t.isActive);
  }

  async getTopic(id: string): Promise<ConversationTopic | undefined> {
    return this.topics.get(id);
  }

  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    return this.userProgress.get(userId);
  }

  async updateUserProgress(userId: string, progress: Partial<UserProgress>): Promise<UserProgress> {
    const existing = this.userProgress.get(userId);
    const updated: UserProgress = {
      id: existing?.id || randomUUID(),
      userId,
      totalSessions: 0,
      totalMinutes: 0,
      streak: 0,
      lastSessionDate: null,
      avgAccuracy: 0,
      achievements: [],
      ...existing,
      ...progress,
    };
    this.userProgress.set(userId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
