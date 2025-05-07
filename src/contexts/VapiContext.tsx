import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Vapi from "@vapi-ai/web";
import { toast } from '@/components/ui/use-toast';

type VapiContextType = {
  isSpeaking: boolean;
  isListening: boolean;
  sdkLoaded: boolean;
  error: string | null;
  startAssistant: () => void;
  stopAssistant: () => void;
  speak: (text: string) => void;
};

const VapiContext = createContext<VapiContextType | undefined>(undefined);

export const useVapi = (): VapiContextType => {
  const context = useContext(VapiContext);
  if (!context) throw new Error('useVapi must be used within a VapiProvider');
  return context;
};

export const VapiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    vapiRef.current = new Vapi('d3fd5e81-606a-4d19-b737-bd00fd55a737');
    setSdkLoaded(true);
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const startAssistant = () => {
    if (!vapiRef.current) return;
    const assistantOptions = {
      name: "Vapi Assistant",
      firstMessage: "Hello! How can I help you? I am Nexa",
      model: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant."
          }
        ]
      }
    };
    try {
      vapiRef.current.start("2e3da3a1-8a7c-41d0-8e65-ab33101bb6b7");
    } catch (e) {
      setError('Could not start voice assistant');
      toast({
        title: "Voice Assistant Error",
        description: "Could not start voice assistant. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const stopAssistant = () => {
    vapiRef.current?.stop();
  };

  const speak = (text: string) => {
    vapiRef.current?.speak(text);
  };

  // Optionally, add event listeners for speaking/listening here

  const value = {
    isSpeaking,
    isListening,
    sdkLoaded,
    error,
    startAssistant,
    stopAssistant,
    speak,
  };

  return <VapiContext.Provider value={value}>{children}</VapiContext.Provider>;
};
