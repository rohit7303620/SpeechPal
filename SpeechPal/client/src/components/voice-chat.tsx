// Voice chat component for English conversation practice
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Volume2, Pause, RotateCcw, Send, MessageCircle } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { useWebSocket } from '@/hooks/use-websocket';
import { textToSpeech, stopSpeech, SimpleSpeechRecognition } from '@/lib/audio-utils';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { type WSMessage } from '@shared/schema';

interface VoiceChatProps {
  sessionId?: string;
  topicId?: string;
  onMessageReceived?: (message: any) => void;
  className?: string;
}

export function VoiceChat({ sessionId, topicId, onMessageReceived, className }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [status, setStatus] = useState('Ready to practice English! Click microphone to speak 🎤');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useTextMode, setUseTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceAccent, setVoiceAccent] = useState<'us' | 'uk' | 'in' | 'au'>('in');
  
  const speechRecognitionRef = useRef<SimpleSpeechRecognition | null>(null);
  
  const { isSupported } = useVoiceRecorder();

  // Disable WebSocket for better stability in Replit environment
  const isConnected = false;
  
  // Set initial status for voice-only mode
  useEffect(() => {
    setStatus('Voice mode ready! Click microphone to start speaking 🎤');
  }, []);

  useEffect(() => {
    // Initialize with Indian English by default
    const language = voiceAccent === 'in' ? 'en-IN' : voiceAccent === 'uk' ? 'en-GB' : voiceAccent === 'au' ? 'en-AU' : 'en-US';
    speechRecognitionRef.current = new SimpleSpeechRecognition(language);
  }, [voiceAccent]);

  function handleWebSocketMessage(message: WSMessage) {
    // WebSocket message handling (for when connection is stable)
    switch (message.type) {
      case 'text_message':
        if (message.payload.type === 'bot') {
          onMessageReceived?.(message.payload);
          
          if (message.payload.content && !useTextMode) {
            setIsSpeaking(true);
            setStatus('🔊 AI tutor is speaking...');
            textToSpeech(message.payload.content, { rate: 0.8, accent: voiceAccent })
              .then(() => {
                setIsSpeaking(false);
                setStatus('Click microphone to continue speaking 🎤');
              })
              .catch(() => {
                setIsSpeaking(false);
                setStatus('Ready for your next message 🎤');
              });
          }
        }
        break;
    }
  }

  const startVoiceSession = async () => {
    // Initialize speech recognition if not already done
    if (!speechRecognitionRef.current) {
      speechRecognitionRef.current = new SimpleSpeechRecognition();
    }

    // Check browser support
    if (!speechRecognitionRef.current.supported) {
      setStatus('❌ Speech recognition not supported in this browser. Please type instead.');
      setVoiceSessionActive(false);
      setIsListening(false);
      return;
    }
    
    console.log('Browser supports speech recognition, starting session');

    try {
      // Request microphone permission (only on first start)
      if (!voiceSessionActive) {
        setStatus('🎤 Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          } 
        });
        stream.getTracks().forEach(track => track.stop()); // Just needed permission check
      }
      
      setIsListening(true);
      setStatus('🔴 RECORDING... Speak freely! Click microphone to stop listening.');
      setTranscriptText('');

      speechRecognitionRef.current.start(
        (transcript: string, isFinal: boolean) => {
          console.log('Transcript received:', transcript, 'Final:', isFinal);
          setTranscriptText(transcript);
          
          if (isFinal && transcript.trim()) {
            // Put transcribed text in input box and auto-send after delay
            console.log('Speech recognition final result:', transcript.trim());
            setTextInput(transcript.trim());
            setTranscriptText('');
            
            // Wait longer before auto-sending to let user finish speaking
            setTimeout(() => {
              console.log('Auto-sending transcribed text (after delay):', transcript.trim());
              handleDirectTextInput(transcript.trim());
              setTextInput(''); // Clear input after sending
            }, 1200); // Increased to 1.2 seconds delay
            
            setStatus('🔴 RECORDING... Continue speaking or click microphone to stop.');
          } else if (transcript) {
            setStatus(`🎤 I hear: "${transcript}"`);
          }
        },
        (error: string) => {
          console.error('Speech recognition error:', error);
          setIsListening(false);
          setVoiceSessionActive(false);
          
          if (error === 'not-allowed') {
            setStatus('❌ Microphone permission denied. Please allow microphone access in your browser settings.');
          } else if (error === 'no-speech') {
            setStatus('❌ No speech detected. Make sure your microphone is working and try again 🎤');
          } else if (error === 'network') {
            setStatus('❌ Network error. Please check your internet connection and try again 🎤');
          } else {
            setStatus(`❌ Speech error: ${error}. Click microphone to try again 🎤`);
          }
        },
        () => {
          // onEnd callback - if voice session is still active, restart immediately
          console.log('Speech recognition ended');
          setIsListening(false);
          
          // Only stop if user manually stopped the session
          if (voiceSessionActive) {
            console.log('Auto-restarting speech recognition for continuous listening...');
            setTimeout(() => {
              if (voiceSessionActive && !isSpeaking) {
                startVoiceSession();
              }
            }, 100);
          } else {
            setStatus('🎤 Microphone stopped. Click microphone button to continue listening.');
          }
        }
      );
    } catch (error: any) {
      console.error('Microphone access error:', error);
      setIsListening(false);
      setVoiceSessionActive(false);
      
      if (error?.name === 'NotAllowedError') {
        setStatus('❌ Microphone permission denied. Please allow microphone access in your browser.');
      } else if (error?.name === 'NotFoundError') {
        setStatus('❌ No microphone found. Please check your microphone connection.');
      } else {
        setStatus('❌ Cannot access microphone. Please check browser settings and try again.');
      }
    }
  };

  const handleMicClick = async () => {
    if (useTextMode) {
      setStatus('Switch to Voice mode to use microphone');
      return;
    }

    if (voiceSessionActive) {
      // Stop the voice session
      setVoiceSessionActive(false);
      setIsListening(false);
      
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      
      setStatus('Voice session stopped. Click mic to start again 🎤');
      return;
    }

    // Start a new voice session
    setVoiceSessionActive(true);
    await startVoiceSession();
  };

  const handleDirectTextInput = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      // Add user message to chat
      const userMessage = {
        type: 'user',
        content: text,
        timestamp: new Date().toISOString()
      };
      onMessageReceived?.(userMessage);
      
      // Show processing status
      setStatus('🤔 AI tutor is thinking...');
      
      // Brief processing delay to show thinking status
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Create a simple but effective AI response
      let corrections: any[] = [];
      let botContent = "";
      let encouragement = "Great job practicing English! Keep it up! 🌟";
      
      try {
        // Try API first
        const apiResponse = await fetch('/api/conversation/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sessionId: 'demo-session',
            message: text
          })
        });

        if (apiResponse.ok) {
          const response = await apiResponse.json();
          corrections = response.corrections || [];
          botContent = response.reply || `Thank you for saying: "${text}". That's great English practice!`;
          encouragement = response.encouragement || encouragement;
        } else {
          throw new Error('API call failed');
        }
      } catch (apiError) {
        console.log('Using fallback response due to API error:', apiError);
        // Simple fallback that works offline
        botContent = `Great! You said: "${text}". That's excellent English practice! Keep speaking confidently!`;
        
        // Basic grammar check
        if (text.toLowerCase().includes('i are')) {
          corrections.push({
            original: 'I are',
            corrected: 'I am',
            explanation: 'Use "I am" instead of "I are"',
            type: 'grammar'
          });
          botContent += " Small tip: we say 'I am' not 'I are'.";
        }
      }
      
      // Add encouraging follow-up questions
      const followUpQuestions = [
        "What would you like to talk about next?",
        "Tell me more about your day!",
        "What's your favorite hobby?",
        "How do you feel about learning English?",
        "What made you smile today?",
        "What are you planning to do this weekend?"
      ];
      
      botContent += followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
      
      const botResponse = {
        type: 'bot',
        content: botContent,
        corrections,
        encouragement: encouragement,
        timestamp: new Date().toISOString()
      };
      
      onMessageReceived?.(botResponse);
      
      // Use text-to-speech for bot response if in voice mode
      if (!useTextMode) {
        // Stop microphone before AI speaks to prevent echo
        if (speechRecognitionRef.current && isListening) {
          speechRecognitionRef.current.stop();
          setIsListening(false);
          setVoiceSessionActive(false);
        }
        
        setIsSpeaking(true);
        setStatus('🔊 AI tutor is speaking...');
        
        try {
          await textToSpeech(botContent, { rate: 0.8, accent: voiceAccent });
          
          // If there are corrections, speak them separately
          if (corrections && corrections.length > 0) {
            const correctionsText = corrections.map(c => 
              `Small correction: Instead of "${c.original}", you can say "${c.corrected}". ${c.explanation || ''}`
            ).join('. ');
            await textToSpeech(correctionsText, { rate: 0.7, accent: voiceAccent });
          }
          
          setStatus('Click microphone to continue conversation 🎤');
        } catch (ttsError) {
          setStatus('Response ready! Click microphone to continue 🎤');
        }
        setIsSpeaking(false);
      } else {
        setStatus('Message sent! Type another message or switch to voice mode 🎤');
      }
      
    } catch (error) {
      console.error('Text input error:', error);
      setStatus('Something went wrong. Please try again! 😊');
    }
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      handleDirectTextInput(textInput.trim());
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handlePause = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      setStatus('Speech paused. Click microphone to continue 🎤');
    }
  };

  const handleStop = () => {
    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    }
    setStatus('Click microphone to start speaking 🎤');
  };

  return (
    <Card className={cn('p-6 w-full max-w-2xl mx-auto', className)}>
      <div className="flex flex-col items-center space-y-6">
        {/* Status Display */}
        <div className="text-center space-y-2">
          <div 
            className="text-lg font-medium text-center px-4 py-2 rounded-lg bg-muted/50" 
            data-testid="status-message"
          >
            {status}
          </div>
          
          {transcriptText && (
            <div className="text-sm text-muted-foreground border rounded-lg px-3 py-2 bg-background/50">
              <span className="font-medium">You're saying:</span> "{transcriptText}"
            </div>
          )}
        </div>

        {/* Voice Controls - Only show in voice mode */}
        {!useTextMode && (
          <div className="flex items-center space-x-4">
            {/* Main Microphone Button */}
            <Button
              onClick={handleMicClick}
              disabled={isSpeaking}
              size="lg"
              className={cn(
                'w-16 h-16 rounded-full',
                voiceSessionActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary hover:bg-primary/90',
                isListening && 'animate-pulse'
              )}
              data-testid="mic-button"
              aria-pressed={voiceSessionActive}
            >
              {voiceSessionActive ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            {/* Control buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={!isSpeaking}
                data-testid="pause-button"
              >
                <Pause className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                disabled={!isListening && !isSpeaking}
                data-testid="stop-button"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Voice Accent Selection */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-muted-foreground">Voice Accent:</span>
          <Button
            variant={voiceAccent === 'in' ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setVoiceAccent('in')}
            data-testid="accent-indian"
          >
            🇮🇳 Indian
          </Button>
          <Button
            variant={voiceAccent === 'us' ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setVoiceAccent('us')}
            data-testid="accent-us"
          >
            🇺🇸 US
          </Button>
          <Button
            variant={voiceAccent === 'uk' ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setVoiceAccent('uk')}
            data-testid="accent-uk"
          >
            🇬🇧 UK
          </Button>
        </div>

        {/* Speech Speed Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-muted-foreground">Speech Speed:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => textToSpeech("Testing faster speech speed", { rate: 1.2, accent: voiceAccent })}
          >
            Faster
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => textToSpeech("Testing normal speech speed", { rate: 0.9, accent: voiceAccent })}
          >
            Normal
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => textToSpeech("Testing slower speech speed", { rate: 0.6, accent: voiceAccent })}
          >
            Slower
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-muted-foreground">Input Mode:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseTextMode(!useTextMode)}
            className="h-6 px-2"
            data-testid="toggle-input-mode"
          >
            {useTextMode ? (
              <>
                <MessageCircle className="w-3 h-3 mr-1" />
                Text
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 mr-1" />
                Voice
              </>
            )}
          </Button>
        </div>


        {/* Text Input Mode */}
        {useTextMode && (
          <div className="w-full max-w-md mt-4 space-y-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>Type your English practice message below:</span>
            </div>
            <div className="flex space-x-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your English practice message here..."
                disabled={isSpeaking}
                className="flex-1"
                data-testid="text-input"
                autoFocus
              />
              <Button
                onClick={handleSendText}
                disabled={!textInput.trim() || isSpeaking}
                size="sm"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Press Enter to send or click the send button
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}