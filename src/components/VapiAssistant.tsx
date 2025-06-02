import { useState, forwardRef, useImperativeHandle, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, MicOff, Speaker, Volume2, VolumeX, Send } from 'lucide-react';
import { useVapi } from '@/contexts/VapiContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useLocation } from 'react-router-dom';
import { symptoms } from '@/types/symptoms';
import { detectSymptoms, createEnhancedSummary, createSymptomTitle, formatDetectedSymptoms } from '@/services/symptomDetectionService';
import { audioRecorder } from '@/services/audioRecorderService';
import { convertSpeechToText } from '@/services/openaiService';
import { createGoalsFromSymptoms, getSymptomMotivationalMessage } from '@/services/symptomToGoalService';

interface VapiAssistantProps {
  onSpeaking?: (speaking: boolean) => void;
  className?: string;
}

interface Message {
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isSystemMessage?: boolean;
  isEnhancedTranscription?: boolean;
}

const VapiAssistant = forwardRef<any, VapiAssistantProps>(({ onSpeaking, className }, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savingToTracker, setSavingToTracker] = useState(false);
  const [dualTranscriptionActive, setDualTranscriptionActive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [autoStartTriggered, setAutoStartTriggered] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [processedMessageIds] = useState(new Set<string>());
  const [lastMessageKey, setLastMessageKey] = useState<string>('');
  const messageCache = useRef(new Set<string>());
  const [isWideView, setIsWideView] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const hasInitialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initialMessageSent = useRef(false);
  const INITIAL_GREETING = "Hello! I'm Mee-Nova, your companion through menopause. How are you feeling today?";
  const messageQueue = useRef<{text: string, sender: 'user' | 'ai'}[]>([]);
  const processingMessage = useRef(false);

  const {
    isSpeaking,
    isListening,
    sdkLoaded,
    error,
    startAssistant,
    stopAssistant,
    vapiRef,
  } = useVapi();

  // Check for auto-start parameter from location state
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState?.autoStartVoice && !autoStartTriggered) {
      // Auto-open dialog when requested from navigation
      console.log("Auto-starting voice assistant from location state");
      setAutoStartTriggered(true);
      setTimeout(() => {
        handleAssistantClick();
      }, 800);
    }
  }, [location.state]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // When voice chat is opened, make sure the assistant initializes
  useEffect(() => {
    if (open && sdkLoaded && !isInitialized) {
      console.log("🚀 Initializing assistant");
      startAssistant();
      setIsInitialized(true);
      
      // Clear any old messages and start fresh
      setMessages([{
        text: INITIAL_GREETING,
        sender: 'ai',
        timestamp: new Date()
      }]);

      // Have assistant speak the greeting
      if (vapiRef.current?.sendTextMessage) {
        setTimeout(() => {
          vapiRef.current.sendTextMessage(INITIAL_GREETING);
        }, 1000);
      }
    } else if (!open && isInitialized) {
      console.log("🛑 Stopping assistant");
      stopAssistant();
      setIsInitialized(false);
      initialMessageSent.current = false;
      // Clear messages when closing
      setMessages([]);
    }
  }, [open, sdkLoaded, isInitialized, startAssistant, stopAssistant]);

  // Connect microphone button to Vapi's listening state
  useEffect(() => {
    setUserSpeaking(isListening);
  }, [isListening]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a new session if needed
  const ensureSession = async (userId: string) => {
    if (sessionId) return sessionId;
    
    console.log("Creating new voice assistant session");
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({ user_id: userId, session_type: 'voice_assistant', started_at: new Date().toISOString(), title: 'Voice Assistant Session' })
      .select('id')
      .single();
    if (error) throw error;
    setSessionId(data.id);
    return data.id;
  };

  // Save a message to Supabase
  const saveMessage = async (userId: string, sender: 'user' | 'ai', text: string, timestamp: Date) => {
    const sid = await ensureSession(userId);
    console.log(`Saving ${sender} message to session ${sid}: ${text.substring(0, 30)}...`);
    await supabase.from('session_messages').insert({
      message: text,
      sender,
      session_id: sid,
      timestamp: timestamp.toISOString(),
    });
  };

  const handleAssistantClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log("Opening voice assistant dialog");
      setOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Create a new message and add it to the chat
    const newMessage = {
      text: message,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // Save to database if authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await saveMessage(session.user.id, 'user', message, new Date());
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
    
    // Send to Vapi for processing and ensure voice response
    if (vapiRef.current) {
      // Set speaking mode to ensure voice response
      if (!audioMuted && vapiRef.current.unmute) {
        vapiRef.current.unmute();
      }
      // Send the message for processing with voice response
      vapiRef.current.sendTextMessage(message, { responseType: 'speech' });
    }
  };

  const handleToggleAudio = () => {
    setAudioMuted(!audioMuted);
    if (vapiRef.current) {
      if (!audioMuted) {
        vapiRef.current.mute();
      } else {
        vapiRef.current.unmute();
      }
    }
  };

  const handleMicClick = () => {
    if (vapiRef.current) {
      if (userSpeaking) {
        // If already listening, stop listening
        console.log("Stopping listening");
        vapiRef.current.stopListening && vapiRef.current.stopListening();
        setUserSpeaking(false);
      } else {
        // Start listening
        console.log("Starting listening");
        vapiRef.current.startListening && vapiRef.current.startListening();
        setUserSpeaking(true);
      }
    }
  };

  // Add this function to handle real-time symptom detection after user messages
  const detectAndDisplaySymptoms = async (text: string) => {
    const { detectedSymptoms, primarySymptom, intensity } = detectSymptoms(text);
    
    if (detectedSymptoms.size > 0) {
      // Format the detected symptoms for display
      const symptomNames = Array.from(detectedSymptoms).map(id => {
        const symptom = symptoms.find(s => s.id === id);
        return symptom ? symptom.name : id;
      }).join(', ');
      
      // Check if intensity was explicitly mentioned
      const intensityMentioned = text.match(/(\d)[\/\s]5|(\d)\s*out\s*of\s*5|level\s*(\d)|rating\s*(\d)|intensity\s*(\d)|severe|moderate|mild|(very\s+)(bad|strong|intense|high)/i);
      
      // Different message based on whether intensity was mentioned
      let systemMessage;
      if (intensityMentioned) {
        systemMessage = {
          text: `📋 I notice you're talking about ${symptomNames} with an intensity of ${intensity}/5. I'll add this to your symptom tracker.`,
          sender: 'ai' as const,
          timestamp: new Date(),
          isSystemMessage: true
        };
      } else {
        // Ask about intensity if not specified
        systemMessage = {
          text: `📋 I notice you mentioned ${symptomNames}. On a scale of 1-5, how would you rate the intensity? For now, I'll record it as ${intensity}/5, but you can tell me if it's different.`,
          sender: 'ai' as const,
          timestamp: new Date(),
          isSystemMessage: true
        };
      }
      
      setMessages(prev => [...prev, systemMessage]);
      
      // Automatically save the symptoms to the tracker
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Create summary
          const summary = `Auto-detected from voice conversation: "${text}"`;
          
          // Create enhanced summary with detected symptom information
          const enhancedSummary = createEnhancedSummary(summary, detectedSymptoms, intensity);
          
          // Save primary symptom
          await supabase.from('symptom_tracking').insert({
            user_id: session.user.id,
            symptom: primarySymptom,
            intensity: intensity,
            notes: enhancedSummary,
            source: 'voice_auto',
            recorded_at: new Date().toISOString()
          });
          
          // Save additional symptoms if detected
          if (detectedSymptoms.size > 1) {
            const additionalSymptoms = Array.from(detectedSymptoms).slice(1);
            for (const symptomId of additionalSymptoms) {
              await supabase.from('symptom_tracking').insert({
                user_id: session.user.id,
                symptom: symptomId,
                intensity: intensity,
                notes: enhancedSummary,
                source: 'voice_auto',
                recorded_at: new Date().toISOString()
              });
            }
          }
          
          // Schedule a follow-up WhatsApp notification
          try {
            // Import the notification trigger service dynamically to avoid circular dependencies
            const { notificationTrigger } = await import('@/services/notificationTriggerService');
            
            // Get symptom names for notification
            const symptomNamesList = Array.from(detectedSymptoms).map(id => {
              const symptom = symptoms.find(s => s.id === id);
              return symptom ? `${symptom.name} (intensity: ${intensity}/5)` : null;
            }).filter(Boolean);
            
            // Schedule the notification
            const result = await notificationTrigger.scheduleFollowUpNotification(
              session.user.id, 
              'voice-chat',
              symptomNamesList
            );
            
            console.log('Auto-detection: WhatsApp follow-up scheduled for symptom detection');
            
            if (result.success) {
              // Show a prominent notification about the WhatsApp follow-up
              toast({
                title: "WhatsApp Follow-up Scheduled",
                description: `A follow-up message will be sent to ${result.phone} in 24 hours: "${result.message.substring(0, 100)}${result.message.length > 100 ? '...' : ''}"`,
                variant: "default",
                duration: 8000, // Display for 8 seconds for better visibility
              });
            }
          } catch (notifyError) {
            console.error("Error scheduling auto-detection follow-up:", notifyError);
          }
        }
      } catch (error) {
        console.error('Error auto-saving symptoms:', error);
      }
      
      return {
        detectedSymptoms,
        symptomNames,
        intensity
      };
    }
    
    return null;
  };

  // Add this function to handle real-time symptom-to-goal conversion
  const processSymptomToGoals = async (text: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { createdGoals, symptomsDetected } = await createGoalsFromSymptoms(
        session.user.id, 
        text
      );

      if (createdGoals.length > 0) {
        // Get motivational message
        const motivationalMsg = getSymptomMotivationalMessage(symptomsDetected);
        
        // Create a system message about the created goals
        const goalsList = createdGoals.map(goal => `• ${goal.goal}`).join('\n');
        const systemMessage = {
          text: `${motivationalMsg}\n\nI've added these supportive goals for you:\n${goalsList}\n\nYou can find them in your wellness progress and check them off as you complete them. 💚`,
          sender: 'ai' as const,
          timestamp: new Date(),
          isSystemMessage: true
        };
        
        setMessages(prev => [...prev, systemMessage]);
        
        // Show a toast notification
        toast({
          title: "Goals Added! 🌟",
          description: `Created ${createdGoals.length} supportive goals based on what you shared.`,
          duration: 6000,
        });

        // Trigger a refresh of the goals in the wellness page if it's open
        window.dispatchEvent(new CustomEvent('goalsUpdated', { 
          detail: { newGoals: createdGoals } 
        }));
      }
    } catch (error) {
      console.error('Error processing symptoms to goals:', error);
    }
  };

  // Process message queue
  const processMessageQueue = useCallback(() => {
    if (processingMessage.current || messageQueue.current.length === 0) return;
    
    processingMessage.current = true;
    const { text, sender } = messageQueue.current[0];
    
    console.log('💬 Processing message:', { text, sender });
    
    setMessages(prev => {
      // Check for duplicate
      const isDuplicate = prev.slice(-3).some(msg => 
        msg.sender === sender && msg.text === text
      );
      
      if (isDuplicate) {
        console.log('🔄 Skipping duplicate message');
        messageQueue.current.shift();
        processingMessage.current = false;
        return prev;
      }
      
      console.log('✅ Adding message to UI');
      messageQueue.current.shift();
      processingMessage.current = false;
      
      return [...prev, {
        text,
        sender,
        timestamp: new Date()
      }];
    });

    // Save to database in background
    supabase.auth.getSession().then(({ data: { session }}) => {
      if (session?.user) {
        saveMessage(session.user.id, sender, text, new Date())
          .catch(error => console.error('Error saving message:', error));
      }
    });
  }, []);

  // Process queue whenever it changes
  useEffect(() => {
    const interval = setInterval(processMessageQueue, 100);
    return () => clearInterval(interval);
  }, [processMessageQueue]);

  useEffect(() => {
    if (!vapiRef.current || !open) return;

    const handleMessage = (message: any) => {
      console.log('🔍 Received message:', message);

      const addMessageToUI = (text: string, sender: 'user' | 'ai', isSystemMessage = false) => {
        if (!text?.trim()) return;
        
        const cleanedText = text.trim();

        // Skip system messages and duplicates
        if (isSystemMessage || messages.some(m => m.text === cleanedText)) {
          console.log('🔄 Skipping system message or duplicate:', cleanedText);
          return;
        }

        // Skip if this is the initial greeting and we've already shown it
        if (cleanedText === INITIAL_GREETING && initialMessageSent.current) {
          console.log('🔄 Skipping duplicate initial greeting');
          return;
        }

        // Mark initial greeting as sent if this is it
        if (cleanedText === INITIAL_GREETING) {
          initialMessageSent.current = true;
        }
        
        console.log('✨ Adding message to UI:', { sender, text: cleanedText });

        setMessages(prev => {
          // Check for duplicate
          const isDuplicate = prev.some(msg => 
            msg.text === cleanedText
          );
          
          if (isDuplicate) {
            console.log('🔄 Skipping duplicate message');
            return prev;
          }
          
          console.log('✅ Adding message to UI');
          return [...prev, {
            text: cleanedText,
            sender,
            timestamp: new Date()
          }];
        });

        // Save to database
        supabase.auth.getSession().then(({ data: { session }}) => {
          if (session?.user) {
            saveMessage(session.user.id, sender, cleanedText, new Date())
              .catch(error => console.error('Error saving message:', error));
          }
        });
      };

      switch (message.type) {
        case 'transcript':
          if (message.role === 'user' && message.transcriptType === 'final' && message.transcript) {
            console.log('👤 User transcript:', message.transcript);
            addMessageToUI(message.transcript, 'user');
            
            // Process symptoms to goals in background
            processSymptomToGoals(message.transcript);
          }
          else if (message.role === 'assistant' && message.transcriptType === 'final' && message.transcript) {
            console.log('🤖 Assistant transcript:', message.transcript);
            // Don't add if it looks like a system message
            if (!message.transcript.includes('💙') && !message.transcript.includes('🌟') && !message.transcript.includes('💚')) {
              addMessageToUI(message.transcript, 'ai');
            }
          }
          break;

        case 'model-output':
          if (message.text?.trim()) {
            console.log('🤖 Model output:', message.text);
            // Don't add if it looks like a system message
            if (!message.text.includes('💙') && !message.text.includes('🌟') && !message.text.includes('💚')) {
              addMessageToUI(message.text, 'ai');
            }
          }
          break;

        case 'conversation-update':
          if (message.messages?.length > 0) {
            const lastMessage = message.messages[message.messages.length - 1];
            if (lastMessage?.role === 'assistant' && lastMessage.content?.trim()) {
              console.log('🤖 Assistant message:', lastMessage.content);
              // Don't add if it looks like a system message
              if (!lastMessage.content.includes('💙') && !lastMessage.content.includes('🌟') && !lastMessage.content.includes('💚')) {
                addMessageToUI(lastMessage.content, 'ai');
              }
            }
          }
          break;

        case 'error':
          console.error('❌ Vapi error:', message);
          toast({
            title: "Voice Assistant Error",
            description: message.error || "An error occurred",
            variant: "destructive",
          });
          break;
      }
    };

    console.log('🎯 Setting up message handler');
    vapiRef.current.on('message', handleMessage);

    return () => {
      console.log('🧹 Cleaning up message handler');
      if (vapiRef.current) {
        vapiRef.current.off('message', handleMessage);
      }
    };
  }, [open]);

  // Debug log for messages updates
  useEffect(() => {
    console.log('📱 Messages state updated:', messages);
  }, [messages]);

  // Update the handleSaveToSymptomTracker function
  const handleSaveToSymptomTracker = async () => {
    try {
      setSavingToTracker(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/login');
        return;
      }
      
      // Ensure we have a session ID
      const sid = await ensureSession(session.user.id);
      
      // Get user messages only
      const userMessages = messages
        .filter(m => m.sender === 'user')
        .map(m => m.text);
      
      // If no user messages, show a message
      if (userMessages.length === 0) {
        toast({
          title: "No conversation to save",
          description: "Please have a conversation first before saving to the symptom tracker.",
          variant: "destructive",
        });
        setSavingToTracker(false);
        return;
      }
      
      // Create a summary of the conversation
      const summary = messages.map(m => {
        if (m.isSystemMessage) return `System: ${m.text}`;
        return `${m.sender === 'user' ? 'You' : 'MeNova'}: ${m.text}`;
      }).join('\n');
      
      // Use symptom detection service to analyze the conversation
      const { detectedSymptoms, primarySymptom, intensity } = detectSymptoms(userMessages.join(' '));
      
      // Create enhanced summary with detected symptom information
      const enhancedSummary = createEnhancedSummary(summary, detectedSymptoms, intensity);
      
      // Save to symptom tracker with a more specific source field
      await supabase.from('symptom_tracking').insert({
        user_id: session.user.id,
        symptom: primarySymptom,
        intensity: intensity,
        notes: enhancedSummary,
        source: 'voice_assistant',
        recorded_at: new Date().toISOString()
      });
      
      // If multiple symptoms were detected, add separate entries for each
      if (detectedSymptoms.size > 1) {
        const additionalSymptoms = Array.from(detectedSymptoms).slice(1);
        for (const symptomId of additionalSymptoms) {
          await supabase.from('symptom_tracking').insert({
            user_id: session.user.id,
            symptom: symptomId,
            intensity: intensity,
            notes: enhancedSummary,
            source: 'voice_assistant',
            recorded_at: new Date().toISOString()
          });
        }
      }
      
      // Schedule a follow-up WhatsApp notification if symptoms were detected
      if (detectedSymptoms.size > 0) {
        try {
          // Import the notification trigger service dynamically to avoid circular dependencies
          const { notificationTrigger } = await import('@/services/notificationTriggerService');
          
          // Get symptom names for notification
          const symptomNamesList = Array.from(detectedSymptoms).map(id => {
            const symptom = symptoms.find(s => s.id === id);
            return symptom ? `${symptom.name} (intensity: ${intensity}/5)` : null;
          }).filter(Boolean);
          
          // Schedule the notification
          const result = await notificationTrigger.scheduleFollowUpNotification(
            session.user.id, 
            'voice-chat',
            symptomNamesList
          );
          
          console.log('Voice assistant: WhatsApp follow-up scheduled:', result);
          
          if (result.success) {
            // Show a prominent notification about the WhatsApp follow-up
            toast({
              title: "WhatsApp Follow-up Scheduled",
              description: `A follow-up message will be sent to ${result.phone} in 24 hours: "${result.message.substring(0, 100)}${result.message.length > 100 ? '...' : ''}"`,
              variant: "default",
              duration: 8000, // Display for 8 seconds for better visibility
            });
          }
        } catch (notifyError) {
          console.error("Error scheduling voice assistant follow-up:", notifyError);
        }
      }
      
      // Add a confirmation message to the chat
      const confirmationMessage = {
        text: `✅ I've saved ${detectedSymptoms.size > 0 
          ? `information about your ${formatDetectedSymptoms(detectedSymptoms)}` 
          : 'our conversation'} to your symptom tracker.`,
        sender: 'ai' as const,
        timestamp: new Date(),
        isSystemMessage: true
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      toast({
        title: "Saved to Symptom Tracker",
        description: detectedSymptoms.size > 0 
          ? `Recorded ${formatDetectedSymptoms(detectedSymptoms)} with intensity ${intensity}/5` 
          : "Conversation saved to your symptom tracker.",
      });
    } catch (error) {
      console.error('Error saving to symptom tracker:', error);
      toast({
        title: "Error",
        description: "Could not save to symptom tracker. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingToTracker(false);
    }
  };

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    open: () => {
      // Clear messages when opening externally
      setMessages([]);
      setOpen(true);
    },
    close: () => setOpen(false),
    sendTextMessage: (text: string) => {
      if (vapiRef.current) {
        vapiRef.current.sendTextMessage && vapiRef.current.sendTextMessage(text);
      }
    },
    resetConversation: () => {
      setMessages([]);
      initialMessageSent.current = false;
    }
  }));

  return (
    <>
      <Button
        onClick={handleAssistantClick}
        className={className || `rounded-full w-14 h-14 bg-menova-green text-white shadow-lg hover:bg-menova-green/90 ${isSpeaking ? 'animate-pulse' : ''} flex items-center justify-center p-0`}
      >
        <div className="rounded-full overflow-hidden w-12 h-12 border-2 border-white">
          <img 
            src="/lovable-uploads/9f5f031b-af45-4b14-96fd-a87e2a176359.png" 
            alt="MeNova Assistant" 
            className="w-full h-full object-cover"
          />
        </div>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`bg-menova-beige flex flex-col h-[80vh] p-4 gap-4 transition-all duration-200 ease-in-out ${
          isWideView ? 'sm:max-w-4xl' : 'sm:max-w-xl'
        }`}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Chat with MeNova</DialogTitle>
              <div className="flex space-x-2">
                {/* Width toggle button */}
                <Button
                  size="icon"
                  variant="outline"
                  className={`rounded-full ${isWideView ? 'bg-menova-green text-white' : 'text-menova-green'}`}
                  onClick={() => setIsWideView(!isWideView)}
                  title={isWideView ? "Switch to normal view" : "Switch to wide view"}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    {isWideView ? (
                      <>
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <path d="M9 4v16" />
                        <path d="M15 4v16" />
                      </>
                    ) : (
                      <>
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M6 4v16" />
                        <path d="M18 4v16" />
                      </>
                    )}
                  </svg>
                </Button>
                {/* Audio toggle button */}
                <Button 
                  size="icon"
                  variant={audioMuted ? "outline" : "default"}
                  className={`rounded-full ${!audioMuted ? 'bg-menova-green hover:bg-menova-green/90 text-white' : 'text-menova-green'}`}
                  onClick={handleToggleAudio}
                  disabled={!sdkLoaded}
                >
                  {audioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </Button>
              </div>
            </div>
            {!sdkLoaded && (
              <DialogDescription className="text-yellow-600">
                Voice assistant is loading...
              </DialogDescription>
            )}
            {error && (
              <DialogDescription className="text-red-500">
                Error: Could not connect voice assistant
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Message display area */}
          <div className={`flex-grow overflow-hidden bg-white/50 rounded-lg transition-all duration-200 ease-in-out ${
            isWideView ? 'w-full' : 'w-full'
          }`}>
            <div className="h-full overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  {msg.sender === 'ai' && (
                    <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${isSpeaking && idx === messages.length - 1 ? 'animate-pulse' : ''}`}>
                      <img src="/lovable-uploads/9f5f031b-af45-4b14-96fd-a87e2a176359.png" alt="MeNova" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`rounded-lg px-4 py-2 max-w-[80%] shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-500 text-white ml-auto' 
                      : msg.isSystemMessage
                      ? 'bg-yellow-50 text-gray-800 border border-yellow-200'
                      : 'bg-menova-lightgreen/20 text-menova-text border border-menova-green/20'
                  }`}>
                    <div className="text-xs font-semibold mb-1">
                      {msg.sender === 'user' ? 'You' : msg.isSystemMessage ? 'System' : 'MeNova'}
                    </div>
                    <div className="text-sm break-words">{msg.text}</div>
                    <p className="text-xs opacity-60 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {msg.sender === 'user' && <div className="w-8 h-8"></div>}
                </div>
              ))}
              
              {/* Show interim transcript while transcribing */}
              {isTranscribing && interimTranscript && (
                <div className="flex justify-end items-start gap-2 mb-4">
                  <div className="rounded-lg px-4 py-2 max-w-[80%] bg-blue-500/50 text-white italic shadow-sm">
                    <div className="text-xs font-semibold mb-1">You (typing...)</div>
                    <div className="text-sm break-words">{interimTranscript}</div>
                  </div>
                  <div className="w-8 h-8"></div>
                </div>
              )}
              
              {/* Speaking indicator */}
              {isSpeaking && (
                <div className="flex justify-center items-center py-2">
                  <div className="flex gap-1 items-center">
                    <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area - now with flex-shrink-0 to prevent shrinking */}
          <div className="flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
              <input 
                type="text" 
                placeholder="Type a message or press the mic to speak..." 
                className="flex-1 p-2 rounded-md border-2 border-menova-green/30 focus:outline-none focus:ring-2 focus:ring-menova-green/50 focus:border-transparent bg-white text-gray-800 placeholder-gray-400"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {/* Microphone button */}
              <Button 
                variant={userSpeaking ? "default" : "outline"}
                size="icon"
                className={`rounded-full ${
                  userSpeaking 
                    ? 'bg-menova-green text-white animate-pulse' 
                    : 'border-2 border-menova-green text-menova-green hover:bg-menova-green/10'
                }`}
                onClick={handleMicClick}
                disabled={!sdkLoaded}
                title={userSpeaking ? "Stop speaking" : "Start speaking"}
              >
                {userSpeaking ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              <Button 
                className="bg-menova-green hover:bg-menova-green/90 rounded-full"
                onClick={handleSendMessage}
                disabled={!message.trim()}
                title="Send message"
              >
                <Send size={18} />
              </Button>
            </div>
            
            <Button 
              className="bg-menova-green hover:bg-menova-green/90 w-full rounded-lg"
              onClick={handleSaveToSymptomTracker}
              disabled={savingToTracker || messages.length <= 1}
            >
              {savingToTracker ? 'Saving...' : 'Add Conversation to Symptom Tracker'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

VapiAssistant.displayName = 'VapiAssistant';

export default VapiAssistant;
