import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Coffee, Plane, Gamepad, Utensils, Book, Settings, HelpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { type ConversationTopic } from '@shared/schema';

interface TopicSelectorProps {
  selectedTopicId?: string;
  onTopicSelect: (topicId: string) => void;
  className?: string;
}

const topicIcons = {
  'fas fa-coffee': Coffee,
  'fas fa-plane': Plane,
  'fas fa-gamepad': Gamepad,
  'fas fa-utensils': Utensils,
  'fas fa-book': Book,
};

export function TopicSelector({ selectedTopicId, onTopicSelect, className }: TopicSelectorProps) {
  const [settings, setSettings] = useState({
    speechSpeed: 'normal',
    correctionLevel: 'friendly',
    voiceAccent: 'american'
  });

  const { data: topics = [], isLoading } = useQuery<ConversationTopic[]>({
    queryKey: ['/api/topics'],
  });

  const getTopicIcon = (iconClass: string) => {
    const IconComponent = topicIcons[iconClass as keyof typeof topicIcons] || Lightbulb;
    return IconComponent;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-secondary/20 text-secondary-foreground';
      case 'intermediate':
        return 'bg-primary/20 text-primary-foreground';
      case 'advanced':
        return 'bg-accent/20 text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card data-testid="topics-loading">
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Conversation Topics */}
      <Card data-testid="conversation-topics">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            <span>Conversation Starters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topics.map((topic) => {
              const IconComponent = getTopicIcon(topic.icon || 'fas fa-lightbulb');
              const isSelected = selectedTopicId === topic.id;
              
              return (
                <Button
                  key={topic.id}
                  variant={isSelected ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => onTopicSelect(topic.id)}
                  data-testid={`topic-${topic.id}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{topic.title}</p>
                      {topic.description && (
                        <p className="text-xs opacity-80 truncate">{topic.description}</p>
                      )}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getDifficultyColor(topic.difficulty || 'beginner'))}
                    >
                      {topic.difficulty}
                    </Badge>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Settings */}
      <Card data-testid="quick-settings">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span>Quick Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bot Speech Speed</span>
            <Select 
              value={settings.speechSpeed} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, speechSpeed: value }))}
            >
              <SelectTrigger className="w-24" data-testid="select-speech-speed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Correction Level</span>
            <Select 
              value={settings.correctionLevel} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, correctionLevel: value }))}
            >
              <SelectTrigger className="w-24" data-testid="select-correction-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Voice Accent</span>
            <Select 
              value={settings.voiceAccent} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, voiceAccent: value }))}
            >
              <SelectTrigger className="w-24" data-testid="select-voice-accent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="american">American</SelectItem>
                <SelectItem value="british">British</SelectItem>
                <SelectItem value="australian">Australian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              data-testid="button-help"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Tutorial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
