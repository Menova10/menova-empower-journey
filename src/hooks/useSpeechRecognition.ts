
import { useState, useEffect, useCallback } from 'react';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  language?: string;
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
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
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
