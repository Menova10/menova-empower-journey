import { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
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
import { speechToText, isDualTranscriptionEnabled } from '@/services/openaiService';

interface VapiAssistantProps {
  onSpeaking?: (speaking: boolean) => void;
  className?: string;
}

const VapiAssistant = forwardRef<any, VapiAssistantProps>(({ onSpeaking, className }, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ 
    text: string; 
    sender: 'user' | 'ai'; 
    timestamp: Date; 
    isSystemMessage?: boolean;
    isEnhancedTranscription?: boolean;
  }[]>([{
    text: "Hello! I'm MeNova, your companion through menopause. How are you feeling today?",
    sender: 'ai',
    timestamp: new Date(),
  }]);
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

  // Start/stop assistant on dialog open/close
  useEffect(() => {
    if (open && sdkLoaded) {
      console.log("Dialog open, starting assistant");
      startAssistant();
      
      // If this is the first message, have the assistant start speaking
      if (messages.length === 1 && messages[0].sender === 'ai' && vapiRef.current?.sendTextMessage) {
        console.log("Auto-speaking initial greeting");
        setTimeout(() => {
          vapiRef.current.sendTextMessage(messages[0].text);
        }, 500);
      }
    } else if (!open) {
      console.log("Dialog closed, stopping assistant");
      stopAssistant();
    }
  }, [open, sdkLoaded, startAssistant, stopAssistant, messages]);

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
    
    // Optionally send to Vapi for processing
    if (vapiRef.current) {
      vapiRef.current.sendTextMessage(message);
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
        // If already listening, stop listening and parallel audio recording
        console.log("Stopping listening");
        vapiRef.current.stopListening && vapiRef.current.stopListening();
        
        // Stop parallel audio recording if active and enabled
        if (isDualTranscriptionEnabled() && audioRecorder.isCurrentlyRecording()) {
          stopParallelAudioProcessing();
        }
      } else {
        // Start listening and parallel audio recording
        console.log("Starting listening");
        vapiRef.current.startListening && vapiRef.current.startListening();
        
        // Start parallel audio recording if enabled
        if (isDualTranscriptionEnabled()) {
          startParallelAudioProcessing();
        }
      }
    }
  };
  
  /**
   * Starts parallel audio recording alongside Vapi
   * This provides redundancy for speech recognition
   */
  const startParallelAudioProcessing = async () => {
    try {
      await audioRecorder.startRecording();
      setDualTranscriptionActive(true);
      console.log("Parallel audio recording started");
    } catch (error) {
      console.error("Error starting parallel audio recording:", error);
    }
  };
  
  /**
   * Stops parallel audio recording and processes the audio
   * This function will convert the audio to text using OpenAI's API
   * and compare it with Vapi's transcription for better accuracy
   */
  const stopParallelAudioProcessing = async () => {
    try {
      // Stop recording and get the audio blob
      const audioBlob = await audioRecorder.stopRecording();
      console.log("Parallel audio recording stopped, processing...");
      
      // Convert speech to text using OpenAI
      const transcribedText = await speechToText(audioBlob);
      setDualTranscriptionActive(false);
      
      // If we got a meaningful transcription from OpenAI
      if (transcribedText && transcribedText.trim().length > 0) {
        console.log("OpenAI transcription:", transcribedText);
        
        // Compare with the last user message from Vapi
        const lastUserMessage = messages
          .filter(m => m.sender === 'user')
          .slice(-1)[0];
        
        // If OpenAI provided a better/longer transcription than Vapi
        if (lastUserMessage && 
            transcribedText.length > lastUserMessage.text.length && 
            transcribedText.includes(lastUserMessage.text.substring(0, 10))) {
          
          console.log("OpenAI provided better transcription, updating message");
          
          // Update the last user message with the improved transcription
          const updatedMessages = [...messages];
          const lastUserIndex = updatedMessages.findIndex(
            m => m.sender === 'user' && m.timestamp === lastUserMessage.timestamp
          );
          
          if (lastUserIndex !== -1) {
            updatedMessages[lastUserIndex] = {
              ...updatedMessages[lastUserIndex],
              text: transcribedText,
              isEnhancedTranscription: true
            };
            
            setMessages(updatedMessages);
            
            // Re-detect symptoms with improved transcription
            detectAndDisplaySymptoms(transcribedText);
            
            // Update the message in the database
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // Ensure we have a session
              const sid = await ensureSession(session.user.id);
              if (sid) {
                // Find the message to update
                const { data: messageData } = await supabase
                  .from('session_messages')
                  .select('id')
                  .eq('session_id', sid)
                  .eq('sender', 'user')
                  .order('timestamp', { ascending: false })
                  .limit(1);
                
                if (messageData && messageData.length > 0) {
                  // Update the message
                  await supabase
                    .from('session_messages')
                    .update({ message: transcribedText })
                    .eq('id', messageData[0].id);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing parallel audio:", error);
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

  // Update the transcript handler to work with the parallel audio processing
  useEffect(() => {
    if (!sdkLoaded || !vapiRef.current) return;
    const vapi = vapiRef.current;

    console.log("Setting up Vapi event listeners");

    // User speech transcript
    const transcriptHandler = (data: any) => {
      console.log("Transcript event:", data);
      if (data.final) {
        const userMessage = {
          text: data.transcript,
          sender: 'user' as const,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setUserSpeaking(false);
        
        // Stop parallel audio recording if active and enabled
        if (isDualTranscriptionEnabled() && audioRecorder.isCurrentlyRecording()) {
          stopParallelAudioProcessing();
        }
        
        // Detect symptoms in the user's message (handle async function)
        const detectSymptoms = async () => {
          await detectAndDisplaySymptoms(data.transcript);
        };
        detectSymptoms();
        
        // Save message if authenticated
        const saveUserMessage = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await saveMessage(session.user.id, 'user', data.transcript, new Date());
            }
          } catch (error) {
            console.error('Error saving transcript:', error);
          }
        };
        saveUserMessage();
      } else if (data.transcript) {
        // If user is speaking but message isn't final yet, show they're speaking
        setUserSpeaking(true);
      }
    };
    vapi.on && vapi.on("transcript", transcriptHandler);

    // Assistant response
    const responseHandler = (data: any) => {
      console.log("Response event:", data);
      if (data.text) {
        const aiMessage = {
          text: data.text,
          sender: 'ai' as const,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Save message if authenticated
        const saveAiMessage = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await saveMessage(session.user.id, 'ai', data.text, new Date());
            }
          } catch (error) {
            console.error('Error saving AI response:', error);
          }
        };
        saveAiMessage();
      }
    };
    vapi.on && vapi.on("response", responseHandler);

    // Volume level for waveform
    const volumeHandler = (level: number) => {
      setVolumeLevel(level);
    };
    vapi.on && vapi.on("volume-level", volumeHandler);

    return () => {
      vapi.off && vapi.off("transcript", transcriptHandler);
      vapi.off && vapi.off("response", responseHandler);
      vapi.off && vapi.off("volume-level", volumeHandler);
    };
  }, [sdkLoaded, vapiRef]);

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
      const { detectedSymptoms, primarySymptom, intensity } = detectSymptoms(userMessages);
      
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
    open: () => setOpen(true),
    close: () => setOpen(false),
    sendTextMessage: (text: string) => {
      if (vapiRef.current) {
        vapiRef.current.sendTextMessage && vapiRef.current.sendTextMessage(text);
      }
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
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Chat with MeNova</span>
              <div className="flex space-x-2">
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
            </DialogTitle>
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
            {isDualTranscriptionEnabled() && (
              <DialogDescription className="text-blue-600 flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                Enhanced transcription enabled
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Message display area with animation when MeNova is speaking */}
          <div className="flex flex-col space-y-3 max-h-[50vh] overflow-y-auto p-2 bg-white/80 rounded-md">
            {/* Animated speech indicator */}
            {isSpeaking && (
              <div className="flex justify-center items-center py-2">
                <div className="flex gap-1 items-center">
                  <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-2 mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${isSpeaking && idx === messages.length - 1 && msg.sender === 'ai' && !msg.isSystemMessage ? 'animate-pulse' : ''}`}>
                    <img src="/lovable-uploads/9f5f031b-af45-4b14-96fd-a87e2a176359.png" alt="MeNova" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={`p-3 rounded-lg max-w-[80%] ${
                  msg.sender === 'user' 
                    ? 'bg-menova-green text-white' 
                    : msg.isSystemMessage 
                      ? 'bg-yellow-100 text-gray-800 border border-yellow-300' 
                      : 'bg-menova-lightgreen text-menova-text'
                }`}> 
                  <div className="text-xs font-semibold mb-1 flex justify-between items-center">
                    <span>{
                      msg.sender === 'user' 
                        ? 'You:' 
                        : msg.isSystemMessage 
                          ? 'System:' 
                          : 'MeNova:'
                    }</span>
                    {msg.isEnhancedTranscription && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded text-[10px]">Enhanced</span>
                    )}
                  </div>
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {msg.sender === 'user' && <div className="w-8 h-8 ml-2"></div>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area with microphone button */}
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 p-2 rounded-md border border-menova-green/30 focus:outline-none focus:ring-2 focus:ring-menova-green/50"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            {/* Microphone button - now properly connected */}
            <Button 
              variant={userSpeaking ? "default" : "outline"}
              size="icon"
              className={`rounded-full ${
                userSpeaking 
                  ? 'bg-menova-green text-white animate-pulse' 
                  : 'border-menova-green text-menova-green'
              } ${dualTranscriptionActive ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
              onClick={handleMicClick}
              disabled={!sdkLoaded}
            >
              {userSpeaking ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
            <Button 
              className="bg-menova-green hover:bg-menova-green/90 rounded-full"
              onClick={handleSendMessage}
            >
              <Send size={18} />
            </Button>
          </div>
          
          <div className="flex justify-center pt-2">
            <Button 
              className="bg-menova-green hover:bg-menova-green/90 w-full"
              onClick={handleSaveToSymptomTracker}
              disabled={savingToTracker}
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
