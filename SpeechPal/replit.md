# English Conversation Practice App

## Overview

This is a voice-enabled English conversation practice application that helps users improve their speaking skills through AI-powered conversations. The app provides real-time voice chat with grammar corrections, topic-based conversation prompts, and progress tracking. Users can practice speaking English naturally while receiving gentle corrections and encouragement from an AI tutor.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state and React hooks for local state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Voice Integration**: Web Speech API for speech recognition and synthesis

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful APIs for standard operations with WebSocket for real-time voice chat
- **Real-time Communication**: WebSocket server for bidirectional voice chat communication
- **Session Management**: In-memory storage with session-based conversation tracking
- **Development Tools**: Hot module replacement with Vite integration for development

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Development Storage**: In-memory storage implementation for rapid development
- **Schema Design**: Separate tables for sessions, messages, conversation topics, and user progress
- **Migration Management**: Drizzle Kit for database schema migrations

### Authentication and Authorization
- **Session-based**: Express sessions with PostgreSQL session store
- **User Identification**: Simple user ID tracking without complex authentication flows
- **Stateless Design**: Each conversation session is independently managed

### External Service Integrations
- **AI Service**: OpenAI API integration for conversation generation and grammar correction
- **Voice Processing**: Browser-native Web Speech API for speech recognition and text-to-speech
- **Real-time Updates**: Native WebSocket implementation for low-latency voice chat

## External Dependencies

### Core Backend Services
- **Database**: PostgreSQL via Neon serverless for production deployment
- **AI Processing**: OpenAI API for natural language processing and conversation generation
- **WebSocket**: Native WebSocket server implementation for real-time communication

### Frontend Libraries
- **UI Framework**: Radix UI primitives for accessible component foundation
- **Voice APIs**: Web Speech API for browser-native speech recognition and synthesis
- **HTTP Client**: Native fetch API with TanStack Query for caching and state management

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Database Tooling**: Drizzle Kit for schema management and migrations
- **TypeScript**: Full-stack type safety with shared schema definitions