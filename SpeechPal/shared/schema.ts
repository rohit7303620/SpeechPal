import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes").default(0),
  messagesCount: integer("messages_count").default(0),
  correctionsCount: integer("corrections_count").default(0),
  accuracyScore: integer("accuracy_score").default(0),
  topicId: varchar("topic_id"),
  isActive: boolean("is_active").default(true),
});

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  type: varchar("type", { enum: ["user", "bot", "correction"] }).notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  audioUrl: text("audio_url"),
  corrections: jsonb("corrections"),
  metadata: jsonb("metadata"),
});

export const conversationTopics = pgTable("conversation_topics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  difficulty: varchar("difficulty", {
    enum: ["beginner", "intermediate", "advanced"],
  }).default("beginner"),
  prompts: jsonb("prompts"),
  isActive: boolean("is_active").default(true),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  totalSessions: integer("total_sessions").default(0),
  totalMinutes: integer("total_minutes").default(0),
  streak: integer("streak").default(0),
  lastSessionDate: timestamp("last_session_date"),
  avgAccuracy: integer("avg_accuracy").default(0),
  achievements: jsonb("achievements"),
});

// Insert schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  startTime: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertTopicSchema = createInsertSchema(conversationTopics).omit({
  id: true,
});

export const insertProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

// Types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ConversationTopic = typeof conversationTopics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;

// Message types for WebSocket communication
export const wsMessageSchema = z.object({
  type: z.enum([
    "audio_start",
    "audio_chunk",
    "audio_end",
    "text_message",
    "correction",
    "session_update",
  ]),
  payload: z.any(),
  sessionId: z.string().optional(),
});

export type WSMessage = z.infer<typeof wsMessageSchema>;
