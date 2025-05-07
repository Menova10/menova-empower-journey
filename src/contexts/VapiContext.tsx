
import React, { createContext, useContext, useEffect, useState } from 'react';

type VapiContextType = {
  isSpeaking: boolean;
  isListening: boolean;
  isConnected: boolean;
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
  const [vapiSession, setVapiSession] = useState<any>(null);

  // Initialize Vapi
  const connect = async (): Promise<void> => {
    try {
      if (typeof window === 'undefined') return;

      // Load the Vapi SDK dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.vapi.ai/web-sdk@1.0.0/dist/sdk.js';
      script.async = true;
      
      // Create a promise to handle script loading
      const scriptLoaded = new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Vapi SDK'));
      });
      
      document.body.appendChild(script);
      
      // Wait for the script to load
      await scriptLoaded;
      
      // Initialize Vapi client
      const vapiClient = new (window as any).Vapi.Client({
        agentId: '2e3da3a1-8a7c-41d0-8e65-ab33101bb6b7',
        apiKey: 'd3fd5e81-606a-4d19-b737-bd00fd55a737',
      });

      const session = await vapiClient.start();
      setVapiSession(session);
      setIsConnected(true);
      
      // Set up event listeners
      session.on('speaking-started', () => setIsSpeaking(true));
      session.on('speaking-finished', () => setIsSpeaking(false));
      session.on('listening-started', () => setIsListening(true));
      session.on('listening-finished', () => setIsListening(false));
      
      // Don't return the cleanup function directly
      // Instead, we'll handle cleanup in the useEffect
    } catch (error) {
      console.error('Failed to initialize Vapi:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (vapiSession) {
      vapiSession.stop();
      setVapiSession(null);
      setIsConnected(false);
    }
  };

  const startListening = async () => {
    if (!vapiSession) return;
    try {
      await vapiSession.startListening();
    } catch (error) {
      console.error('Error starting listening:', error);
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
    if (!vapiSession) return;
    try {
      await vapiSession.speak(text);
    } catch (error) {
      console.error('Error speaking:', error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    // We'll handle the script removal here instead of in the connect function
    return () => {
      disconnect();
      // Remove the script if it exists
      const scriptElement = document.querySelector('script[src="https://cdn.vapi.ai/web-sdk@1.0.0/dist/sdk.js"]');
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
    };
  }, []);

  const value = {
    isSpeaking,
    isListening,
    isConnected,
    startListening,
    stopListening,
    speak,
    connect,
    disconnect
  };

  return <VapiContext.Provider value={value}>{children}</VapiContext.Provider>;
};
