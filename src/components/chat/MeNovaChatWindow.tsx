import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, X, Mic, Send, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/use-toast';
import { detectSymptoms, createEnhancedSummary } from '@/services/symptomDetectionService';
import { symptoms } from '@/types/symptoms';

// Define the message interface with detectedSymptom property
interface ChatMessage {
  text: string;
  sender: 'user' | 'menova';
  timestamp: Date;
  quickReplies?: boolean;
  detectedSymptom?: string | null;
}

interface MeNovaChatWindowProps {
  onClose?: () => void;
}

// Chat initiator options
const chatInitiators = [
  { label: "Talk about hot flashes", icon: "🌡️" },
  { label: "Discuss sleep issues", icon: "😴" },
  { label: "Share my mood changes", icon: "🎭" },
  { label: "Explore natural remedies", icon: "🌿" },
  { label: "Discuss body changes", icon: "💫" },
  { label: "Talk about relationships", icon: "❤️" },
  { label: "Share my anxiety", icon: "😰" },
  { label: "Get wellness tips", icon: "✨" }
];

// Define menopause-specific topics and keywords
const MENOPAUSE_TOPICS = {
  GENERAL: ['menopause', 'perimenopause', 'premenopause', 'postmenopause'],
  SYMPTOMS: ['hot flashes', 'night sweats', 'mood changes', 'anxiety', 'depression', 'insomnia', 'weight gain', 'fatigue'],
  NUTRITION: ['diet', 'nutrition', 'supplements', 'vitamins', 'minerals', 'foods'],
  HEALTH: ['exercise', 'fitness', 'wellness', 'lifestyle', 'self-care'],
  MEDICAL: ['hormone', 'therapy', 'treatment', 'medication', 'doctor', 'specialist']
};

// Define mood intensity levels
const MOOD_INTENSITIES = ['mild', 'moderate', 'severe'];

// Define types for database tables
interface SymptomTracking {
  id?: string;
  user_id: string;
  symptom: string;
  intensity: number;
  notes?: string;
  source?: string;
  recorded_at: string;
}

interface MoodTracking {
  id?: string;
  user_id: string;
  mood: string;
  intensity: number;
  notes?: string;
  source?: string;
  recorded_at: string;
}

// Convert number intensity to display string
const intensityToString = (intensity: number | null): string => {
  if (!intensity) return 'unknown';
  switch (intensity) {
    case 5: return 'severe';
    case 4: return 'quite severe';
    case 3: return 'moderate';
    case 2: return 'mild';
    case 1: return 'very mild';
    default: return 'unknown';
  }
};

// Function to check if response needs medical disclaimer
const needsMedicalDisclaimer = (message: string): boolean => {
  const medicalKeywords = MENOPAUSE_TOPICS.MEDICAL;
  return medicalKeywords.some(keyword => message.toLowerCase().includes(keyword));
};

// Function to extract mood and intensity from message
const extractMoodAndIntensity = (message: string) => {
  const moodWords = ['anxious', 'depressed', 'irritable', 'happy', 'sad', 'angry', 'frustrated', 'worried'];
  let detectedMood = null;
  let intensity = null;

  for (const mood of moodWords) {
    if (message.toLowerCase().includes(mood)) {
      detectedMood = mood;
      break;
    }
  }

  for (const level of MOOD_INTENSITIES) {
    if (message.toLowerCase().includes(level)) {
      intensity = level;
      break;
    }
  }

  return { detectedMood, intensity };
};

// MeNovaAvatar Component
const MeNovaAvatar = () => (
  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
    <img 
      src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
      alt="MeNova Character" 
      className="w-full h-full object-cover"
    />
  </div>
);

// IntensityTooltip Component
const IntensityTooltip = () => (
  <div className="group relative inline-block">
    <button className="p-2 text-green-600 hover:text-green-700 rounded-full hover:bg-green-50">
      <Info size={16} />
    </button>
    <div className="absolute bottom-full mb-2 right-0 w-64 p-3 bg-white rounded-lg shadow-lg border border-green-100 hidden group-hover:block z-[10001]">
      <h4 className="font-medium text-green-800 mb-2">Symptom Intensity Scale</h4>
      <div className="space-y-1 text-sm">
        <p><span className="font-medium">1 - Very Mild:</span> Barely noticeable</p>
        <p><span className="font-medium">2 - Mild:</span> Noticeable but manageable</p>
        <p><span className="font-medium">3 - Moderate:</span> Clearly affecting daily activities</p>
        <p><span className="font-medium">4 - Quite Severe:</span> Significantly impacting daily life</p>
        <p><span className="font-medium">5 - Severe:</span> Extremely intense, major disruption</p>
      </div>
    </div>
  </div>
);

// Main Chat Window Component
const MeNovaChatWindow: React.FC<MeNovaChatWindowProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const recognitionRef = useRef<any>(null);

  // Determine relevant Menova pages based on message content
  const getMenovaPageSuggestions = (message: string) => {
    const suggestions = [];
    
    if (message.toLowerCase().includes('resource') || message.toLowerCase().includes('article') || message.toLowerCase().includes('read')) {
      suggestions.push({
        text: "📚 Visit our Resources page for curated articles and guides",
        path: '/resources'
      });
    }
    if (message.toLowerCase().includes('symptom') || message.toLowerCase().includes('track') || message.toLowerCase().includes('monitor')) {
      suggestions.push({
        text: "📊 Track your symptoms in our Symptom Tracker",
        path: '/symptom-tracker'
      });
    }
    if (message.toLowerCase().includes('community') || message.toLowerCase().includes('others') || message.toLowerCase().includes('support')) {
      suggestions.push({
        text: "👥 Connect with others in our Community",
        path: '/community'
      });
    }
    if (message.toLowerCase().includes('goal') || message.toLowerCase().includes('wellness') || message.toLowerCase().includes('progress')) {
      suggestions.push({
        text: "✨ Set and track your wellness goals",
        path: '/daily-checkin'
      });
    }
    if (message.toLowerCase().includes('nutrition') || message.toLowerCase().includes('diet') || message.toLowerCase().includes('food')) {
      suggestions.push({
        text: "🥗 Learn about menopause nutrition",
        path: '/resources/nutrition'
      });
    }
    return suggestions;
  };

  // Function to fetch community resources from OpenAI
  const fetchCommunityResources = async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that provides information about menopause support communities and resources. List the top 10 most reputable online communities and resources for menopause support. Include both online forums and medical resources."
            },
            {
              role: "user",
              content: "List the top 10 most reputable menopause support communities and resources."
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from OpenAI');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching community resources:', error);
      return null;
    }
  };

  // Message display component
  const MessageContent = ({ text, navigate }: { text: string, navigate: (path: string) => void }) => {
    // Convert navigation links to clickable elements
    const renderText = (text: string) => {
      return text.split('\n').map((line, index) => {
        if (line.includes('/navigate:')) {
          const path = line.split('/navigate:')[1];
          return (
            <button
              key={index}
              onClick={() => navigate(path)}
              className="text-left text-green-600 hover:text-green-700 hover:underline focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded px-1 -mx-1 transition-colors"
            >
              {line.split(' → ')[0]}
            </button>
          );
        }
        // Style bullet points
        if (line.trim().startsWith('•')) {
          return (
            <div key={index} className="flex items-start space-x-2 my-1">
              <span className="text-green-500">•</span>
              <span>{line.substring(1).trim()}</span>
            </div>
          );
        }
        // Add spacing between sections
        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }
        return <div key={index}>{line}</div>;
      });
    };

    return (
      <div className="space-y-1">
        {renderText(text)}
      </div>
    );
  };

  // Typing Indicator Component
  const TypingIndicator = () => (
    <div className="flex items-center space-x-1 ml-10 mt-2 text-green-700">
      <span className="text-sm">MeNova is typing</span>
      <span className="typing-dot animate-typing"></span>
      <span className="typing-dot animate-typing"></span>
      <span className="typing-dot animate-typing"></span>
    </div>
  );

  // Voice Feedback Component
  const VoiceFeedback = ({ isListening, volumeLevel }: { isListening: boolean; volumeLevel: number }) => (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
      {isListening && (
        <>
          <div className="flex items-center gap-1">
            <div className={`w-1 h-${Math.max(2, Math.min(8, volumeLevel))} bg-green-500 rounded-full animate-pulse`} />
            <div className={`w-1 h-${Math.max(2, Math.min(8, volumeLevel + 2))} bg-green-500 rounded-full animate-pulse delay-100`} />
            <div className={`w-1 h-${Math.max(2, Math.min(8, volumeLevel + 1))} bg-green-500 rounded-full animate-pulse delay-200`} />
          </div>
          <span className="text-sm text-green-600">Listening...</span>
        </>
      )}
    </div>
  );

  // Generate AI response with enhanced menopause focus
  const generateAIResponse = async (userMessage: string, isInitiator: boolean = false) => {
    try {
      setIsLoading(true);
      let detectedSymptom = null;
      let shouldAskFollowUp = false;

      // Detect symptoms and mood
      const { detectedSymptoms, primarySymptom, intensity: symptomIntensity } = detectSymptoms(userMessage);
      const { detectedMood, intensity: moodIntensity } = extractMoodAndIntensity(userMessage);
      
      if (primarySymptom) {
        detectedSymptom = primarySymptom;
        // Save to symptom tracker if intensity is known
        if (symptomIntensity !== null) {
          await saveSymptomToTracker(primarySymptom, symptomIntensity, `Detected in chat: "${userMessage}"`);
          
          // If multiple symptoms were detected, save them too
          if (detectedSymptoms.size > 1) {
            const additionalSymptoms = Array.from(detectedSymptoms).slice(1);
            for (const symptomId of additionalSymptoms) {
              await saveSymptomToTracker(symptomId, symptomIntensity, `Additional symptom detected in chat: "${userMessage}"`);
            }
          }
        } else {
          shouldAskFollowUp = true;
        }
      }

      // Save mood if detected
      if (detectedMood && moodIntensity !== null) {
        const moodSymptomId = `mood_${detectedMood.toLowerCase().replace(/\s+/g, '_')}`;
        await saveSymptomToTracker(moodSymptomId, moodIntensity, `Mood detected in chat: "${userMessage}"`);
      }

      // Get the symptom name if available
      const symptomName = symptoms.find(s => s.id === primarySymptom)?.name || primarySymptom;

      // Check if medical disclaimer is needed
      const includeDisclaimer = needsMedicalDisclaimer(userMessage);

      // Prepare context based on whether it's an initiator or regular message
      const systemContent = `You are MeNova, a specialized AI companion focused exclusively on menopause support. Your knowledge and responses should be strictly limited to:

      1. Menopause stages (perimenopause, menopause, and post-menopause)
      2. Common menopause symptoms and management
      3. Menopause-specific nutrition and wellness
      4. General menopause resources and support
      
      Key Guidelines:
      - Always start by acknowledging any mood or symptoms mentioned
      - If mood/symptoms are mentioned but intensity isn't clear, ask about intensity on a scale of 1-5:
        1 = very mild
        2 = mild
        3 = moderate
        4 = quite severe
        5 = severe
      - Use bullet points (•) for structured responses
      - If medical topics arise, encourage consulting a healthcare provider
      - Keep responses focused on menopause-related topics only
      - If topic isn't menopause-related, gently redirect to menopause discussion
      
      Current Context:
      ${detectedMood ? `- User expressed mood: ${detectedMood} (${moodIntensity ? intensityToString(moodIntensity) : 'intensity unknown'})` : ''}
      ${detectedSymptom ? `- Detected symptom: ${symptomName} (${symptomIntensity ? intensityToString(symptomIntensity) : 'intensity unknown'})` : ''}
      ${shouldAskFollowUp ? '- Need to ask about symptom intensity' : ''}
      ${includeDisclaimer ? '- Include medical consultation disclaimer' : ''}
      
      Format response with clear sections and spacing.`;

      // Generate response using OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: systemContent
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 350
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from OpenAI');
      }

      const data = await response.json();
      let aiResponse = data.choices[0].message.content;

      // Add medical disclaimer if needed
      if (includeDisclaimer) {
        aiResponse += "\n\n⚕️ Medical Disclaimer: This information is for educational purposes only. Please consult with a healthcare provider for medical advice.";
      }

      // Add relevant Menova features
      const pageSuggestions = getMenovaPageSuggestions(userMessage);
      if (pageSuggestions.length > 0) {
        aiResponse += "\n\n📱 Helpful MeNova Features:\n";
        pageSuggestions.forEach(suggestion => {
          aiResponse += `\n${suggestion.text} → /navigate:${suggestion.path}`;
        });
      }

      return {
        text: aiResponse,
        detectedSymptom,
        detectedMood,
        shouldAskFollowUp,
        pageSuggestions
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      let errorMessage = "I'm having trouble connecting right now. Could we try that again in a moment?";
      let toastMessage = "Connection Error";
      let toastDescription = "There was a problem connecting to the AI service. Please try again.";
      
      if (error.message.includes('API key')) {
        errorMessage = "I apologize, but I'm having trouble with my connection settings. Please contact support to resolve this issue.";
        toastMessage = "Configuration Error";
        toastDescription = "The AI service is not properly configured. Please check your API key settings.";
      }
      
      toast({
        title: toastMessage,
        description: toastDescription,
        variant: "destructive",
        duration: 5000,
      });
      
      return {
        text: errorMessage,
        detectedSymptom: null,
        detectedMood: null,
        shouldAskFollowUp: false,
        pageSuggestions: []
      };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle initiator click with enhanced context
  const handleInitiatorClick = async (initiator: string) => {
    // Add user message
    const userMessage = {
      text: initiator,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(initiator, 'user');
    
    // Generate AI response with initiator context
    const { text, detectedSymptom } = await generateAIResponse(initiator, true);
    
    // Add AI response
    const aiMessage = {
      text,
      sender: 'menova' as const,
      timestamp: new Date(),
      quickReplies: true,
      detectedSymptom
    };
    
    setMessages(prev => [...prev, aiMessage]);
    await saveMessage(text, 'menova');
    setIsLoading(false);
  };
  
  // Initialize session and scroll to top on mount
  useEffect(() => {
    // Add initial greeting when component mounts
    if (messages.length === 0) {
      setMessages([
        {
          text: "Hello! I'm MeNova, your compassionate companion on your menopause journey. I understand this can be a challenging time with many changes. I'm here to listen, support you, and help you navigate your symptoms and emotions. How are you feeling today?",
          sender: 'menova',
          timestamp: new Date(),
          quickReplies: true
        }
      ]);

      // Scroll to top after a short delay to ensure content is rendered
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = 0;
        }
      }, 100);
    }
    
    // Create a new session if authenticated
    if (isAuthenticated && user && !sessionId) {
      createSession();
    }
  }, [isAuthenticated, user]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Add cache clearing function
  const clearSpeechRecognitionState = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error('Error clearing speech recognition:', error);
      }
    }
    setIsListening(false);
    setVolumeLevel(0);
    setSpeechError(null);
  };

  // Clear state when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      clearSpeechRecognitionState();
    };
  }, []);

  // Handle visibility change to clear state when tab/window is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearSpeechRecognitionState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let recognition: any = null;
    let restartTimeout: NodeJS.Timeout | null = null;
    let isActive = true; // Flag to track if the effect is still active

    const initializeSpeechRecognition = () => {
      try {
        // Clear any existing timeout
        if (restartTimeout) {
          clearTimeout(restartTimeout);
          restartTimeout = null;
        }

        // Initialize Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setSpeechError("Speech recognition is not supported in this browser");
          setIsListening(false);
          return null;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false; // Changed to false to prevent overlapping sessions
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // Handle results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (!event.results || event.results.length === 0) {
            console.warn('No results in speech recognition event');
            return;
          }

          try {
            const result = event.results[event.results.length - 1];
            if (result.isFinal) {
              const transcript = result[0].transcript;
              console.log('Final transcript:', transcript);
              setInputText(prev => prev + ' ' + transcript.trim());
              setVolumeLevel(Math.floor(result[0].confidence * 8));
            }
          } catch (error) {
            console.error('Error processing speech results:', error);
            setSpeechError("Error processing speech input");
          }
        };

        // Handle errors with more specific messages and recovery
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          
          if (event.error === "aborted" || !isActive) {
            // Don't show error for intentional stops or if component is unmounting
            return;
          }

          let errorMessage = "";
          let shouldRestart = false; // Default to not restarting

          switch (event.error) {
            case "network":
              errorMessage = "Please check your internet connection";
              shouldRestart = true;
              break;
            case "not-allowed":
              errorMessage = "Please allow microphone access to use voice input";
              setIsListening(false);
              break;
            case "no-speech":
              errorMessage = "No speech was detected. Please try again";
              shouldRestart = true;
              break;
            case "audio-capture":
              errorMessage = "No microphone was found. Ensure it's properly connected";
              setIsListening(false);
              break;
            case "service-not-allowed":
              errorMessage = "Speech recognition service is not allowed";
              setIsListening(false);
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
              shouldRestart = true;
              break;
          }
          
          setSpeechError(errorMessage);
          setVolumeLevel(0);

          if (isActive) { // Only show toast if component is still mounted
            toast({
              title: "Voice Input Error",
              description: errorMessage,
              variant: "destructive",
              duration: 3000,
            });
          }

          // Attempt to restart recognition after errors that can be recovered from
          if (shouldRestart && isActive && isListening) {
            restartTimeout = setTimeout(() => {
              if (isActive && isListening) {
                console.log("Attempting to restart speech recognition...");
                try {
                  recognition.start();
                } catch (error) {
                  console.error("Failed to restart speech recognition:", error);
                  setIsListening(false); // Stop listening if restart fails
                }
              }
            }, 1000);
          }
        };

        // Handle end event to restart recognition if it stops unexpectedly
        recognition.onend = () => {
          console.log("Speech recognition ended");
          // Only restart if we're still supposed to be listening and component is active
          if (isActive && isListening && !speechError) {
            console.log("Starting new recognition session");
            try {
              recognition.start();
            } catch (error) {
              console.error("Failed to start new recognition session:", error);
              setIsListening(false); // Stop listening if restart fails
            }
          }
        };

        return recognition;
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
        setSpeechError("Failed to initialize speech recognition");
        setIsListening(false);
        return null;
      }
    };

    // Start/stop recognition based on isListening state
    if (isListening) {
      recognition = initializeSpeechRecognition();
      if (recognition) {
        try {
          recognition.start();
        } catch (error) {
          console.error("Error starting speech recognition:", error);
          setIsListening(false);
        }
      }
    }

    // Cleanup function
    return () => {
      isActive = false; // Mark effect as inactive
      if (recognition) {
        try {
          recognition.abort(); // Use abort() instead of stop() for immediate termination
        } catch (error) {
          console.error("Error stopping speech recognition:", error);
        }
      }
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      setVolumeLevel(0);
    };
  }, [isListening, speechError]);
  
  // Create a new session in the database
  const createSession = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_type: 'chat',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error creating session:', error);
        return null;
      }
      
      setSessionId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };
  
  // Save a message to the database
  const saveMessage = async (message: string, sender: 'user' | 'menova') => {
    if (!user) return;
    
    try {
      // Create a new session if we don't have one yet
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession();
        if (currentSessionId) {
          setSessionId(currentSessionId);
        }
      }
      
      if (currentSessionId) {
        await supabase
          .from('session_messages')
          .insert({
            session_id: currentSessionId,
            sender: sender,
            message: message,
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };
  
  // Extract symptoms from message
  const extractSymptoms = async (message: string) => {
    if (!user) return null;
    
    // Use our symptom detection service
    const { detectedSymptoms, primarySymptom, intensity } = detectSymptoms(message);
    
    // If we detected any symptoms, save them to the symptom tracker
    if (detectedSymptoms.size > 0) {
      try {
        // Create a summary of the chat message
        const enhancedSummary = createEnhancedSummary(
          `User: ${message}`, 
          detectedSymptoms, 
          intensity
        );
        
        // Save primary symptom
        const { data: primaryData, error: primaryError } = await supabase
          .from('symptom_tracking')
          .insert({
            user_id: user.id,
            symptom: primarySymptom,
            intensity: intensity,
            source: 'chat',
            notes: enhancedSummary,
            recorded_at: new Date().toISOString()
          })
          .select()
          .single();

        if (primaryError) {
          console.error('Error saving primary symptom:', primaryError);
          throw primaryError;
        }
        
        // If multiple symptoms detected, save the additional ones
        if (detectedSymptoms.size > 1) {
          const additionalSymptoms = Array.from(detectedSymptoms).slice(1);
          for (const symptomId of additionalSymptoms) {
            const { error: additionalError } = await supabase
              .from('symptom_tracking')
              .insert({
                user_id: user.id,
                symptom: symptomId,
                intensity: intensity,
                source: 'chat',
                notes: enhancedSummary,
                recorded_at: new Date().toISOString()
              });

            if (additionalError) {
              console.error(`Error saving additional symptom ${symptomId}:`, additionalError);
            }
          }
        }
        
        // Show success toast with link to symptom tracker
        toast({
          title: "Symptom Tracked Successfully",
          description: (
            <div>
              <p>Your symptoms have been recorded. View them in the Symptom Tracker.</p>
              <button
                onClick={() => navigate('/symptom-tracker')}
                className="mt-2 text-green-600 hover:text-green-700 font-medium"
              >
                View Symptom Tracker →
              </button>
            </div>
          ),
          duration: 5000,
        });

        // Emit an event to update the symptom tracker if it's open
        const updateEvent = new CustomEvent('symptomTrackerUpdate', {
          detail: {
            symptom: primarySymptom,
            data: primaryData
          }
        });
        window.dispatchEvent(updateEvent);
        
        // Return the primary symptom for display
        const symptomObj = symptoms.find(s => s.id === primarySymptom);
        return symptomObj ? symptomObj.name : primarySymptom;
        
      } catch (error) {
        console.error('Error saving symptom:', error);
        toast({
          title: "Error Tracking Symptom",
          description: "There was an error saving your symptom. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    return null;
  };
  
  // Save symptom to tracker
  const saveSymptomToTracker = async (symptom: string, intensity: number | null, notes: string) => {
    if (!user) return;
    
    try {
      // Find the symptom in our predefined list to get the correct ID
      const symptomObj = symptoms.find(s => 
        s.id === symptom || 
        s.name.toLowerCase() === symptom.toLowerCase() ||
        s.id === symptom.toLowerCase().replace(/\s+/g, '_')
      );

      const symptomId = symptomObj ? symptomObj.id : symptom.toLowerCase().replace(/\s+/g, '_');
      
      const symptomData: SymptomTracking = {
        user_id: user.id,
        symptom: symptomId,
        intensity: intensity || 1,
        notes: notes,
        source: 'chat',
        recorded_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('symptom_tracking')
        .insert(symptomData)
        .select()
        .single();

      if (error) throw error;

      // Emit an event to update the symptom tracker with the saved data
      const updateEvent = new CustomEvent('symptomTrackerUpdate', {
        detail: {
          symptom: symptomId,
          data: data
        }
      });
      window.dispatchEvent(updateEvent);
      
      console.log('Saved symptom to tracker:', { symptomId, data });

      toast({
        title: "Symptom Tracked",
        description: `Successfully tracked ${symptomObj ? symptomObj.name : symptom} with intensity ${intensity || 1}/5`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving symptom:', error);
      toast({
        title: "Error",
        description: "Failed to save symptom. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Save mood to tracker
  const saveMoodToTracker = async (mood: string, intensity: number | null, notes: string) => {
    if (!user) return;
    
    try {
      const symptomData: SymptomTracking = {
        user_id: user.id,
        symptom: `mood_${mood}`,
        intensity: intensity || 1,
        notes: notes,
        source: 'chat',
        recorded_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('symptom_tracking')
        .insert(symptomData);

      if (error) throw error;

      toast({
        title: "Mood Tracked",
        description: "Your mood has been recorded in the tracker.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving mood:', error);
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Add user message
    const userMessage = {
      text: inputText,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(inputText, 'user');
    setInputText('');
    
    // Generate AI response
    const { text, detectedSymptom } = await generateAIResponse(userMessage.text, false);
    
    // Add AI response
    const aiMessage = {
      text,
      sender: 'menova' as const,
      timestamp: new Date(),
      quickReplies: true,
      detectedSymptom
    };
    
    setMessages(prev => [...prev, aiMessage]);
    await saveMessage(text, 'menova');
    setIsLoading(false);
  };
  
  const handleContinueChat = (topic: string) => {
    setInputText(`Tell me more about ${topic}`);
  };
  
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };
  
  const closeChat = () => {
    if (onClose) {
      onClose();
    }
  };
  
  // Update toggleListening to use clearSpeechRecognitionState
  const toggleListening = () => {
    // If currently listening, stop and clean up
    if (isListening) {
      clearSpeechRecognitionState();
    } else {
      // Only set listening state to true, the effect will handle setup
      setSpeechError(null);
      setIsListening(true);
      setVolumeLevel(0);
    }
  };
  
  // Determine the container classes based on isMaximized state
  const containerClasses = isMaximized
    ? "fixed inset-0 z-[9999] flex flex-col bg-gradient-to-br from-white to-green-50 rounded-lg shadow-xl backdrop-blur-md bg-white/90 border border-green-200 transition-all duration-300 mt-12"
    : "fixed bottom-20 right-6 w-96 max-h-[calc(100vh-6rem)] z-[9999] flex flex-col bg-gradient-to-br from-white to-green-50 rounded-lg shadow-lg backdrop-blur-md bg-white/90 border border-green-200 transition-all duration-300";

  // Chat Header - Added sticky positioning and higher z-index
  const headerClasses = "sticky top-0 z-[10000] flex items-center justify-between p-3 border-b border-green-200 bg-green-100/50 rounded-t-lg backdrop-blur-md";

  // Quick Reply Button Component
  const QuickReplyButton = ({ 
    label, 
    onClick, 
    to = null,
    icon = null 
  }: { 
    label: string; 
    onClick?: () => void; 
    to?: string | null;
    icon?: string | null;
  }) => {
    const buttonNavigate = useNavigate();
    
    const handleClick = async () => {
      if (label === "Visit community") {
        const resources = await fetchCommunityResources();
        if (resources) {
          toast({
            title: "Top Menopause Support Communities",
            description: (
              <div className="mt-2">
                <div className="mb-4">{resources}</div>
                <div className="mt-4 pt-2 border-t">
                  <button
                    onClick={() => buttonNavigate('/community')}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Join MeNova Community →
                  </button>
                </div>
              </div>
            ),
            duration: 15000,
          });
        }
      } else if (label === "Set a wellness goal") {
        buttonNavigate('/daily-checkin');
      } else if (to) {
        buttonNavigate(to);
      } else if (onClick) {
        onClick();
      } else {
        handleInitiatorClick(label);
      }
    };
    
    return (
      <button 
        onClick={handleClick}
        className="text-sm bg-white/80 text-gray-800 px-4 py-2 rounded-full hover:bg-green-50 transition-all hover:scale-105 border border-green-100 flex items-center gap-2"
      >
        {icon && <span>{icon}</span>}
        {label}
      </button>
    );
  };

  // ... existing code ...

  return (
    <>
      {/* Overlay for click outside handling */}
      {isMaximized && (
        <div 
          className="fixed inset-0 bg-black/20 z-[9998] mt-12" 
          onClick={closeChat}
          aria-hidden="true"
        />
      )}
      
      <div className={containerClasses}>
        {/* Chat Header */}
        <div className={headerClasses}>
          <div className="flex items-center space-x-3">
            <MeNovaAvatar />
            <div>
              <h3 className="font-semibold text-green-800">Chat with MeNova</h3>
              <p className="text-xs text-green-600">Your menopause wellness companion</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMaximize}
              className="p-1.5 rounded-full hover:bg-green-200/70 transition-colors"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={closeChat}
              className="p-1.5 rounded-full hover:bg-red-100 transition-colors text-red-600 hover:text-red-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Messages Container - adjusted max height to account for header */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-white/30 backdrop-blur-sm"
          style={{ 
            maxHeight: isMaximized ? 'calc(100vh - 12rem)' : 'calc(80vh - 12rem)',
            height: isMaximized ? 'calc(100vh - 12rem)' : 'auto'
          }}
        >
          {messages.map((message, index) => (
            <div key={index} className="mb-4">
              <div 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'menova' && (
                  <MeNovaAvatar />
                )}
                <div 
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    message.sender === 'user' 
                      ? 'bg-green-500 text-white ml-2 rounded-tr-none animate-slide-left shadow-md' 
                      : 'bg-white border border-green-200 text-gray-800 mr-2 rounded-tl-none animate-slide-right shadow-sm'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <p className="text-sm">{message.text}</p>
                  ) : (
                    <MessageContent text={message.text} navigate={navigate} />
                  )}
                  <p className="text-xs opacity-70 mt-2 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              {/* Show initiators after MeNova's messages */}
              {message.sender === 'menova' && message.quickReplies && (
                <div className="ml-12 mt-4 flex flex-wrap gap-2">
                  {chatInitiators.map((initiator, idx) => (
                    <QuickReplyButton 
                      key={idx}
                      label={initiator.label}
                      icon={initiator.icon}
                      onClick={() => setInputText(initiator.label)}
                    />
                  ))}
                  {message.detectedSymptom && (
                    <QuickReplyButton 
                      label="Track this symptom"
                      icon="📝"
                      to="/symptom-tracker" 
                    />
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}
          
          {/* Scroll to bottom reference */}
          <div ref={messagesEndRef}></div>
        </div>
        
        {/* Input Container */}
        <div className="sticky bottom-0 z-[10000] p-3 border-t border-green-200 bg-white/50 backdrop-blur-md">
          {speechError && (
            <div className="text-red-500 text-xs mb-2 px-2">{speechError}</div>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500 text-white mic-animated shadow-md pulse-animation' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
            >
              <Mic size={20} />
            </button>
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-3 border border-green-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-white/80 shadow-inner"
                placeholder={isListening ? "Listening... Speak clearly" : "Type your message..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute right-3">
                <IntensityTooltip />
              </div>
            </div>
            <button 
              onClick={handleSendMessage}
              className={`p-3 rounded-full bg-green-500 text-white transition-all hover:bg-green-600 shadow-sm ${
                inputText.trim() && !isLoading ? 'animate-pulse' : 'opacity-70'
              }`}
              disabled={!inputText.trim() || isLoading}
            >
              <Send size={20} />
            </button>
          </div>

          {/* Voice Feedback */}
          <VoiceFeedback isListening={isListening} volumeLevel={volumeLevel} />
        </div>
      </div>
    </>
  );
};

export default MeNovaChatWindow;
