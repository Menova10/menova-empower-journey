
import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';

type VapiContextType = {
  isSpeaking: boolean;
  isListening: boolean;
  isConnected: boolean;
  sdkLoaded: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const VapiContext = createContext<VapiContextType | undefined>(undefined);

export const useVapi = (): VapiContextType => {
  const context = useContext(VapiContext);
  if (!context) {
    throw new Error('useVapi must be used within a VapiProvider');
  }
  return context;
};

export const VapiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapiSession, setVapiSession] = useState<any>(null);

  // Load the Vapi SDK
  useEffect(() => {
    const loadVapiSdk = () => {
      if (typeof window === 'undefined' || window.document.querySelector('script[src="https://cdn.vapi.ai/web-sdk@1.0.0/dist/sdk.js"]')) {
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.vapi.ai/web-sdk@1.0.0/dist/sdk.js';
      script.async = true;
      script.id = 'vapi-sdk';
      
      script.onload = () => {
        console.log('Vapi SDK loaded successfully');
        setSdkLoaded(true);
        setError(null);
      };
      
      script.onerror = () => {
        const errorMsg = 'Failed to load Vapi SDK';
        console.error(errorMsg);
        setError(errorMsg);
        setSdkLoaded(false);
        
        // Remove failed script to allow retry
        script.remove();
        
        // Show toast with error
        toast({
          title: "Voice Assistant Error",
          description: "Could not load voice assistant. Please try again later.",
          variant: "destructive",
        });
      };
      
      document.body.appendChild(script);
    };

    loadVapiSdk();

    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Initialize Vapi client
  const connect = async (): Promise<void> => {
    try {
      if (!sdkLoaded) {
        console.log("SDK not loaded yet, can't connect");
        return;
      }

      if (isConnected) {
        console.log("Already connected");
        return;
      }

      console.log("Initializing Vapi client...");
      const Vapi = (window as any).Vapi;
      if (!Vapi || !Vapi.Client) {
        throw new Error("Vapi SDK not found or not properly initialized");
      }

      const vapiClient = new Vapi.Client({
        agentId: '2e3da3a1-8a7c-41d0-8e65-ab33101bb6b7',
        apiKey: 'd3fd5e81-606a-4d19-b737-bd00fd55a737',
      });

      console.log("Starting Vapi session...");
      const session = await vapiClient.start();
      setVapiSession(session);
      setIsConnected(true);
      
      // Set up event listeners
      session.on('speaking-started', () => setIsSpeaking(true));
      session.on('speaking-finished', () => setIsSpeaking(false));
      session.on('listening-started', () => setIsListening(true));
      session.on('listening-finished', () => setIsListening(false));
      
      console.log("Vapi session started successfully");
    } catch (error) {
      const errorMsg = `Failed to initialize Vapi: ${error}`;
      console.error(errorMsg);
      setError(errorMsg);
      setIsConnected(false);
      
      toast({
        title: "Voice Assistant Error",
        description: "Could not connect to voice assistant. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (vapiSession) {
      try {
        vapiSession.stop();
        console.log("Vapi session stopped");
      } catch (e) {
        console.error("Error stopping Vapi session:", e);
      }
      setVapiSession(null);
      setIsConnected(false);
    }
  };

  const startListening = async () => {
    if (!vapiSession) {
      if (!isConnected && sdkLoaded) {
        await connect();
      }
      return;
    }
    
    try {
      await vapiSession.startListening();
    } catch (error) {
      console.error('Error starting listening:', error);
      setError(`Error starting listening: ${error}`);
    }
  };

  const stopListening = () => {
    if (!vapiSession) return;
    try {
      vapiSession.stopListening();
    } catch (error) {
      console.error('Error stopping listening:', error);
    }
  };

  const speak = async (text: string) => {
    if (!vapiSession) {
      if (!isConnected && sdkLoaded) {
        await connect();
        if (!vapiSession) {
          console.error("Failed to establish session before speaking");
          return;
        }
      } else {
        console.error("No active session to speak through");
        return;
      }
    }
    
    try {
      await vapiSession.speak(text);
    } catch (error) {
      console.error('Error speaking:', error);
      setError(`Error speaking: ${error}`);
    }
  };

  const value = {
    isSpeaking,
    isListening,
    isConnected,
    sdkLoaded,
    error,
    startListening,
    stopListening,
    speak,
    connect,
    disconnect
  };

  return <VapiContext.Provider value={value}>{children}</VapiContext.Provider>;
};
