import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Message } from '@shared/schema';

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

interface ConversationHistoryProps {
  messages: ConversationMessage[];
  className?: string;
}

export function ConversationHistory({ messages, className }: ConversationHistoryProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const highlightCorrections = (text: string, corrections: ConversationMessage['corrections'] = []) => {
    if (!corrections || corrections.length === 0) return text;

    let highlightedText = text;
    corrections.forEach(correction => {
      const regex = new RegExp(`\\b${correction.original}\\b`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        `<span class="correction-highlight">${correction.original}</span>`
      );
    });

    return highlightedText;
  };

  if (messages.length === 0) {
    return (
      <Card className={cn("h-96 flex items-center justify-center", className)} data-testid="conversation-empty">
        <div className="text-center text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-4 text-secondary" />
          <p className="text-lg font-medium mb-2">Ready to start practicing!</p>
          <p className="text-sm">Click the microphone and start speaking to begin your conversation.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("h-96 overflow-y-auto p-4 space-y-4", className)} data-testid="conversation-history">
      {messages.map((message, index) => (
        <div
          key={message.id || index}
          className={cn(
            "flex space-x-3",
            message.type === 'user' ? 'justify-end' : 'justify-start'
          )}
          data-testid={`message-${message.type}-${index}`}
        >
          {message.type !== 'user' && (
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          )}

          <div className={cn(
            "flex-1 flex flex-col",
            message.type === 'user' ? 'items-end' : 'items-start'
          )}>
            <div
              className={cn(
                "max-w-md p-3 rounded-lg text-sm",
                message.type === 'user'
                  ? "chat-bubble-user text-primary-foreground rounded-tr-none"
                  : "chat-bubble-bot text-secondary-foreground rounded-tl-none"
              )}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: message.type === 'user' 
                    ? highlightCorrections(message.content, message.corrections)
                    : message.content
                }}
              />
            </div>

            {/* Grammar Tips Badge */}
            {message.corrections && message.corrections.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Grammar tip
                </Badge>
              </div>
            )}

            {/* Encouragement */}
            {message.encouragement && (
              <div className="mt-1 text-xs text-muted-foreground italic">
                {message.encouragement}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              {formatTime(message.timestamp)}
            </p>
          </div>

          {message.type === 'user' && (
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </Card>
  );
}
