
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
  vapiRef: React.MutableRefObject<any>;
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
    try {
      console.log("Initializing Vapi SDK");
      vapiRef.current = new Vapi('d3fd5e81-606a-4d19-b737-bd00fd55a737');
      
      // Set up event listeners for tracking state
      if (vapiRef.current) {
        vapiRef.current.on && vapiRef.current.on("speech-start", () => {
          console.log("Speech started");
          setIsSpeaking(true);
        });
        
        vapiRef.current.on && vapiRef.current.on("speech-end", () => {
          console.log("Speech ended");
          setIsSpeaking(false);
        });
        
        vapiRef.current.on && vapiRef.current.on("listening-start", () => {
          console.log("Listening started");
          setIsListening(true);
        });
        
        vapiRef.current.on && vapiRef.current.on("listening-end", () => {
          console.log("Listening ended");
          setIsListening(false);
        });
        
        vapiRef.current.on && vapiRef.current.on("error", (err: any) => {
          console.error("Vapi error:", err);
          setError(err?.message || "An error occurred with the voice assistant");
          toast({
            title: "Voice Assistant Error",
            description: err?.message || "Could not connect to voice assistant",
            variant: "destructive",
          });
        });
      }
      
      setSdkLoaded(true);
    } catch (err) {
      console.error("Error initializing Vapi:", err);
      setError("Could not initialize voice assistant");
    }
    
    return () => {
      if (vapiRef.current) {
        console.log("Stopping Vapi on cleanup");
        vapiRef.current?.stop();
      }
    };
  }, []);

  const startAssistant = () => {
    if (!vapiRef.current) return;
    try {
      console.log("Starting Vapi assistant");
      vapiRef.current.start("2e3da3a1-8a7c-41d0-8e65-ab33101bb6b7");
    } catch (e) {
      console.error("Error starting assistant:", e);
      setError('Could not start voice assistant');
      toast({
        title: "Voice Assistant Error",
        description: "Could not start voice assistant. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const stopAssistant = () => {
    if (vapiRef.current) {
      console.log("Stopping Vapi assistant");
      vapiRef.current?.stop();
    }
  };

  const speak = (text: string) => {
    if (!vapiRef.current) return;
    console.log("Speaking text:", text);
    // Use sendTextMessage instead of speak for Vapi API v2
    vapiRef.current?.sendTextMessage && vapiRef.current.sendTextMessage(text);
  };

  const value = {
    isSpeaking,
    isListening,
    sdkLoaded,
    error,
    startAssistant,
    stopAssistant,
    speak,
    vapiRef,
  };

  return <VapiContext.Provider value={value}>{children}</VapiContext.Provider>;
};
