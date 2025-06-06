import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define the interface for the Vapi context
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

// Create the context with undefined as initial value
const VapiContext = createContext<VapiContextType | undefined>(undefined);

// Wrap Vapi import in a function to load it only when needed and in browser environment
const loadVapi = async () => {
  if (typeof window !== 'undefined') {
    try {
      const module = await import('@vapi-ai/web');
      return module.default;
    } catch (error) {
      console.error('Failed to load Vapi module:', error);
      return null;
    }
  }
  return null;
};

// Update VapiOptions interface
interface VapiOptions {
  server?: {
    url: string;
    headers?: Record<string, string>;
  };
  debug?: boolean;
  transcriptionOptions?: {
    interim?: boolean;
    endpointingConfig?: {
      timeoutMs?: number;
    };
  };
}

// The VapiProvider component
export const VapiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize Vapi if we're in the browser
    if (typeof window === 'undefined') {
      console.log("Skipping Vapi initialization: Not in browser");
      return;
    }

    // Check for required environment variables
    const apiKey = import.meta.env.VITE_VAPI_API_KEY;
    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

    console.log("Environment check:", { 
      hasApiKey: !!apiKey, 
      hasAssistantId: !!assistantId,
      apiKeyLength: apiKey?.length 
    });

    if (!apiKey) {
      const errorMsg = "Vapi API key not found in environment variables";
      console.error(errorMsg);
      setError(errorMsg);
      toast({
        title: "Configuration Error",
        description: "Voice assistant is not properly configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    // Load Vapi dynamically
    const initVapi = async () => {
      try {
        const Vapi = await loadVapi();
        if (!Vapi) {
          throw new Error("Failed to load Vapi SDK");
        }

        console.log("Initializing Vapi SDK with API key:", apiKey?.substring(0, 8) + "...");
        
        // Initialize Vapi with API key
        vapiRef.current = new Vapi(apiKey);
        console.log("Vapi instance created successfully");
        
        // Set up event listeners for tracking state
        if (vapiRef.current) {
          // Speech events
          vapiRef.current.on("speech-start", () => {
            console.log("Assistant speech started");
            setIsSpeaking(true);
          });
          
          vapiRef.current.on("speech-end", () => {
            console.log("Assistant speech ended");
            setIsSpeaking(false);
          });
          
          // Call events
          vapiRef.current.on("call-start", () => {
            console.log("Call started");
            setIsListening(true);
          });
          
          vapiRef.current.on("call-end", () => {
            console.log("Call ended");
            setIsListening(false);
          });

          // Message events for transcripts and assistant responses
          vapiRef.current.on("message", (message: any) => {
            console.log("Received message:", message);
            if (message.type === 'transcript') {
              console.log(`Received ${message.isFinal ? 'final' : 'interim'} transcript:`, message.text);
            } else if (message.type === 'model-output') {
              console.log("Received model output:", message.text);
            } else if (message.type === 'voice-input') {
              console.log("Voice input:", message);
            } else if (message.type === 'function-call') {
              console.log("Function call:", message);
            }
          });

          // Audio-specific event listeners
          vapiRef.current.on("volume-level", (level: number) => {
            console.log("Volume level:", level);
          });
          
          vapiRef.current.on("speech-update", (update: any) => {
            console.log("Speech update:", update);
          });
          
          // Error handling
          vapiRef.current.on("error", (err: any) => {
            console.error("Vapi error:", err);
            console.error("Full error object:", JSON.stringify(err, null, 2));
            
            // Check for specific error types
            if (err?.message?.includes("Meeting has ended")) {
              console.error("Meeting ended error - possibly assistant configuration issue");
              const errorMessage = "Assistant configuration issue. Please check your Vapi dashboard.";
              setError(errorMessage);
              toast({
                title: "Voice Assistant Configuration Error",
                description: errorMessage,
                variant: "destructive",
              });
            } else {
              const errorMessage = err?.message || "An error occurred with the voice assistant";
              setError(errorMessage);
              toast({
                title: "Voice Assistant Error",
                description: errorMessage,
                variant: "destructive",
              });
            }
          });
        }
        
        setSdkLoaded(true);
        setError(null);
      } catch (err) {
        console.error("Error initializing Vapi:", err);
        const errorMessage = err instanceof Error ? err.message : "Could not initialize voice assistant";
        setError(errorMessage);
        toast({
          title: "Voice Assistant Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    initVapi();
    
    return () => {
      if (vapiRef.current) {
        console.log("Stopping Vapi on cleanup");
        vapiRef.current?.stop();
      }
    };
  }, []);

  const startAssistant = useCallback(async () => {
    if (!vapiRef.current) {
      console.error("Cannot start assistant: Vapi not initialized");
      toast({
        title: "Voice Assistant Error",
        description: "Voice assistant is not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
    if (!assistantId) {
      const errorMsg = "Assistant ID not found in environment variables";
      console.error(errorMsg);
      setError(errorMsg);
      toast({
        title: "Configuration Error",
        description: "Voice assistant is not properly configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    // Check for microphone permissions
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone permission granted");
    } catch (error) {
      console.error("Microphone permission denied:", error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use the voice assistant.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Starting Vapi assistant with assistant ID:", assistantId);
      
      // Use the pre-configured assistant ID instead of custom config
      await vapiRef.current.start(assistantId);
      
      console.log("Assistant started successfully!");
    } catch (e) {
      console.error("Error starting assistant:", e);
      console.error("Full error details:", JSON.stringify(e, null, 2));
      
      // If using assistant ID fails, try with a basic configuration
      console.log("Trying fallback configuration...");
      try {
        const fallbackConfig = {
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en-US",
          },
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are MeNova, a helpful assistant for women's health and menopause support. Keep responses brief and supportive."
              }
            ]
          },
          voice: {
            provider: "playht",
            voiceId: "jennifer"
          }
        };
        
        await vapiRef.current.start(fallbackConfig);
        console.log("Fallback configuration worked!");
        
        toast({
          title: "Voice Assistant Started",
          description: "Using fallback configuration. Some features may be limited.",
          variant: "default",
        });
      } catch (fallbackError) {
        console.error("Fallback configuration also failed:", fallbackError);
        const errorMessage = e instanceof Error ? e.message : "Could not start voice assistant";
        setError(errorMessage);
        toast({
          title: "Voice Assistant Error",
          description: "Both primary and fallback configurations failed. Please check your internet connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, []);

  const stopAssistant = useCallback(() => {
    if (vapiRef.current) {
      console.log("Stopping Vapi assistant");
      vapiRef.current?.stop();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!vapiRef.current) {
      console.error("Cannot speak: Vapi not initialized");
      return;
    }
    console.log("Speaking text:", text);
    vapiRef.current?.speak(text);
  }, []);

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

// Custom hook to use the Vapi context - moved to end for Fast Refresh compatibility
export function useVapi(): VapiContextType {
  const context = useContext(VapiContext);
  if (!context) throw new Error('useVapi must be used within a VapiProvider');
  return context;
}
