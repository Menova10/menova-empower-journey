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

interface VapiAssistantProps {
  onSpeaking?: (speaking: boolean) => void;
  className?: string;
}

const VapiAssistant = forwardRef<any, VapiAssistantProps>(({ onSpeaking, className }, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'ai'; timestamp: Date }[]>([{
    text: "Hello! I'm MeNova, your companion through menopause. How are you feeling today?",
    sender: 'ai',
    timestamp: new Date(),
  }]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savingToTracker, setSavingToTracker] = useState(false);
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
        // If already listening, stop listening
        console.log("Stopping listening");
        vapiRef.current.stopListening && vapiRef.current.stopListening();
      } else {
        // Start listening
        console.log("Starting listening");
        vapiRef.current.startListening && vapiRef.current.startListening();
      }
    }
  };

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
      
      // Create a summary of the conversation
      const summary = messages.map(m => `${m.sender === 'user' ? 'You' : 'MeNova'}: ${m.text}`).join('\n');
      
      // Analyze conversation to identify symptoms
      // Define keywords for each symptom type
      const symptomKeywords = {
        hot_flashes: ['hot flash', 'hot flashes', 'sweating', 'heat', 'burning', 'flush', 'flushing', 'overheated'],
        sleep: ['sleep', 'insomnia', 'tired', 'fatigue', 'rest', 'wake up', 'waking', 'night sweat', 'night sweats'],
        mood: ['mood', 'irritable', 'anxiety', 'anxious', 'depressed', 'depression', 'sad', 'angry', 'emotional'],
        energy: ['energy', 'tired', 'exhausted', 'fatigue', 'lethargy', 'motivation', 'vigor'],
        brain_fog: ['brain fog', 'forgetful', 'memory', 'concentration', 'focus', 'confused', 'forget'],
        anxiety: ['anxiety', 'anxious', 'worried', 'stress', 'stressed', 'panic', 'nervous']
      };
      
      // Go through user messages to identify symptoms
      const userTexts = messages.filter(m => m.sender === 'user').map(m => m.text.toLowerCase());
      const detectedSymptoms = new Set<string>();
      let primarySymptom = 'voice_assistant'; // Default
      let intensity = 3; // Default intensity
      
      // Check for each symptom type
      Object.entries(symptomKeywords).forEach(([symptomId, keywords]) => {
        for (const text of userTexts) {
          if (keywords.some(keyword => text.includes(keyword))) {
            detectedSymptoms.add(symptomId);
          }
        }
      });
      
      // Check for intensity indicators
      const intensityRegex = /(\d)[\/\s]5|(\d)\s*out\s*of\s*5|level\s*(\d)|rating\s*(\d)|intensity\s*(\d)/i;
      for (const text of userTexts) {
        const match = text.match(intensityRegex);
        if (match) {
          const foundIntensity = parseInt(match[1] || match[2] || match[3] || match[4] || match[5]);
          if (foundIntensity >= 1 && foundIntensity <= 5) {
            intensity = foundIntensity;
            break;
          }
        }
      }
      
      // If we've detected any symptoms, use the first one as primary
      if (detectedSymptoms.size > 0) {
        primarySymptom = Array.from(detectedSymptoms)[0];
      }
      
      // Create a more descriptive title for the conversation
      const conversationTitle = detectedSymptoms.size > 0 
        ? `Voice conversation about ${Array.from(detectedSymptoms).map(s => {
            const symptom = symptoms.find(sym => sym.id === s);
            return symptom ? symptom.name.toLowerCase() : s;
          }).join(', ')}`
        : 'Voice assistant conversation';
      
      // Add detected symptom information to the summary
      const enhancedSummary = `DETECTED SYMPTOMS: ${
        detectedSymptoms.size > 0 
          ? Array.from(detectedSymptoms).map(s => {
              const symptom = symptoms.find(sym => sym.id === s);
              return symptom ? symptom.name : s;
            }).join(', ')
          : 'None specifically identified'
      }\nINTENSITY: ${intensity}/5\n\n${summary}`;
      
      // Save to symptom tracker
      await supabase.from('symptom_tracking').insert({
        user_id: session.user.id,
        symptom: primarySymptom,
        intensity: intensity,
        notes: enhancedSummary,
        source: 'voice_assistant',
        recorded_at: new Date().toISOString()
      });
      
      toast({
        title: "Saved to Symptom Tracker",
        description: `Conversation about ${primarySymptom === 'voice_assistant' ? 'general topics' : primarySymptom.replace('_', ' ')} has been added to your symptom tracker.`,
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

  // Add Vapi event listeners for transcript, response, and volume-level
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
                  <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${isSpeaking && idx === messages.length - 1 && msg.sender === 'ai' ? 'animate-pulse' : ''}`}>
                    <img src="/lovable-uploads/9f5f031b-af45-4b14-96fd-a87e2a176359.png" alt="MeNova" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={`p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-menova-green text-white' : 'bg-menova-lightgreen text-menova-text'}`}> 
                  <div className="text-xs font-semibold mb-1">{msg.sender === 'user' ? 'You:' : 'MeNova:'}</div>
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
              className={`rounded-full ${userSpeaking ? 'bg-menova-green text-white animate-pulse' : 'border-menova-green text-menova-green'}`}
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
