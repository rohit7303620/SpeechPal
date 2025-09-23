import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceChat } from '@/components/voice-chat';
import { ConversationHistory } from '@/components/conversation-history';
import { ProgressPanel } from '@/components/progress-panel';
import { TopicSelector } from '@/components/topic-selector';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { History, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Session, type Message } from '@shared/schema';

interface ConversationMessage {
  id: string;
  type: 'user' | 'bot' | 'correction';
  content: string;
  timestamp: string;
  corrections?: Array<{
    original: string;
    corrected: string;
    explanation: string;
    type: string;
  }>;
  encouragement?: string;
}

export default function ConversationPage() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('hobbies');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessionStats, setSessionStats] = useState({
    sessionTime: 0,
    corrections: 0,
    accuracy: 87,
    streak: 7,
    speakingTimeGoal: 30,
    pronunciationScore: 87,
    achievements: []
  });

  const queryClient = useQueryClient();

  // Timer for session duration
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      setSessionStats(prev => ({
        ...prev,
        sessionTime: prev.sessionTime + 1
      }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentSession]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { topicId: string }) => {
      const response = await apiRequest('POST', '/api/sessions', {
        userId: 'guest',
        topicId: data.topicId,
        durationMinutes: 0,
        messagesCount: 0,
        correctionsCount: 0,
        accuracyScore: 0,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      setMessages([{
        id: 'welcome',
        type: 'bot',
        content: "Hey there! I'm your friendly English practice buddy. Let's have a natural conversation! What would you like to talk about today? 😊",
        timestamp: new Date().toISOString(),
      }]);
    },
  });

  // Start a new session
  const handleStartSession = () => {
    if (selectedTopicId) {
      createSessionMutation.mutate({ topicId: selectedTopicId });
    }
  };

  // Handle topic selection
  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    if (!currentSession) {
      createSessionMutation.mutate({ topicId });
    }
  };

  // Handle incoming messages from WebSocket
  const handleMessageReceived = (messageData: any) => {
    if (messageData.type === 'bot') {
      const newMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        type: 'bot',
        content: messageData.content,
        timestamp: messageData.timestamp || new Date().toISOString(),
        corrections: messageData.corrections,
        encouragement: messageData.encouragement,
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Update stats
      if (messageData.corrections && messageData.corrections.length > 0) {
        setSessionStats(prev => ({
          ...prev,
          corrections: prev.corrections + messageData.corrections.length
        }));
      }
    } else if (messageData.corrections) {
      // Handle correction feedback
      setSessionStats(prev => ({
        ...prev,
        corrections: prev.corrections + messageData.corrections.length
      }));
    }
  };

  // Handle user message (when they speak)
  const handleUserMessage = (content: string) => {
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
  };

  const formatSessionTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}:00`;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="conversation-page">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-comments text-primary-foreground"></i>
            </div>
            <h1 className="text-xl font-bold text-foreground">SpeakEasy</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentSession && (
              <div className="hidden md:flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span className="text-sm text-muted-foreground" data-testid="header-session-time">
                  {formatSessionTime(sessionStats.sessionTime)}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <i className="fas fa-user text-accent-foreground text-sm"></i>
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground">
                Guest User
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4" data-testid="stat-session-time">
            <div className="flex items-center space-x-2">
              <i className="fas fa-clock text-primary"></i>
              <div>
                <p className="text-sm text-muted-foreground">Session Time</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatSessionTime(sessionStats.sessionTime)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4" data-testid="stat-corrections">
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-secondary"></i>
              <div>
                <p className="text-sm text-muted-foreground">Corrections</p>
                <p className="text-lg font-semibold text-foreground">{sessionStats.corrections}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4" data-testid="stat-accuracy">
            <div className="flex items-center space-x-2">
              <i className="fas fa-star text-accent"></i>
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-lg font-semibold text-foreground">{sessionStats.accuracy}%</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4" data-testid="stat-streak">
            <div className="flex items-center space-x-2">
              <i className="fas fa-fire text-destructive"></i>
              <div>
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-lg font-semibold text-foreground">{sessionStats.streak} days</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Conversation Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Conversation History */}
            <ConversationHistory messages={messages} />

            {/* Voice Chat Controls */}
            <VoiceChat
              sessionId={currentSession?.id}
              topicId={selectedTopicId}
              onMessageReceived={handleMessageReceived}
            />

            {/* Start Session Button (if no active session) */}
            {!currentSession && (
              <Card className="p-6 text-center" data-testid="start-session-card">
                <CardContent>
                  <h3 className="text-lg font-medium mb-2">Ready to Practice?</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a topic and start your English conversation practice
                  </p>
                  <Button 
                    onClick={handleStartSession}
                    disabled={!selectedTopicId || createSessionMutation.isPending}
                    data-testid="button-start-session"
                  >
                    {createSessionMutation.isPending ? 'Starting...' : 'Start Conversation'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Topic Selector */}
            <TopicSelector
              selectedTopicId={selectedTopicId}
              onTopicSelect={handleTopicSelect}
            />

            {/* Progress Panel */}
            <ProgressPanel stats={sessionStats} />
          </div>
        </div>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <Button
          size="lg" 
          className="w-12 h-12 rounded-full shadow-lg"
          variant="default"
          data-testid="button-history"
        >
          <History className="w-5 h-5" />
        </Button>
        <Button
          size="lg" 
          className="w-12 h-12 rounded-full shadow-lg"
          variant="secondary"
          data-testid="button-download"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
