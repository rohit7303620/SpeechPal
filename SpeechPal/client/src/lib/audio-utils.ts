// Audio utility functions for the voice chat feature

export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function playAudioFromUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Failed to play audio'));
    audio.play().catch(reject);
  });
}

// Wait for voices to load
function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    
    window.speechSynthesis.onvoiceschanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        resolve(loadedVoices);
      }
    };
  });
}

export async function textToSpeech(text: string, options: {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  accent?: 'us' | 'uk' | 'in' | 'au';
} = {}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice options
    utterance.rate = options.rate || 0.8;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1.0;
    
    // Wait for voices to load before selecting
    try {
      const voices = await waitForVoices();
      let selectedVoice = null;
      
      // Priority order for Indian English accent
      if (options.accent === 'in') {
        const priorities = [
          (v: SpeechSynthesisVoice) => v.lang === 'en-IN',
          (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('indian'),
          (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('india'),
          (v: SpeechSynthesisVoice) => v.lang === 'hi-IN' && v.name.toLowerCase().includes('english'),
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('ravi'),
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('veena'),
          (v: SpeechSynthesisVoice) => v.lang === 'en-GB', // British as fallback for Indian users
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en')
        ];
        
        for (const priority of priorities) {
          selectedVoice = voices.find(priority);
          if (selectedVoice) break;
        }
      } else {
        // Default English voice selection
        const englishVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && voice.localService
        );
        if (englishVoices.length > 0) {
          selectedVoice = englishVoices[0];
        }
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      } else {
        console.log('No suitable voice found, using default');
      }
    } catch (error) {
      console.warn('Error loading voices, using default:', error);
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));
    
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeech(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Simple speech recognition using Web Speech API (fallback for demo)
export class SimpleSpeechRecognition {
  private recognition: any = null;
  private isSupported = false;
  private isListening = false;

  constructor(language: string = 'en-US') {
    console.log('Initializing speech recognition with language:', language);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      console.log('Speech recognition API found, creating instance');
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Use continuous mode for manual control
      this.recognition.interimResults = true;
      this.recognition.lang = language; // Support different languages/accents
      this.recognition.maxAlternatives = 1;
      this.isSupported = true;
      console.log('Speech recognition configured successfully');
    } else {
      console.error('Speech recognition not supported in this browser');
      this.isSupported = false;
    }
  }

  get supported(): boolean {
    return this.isSupported;
  }

  start(onResult: (transcript: string, isFinal: boolean) => void, onError?: (error: string) => void, onEnd?: () => void): void {
    if (!this.isSupported) {
      onError?.('Speech recognition not supported');
      return;
    }

    if (this.isListening) {
      console.log('Already listening, stopping first...');
      this.stop();
    }

    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript, true);
        // Don't stop listening in continuous mode - let user control manually
      } else if (interimTranscript) {
        onResult(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      // Handle specific error types
      if (event.error === 'not-allowed') {
        onError?.('not-allowed');
      } else if (event.error === 'no-speech') {
        onError?.('no-speech');
      } else if (event.error === 'network') {
        onError?.('network');
      } else {
        onError?.(event.error);
      }
    };

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
      onError?.('Failed to start speech recognition');
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      this.isListening = false;
    }
  }

  get listening(): boolean {
    return this.isListening;
  }
}

// Audio visualization utilities
export function createAudioVisualizer(stream: MediaStream, canvas: HTMLCanvasElement): () => void {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  
  source.connect(analyser);
  analyser.fftSize = 256;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  
  let animationId: number;
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    
    analyser.getByteFrequencyData(dataArray);
    
    ctx.fillStyle = 'rgb(240, 242, 247)';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * height;
      
      ctx.fillStyle = `hsl(159, 61%, ${45 + (dataArray[i] / 255) * 20}%)`;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }
  
  draw();
  
  return () => {
    cancelAnimationFrame(animationId);
    audioContext.close();
  };
}
