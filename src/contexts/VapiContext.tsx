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

        console.log("Initializing Vapi SDK with API key");
        
        // Initialize Vapi with API key
        vapiRef.current = new Vapi(apiKey);
        
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
            const errorMessage = err?.message || "An error occurred with the voice assistant";
            setError(errorMessage);
            toast({
              title: "Voice Assistant Error",
              description: errorMessage,
              variant: "destructive",
            });
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

    try {
      console.log("Starting Vapi assistant with config:");
      
      // Configure assistant options
      const assistantConfig = {
        name: "MeNova Assistant",
        firstMessage: "Hi there! I'm Mee-Nova, your companion through menopause. How are you feeling today?",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are MeNova (pronounced "Mee-Nova"), an empathetic AI assistant helping women through their menopause journey.

Your role is to:
1. Provide emotional support and understanding
2. Help track symptoms and wellness progress
3. Offer evidence-based information about menopause
4. Guide users through coping strategies and lifestyle changes

Keep your responses:
- Warm and empathetic
- Clear and concise (this is a voice conversation)
- Natural and conversational (use phrases like "Hmm...", "I understand", "Let me think...")
- Focused on the user's immediate needs and feelings

Important: Always pronounce your name as "Mee-Nova" (two distinct syllables: "Mee" and "Nova").

If the user shares symptoms or experiences, acknowledge them with empathy before providing guidance.
Always maintain a supportive and non-judgmental tone.`
            }
          ]
        },
        voice: {
          provider: "11labs",
          voiceId: "rachel"
        },
        firstMessageMode: "assistant-speaks-first",
        backgroundDenoisingEnabled: true,
        startSpeakingPlan: {
          waitSeconds: 0.4,
          smartEndpointingEnabled: true,
          transcriptionEndpointingPlan: {
            onPunctuationSeconds: 0.1,
            onNoPunctuationSeconds: 1.5,
            onNumberSeconds: 0.5
          }
        }
      };
      
      try {
        console.log("Starting Vapi assistant with config:", assistantConfig);
        await vapiRef.current.start(assistantConfig);
      } catch (e) {
        console.error("Error starting assistant:", e);
        const errorMessage = e instanceof Error ? e.message : "Could not start voice assistant";
        setError(errorMessage);
        toast({
          title: "Voice Assistant Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error starting assistant:", e);
      const errorMessage = e instanceof Error ? e.message : "Could not start voice assistant";
      setError(errorMessage);
      toast({
        title: "Voice Assistant Error",
        description: errorMessage,
        variant: "destructive",
      });
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
