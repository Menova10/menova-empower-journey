
import { useState, useEffect, useCallback } from 'react';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  language?: string;
}

// Add proper TypeScript declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal?: boolean;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: {
    0: { transcript: string; confidence: number; isFinal?: boolean; };
    isFinal: boolean;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

export const useSpeechRecognition = ({
  onResult,
  onEnd,
  language = 'en-US',
}: UseSpeechRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if browser supports speech recognition
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser');
      return;
    }
    
    // Initialize speech recognition
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognitionClass() as SpeechRecognition;
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = language;
    
    recognitionInstance.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ');
      setTranscript(currentTranscript);
      
      if (event.results[0].isFinal && onResult) {
        onResult(currentTranscript);
      }
    };
    
    recognitionInstance.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognitionInstance.onend = () => {
      setIsListening(false);
      if (onEnd) onEnd();
    };
    
    setRecognition(recognitionInstance);
    
    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort();
      }
    };
  }, [language, onResult, onEnd]);

  const startListening = useCallback(() => {
    setError(null);
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setError('Error starting speech recognition');
      }
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
};

// Add TypeScript declarations
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
