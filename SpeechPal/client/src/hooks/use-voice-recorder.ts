import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecorderOptions {
  onDataAvailable?: (audioData: Blob) => void;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Check browser support on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      setIsSupported(hasMediaRecorder && !!hasGetUserMedia);
    };

    checkSupport();
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      options.onError?.('Voice recording is not supported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        options.onDataAvailable?.(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      // Start audio level monitoring
      monitorAudioLevel();

    } catch (error) {
      console.error('Failed to start recording:', error);
      options.onError?.('Failed to access microphone. Please check permissions.');
    }
  }, [isSupported, options, monitorAudioLevel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    isSupported,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
