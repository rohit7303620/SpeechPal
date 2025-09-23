import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  Star, 
  Flame, 
  Medal, 
  Rocket,
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStats {
  sessionTime: number; // in minutes
  corrections: number;
  accuracy: number; // percentage
  streak: number; // days
  speakingTimeGoal: number; // in minutes
  pronunciationScore: number; // percentage
  achievements: string[];
}

interface ProgressPanelProps {
  stats: ProgressStats;
  className?: string;
}

export function ProgressPanel({ stats, className }: ProgressPanelProps) {
  const speakingProgress = Math.min((stats.sessionTime / stats.speakingTimeGoal) * 100, 100);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-secondary';
    if (accuracy >= 75) return 'text-primary';
    if (accuracy >= 60) return 'text-accent';
    return 'text-destructive';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Today's Progress */}
      <Card data-testid="progress-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span>Today's Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Speaking Time Goal */}
          <div data-testid="speaking-time-progress">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Speaking Time Goal</span>
              <span className="text-foreground font-medium">
                {formatTime(stats.sessionTime)}/{formatTime(stats.speakingTimeGoal)}
              </span>
            </div>
            <Progress value={speakingProgress} className="h-2" />
          </div>

          {/* Pronunciation Score */}
          <div data-testid="pronunciation-progress">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Pronunciation Score</span>
              <span className="text-foreground font-medium">{stats.pronunciationScore}%</span>
            </div>
            <Progress value={stats.pronunciationScore} className="h-2" />
          </div>

          {/* Daily Streak */}
          <div className="bg-accent/10 p-3 rounded-lg" data-testid="daily-streak">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-foreground">Daily Streak</span>
              </div>
              <span className="text-lg font-bold text-accent">{stats.streak}</span>
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Recent Achievements</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm" data-testid="achievement-session">
                <Medal className="w-4 h-4 text-accent" />
                <span className="text-muted-foreground">First 30-minute session</span>
              </div>
              <div className="flex items-center space-x-2 text-sm" data-testid="achievement-accuracy">
                <Star className="w-4 h-4 text-secondary" />
                <span className="text-muted-foreground">Grammar accuracy improved</span>
              </div>
              <div className="flex items-center space-x-2 text-sm" data-testid="achievement-conversations">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Completed 10 conversations</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4" data-testid="stats-time">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Session Time</p>
              <p className="text-lg font-semibold text-foreground">
                {formatTime(stats.sessionTime)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4" data-testid="stats-corrections">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-sm text-muted-foreground">Corrections</p>
              <p className="text-lg font-semibold text-foreground">{stats.corrections}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Accuracy Score */}
      <Card className="p-4" data-testid="stats-accuracy">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Accuracy Score</p>
              <p className={cn("text-lg font-semibold", getAccuracyColor(stats.accuracy))}>
                {stats.accuracy}%
              </p>
            </div>
          </div>
          <Badge 
            variant={stats.accuracy >= 85 ? "default" : stats.accuracy >= 70 ? "secondary" : "destructive"}
            data-testid="accuracy-badge"
          >
            {stats.accuracy >= 85 ? 'Excellent' : stats.accuracy >= 70 ? 'Good' : 'Improving'}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
