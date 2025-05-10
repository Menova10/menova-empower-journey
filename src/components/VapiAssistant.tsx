
"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useVapi } from "@/contexts/VapiContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Mic, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";

interface VapiAssistantProps {
  onSpeaking?: (speaking: boolean) => void;
  className?: string;
  autoOpen?: boolean;
}

const VapiAssistant = forwardRef<any, VapiAssistantProps>(({ onSpeaking, className, autoOpen = false }, ref) => {
  const [open, setOpen] = useState(autoOpen);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'ai'; timestamp: Date }[]>([{
    text: "Hello! I'm MeNova, your companion through menopause. How are you feeling today?",
    sender: 'ai',
    timestamp: new Date()
  }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoStartTriggered, setAutoStartTriggered] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use the Vapi context
  const { 
    isSpeaking, 
    isListening, 
    startAssistant, 
    stopAssistant,
    sendTextMessage,
    vapiRef 
  } = useVapi();

  // Make functions available through the ref
  useImperativeHandle(ref, () => ({
    open: () => {
      console.log("Opening voice assistant dialog");
      setOpen(true);
    },
    close: () => {
      console.log("Closing voice assistant dialog");
      setOpen(false);
    },
    sendTextMessage: (text: string) => {
      handleSendMessage(text);
    }
  }));

  // Check for auto-start parameter from location state
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState?.autoStartVoice && !autoStartTriggered) {
      // Auto-open dialog when requested from navigation
      console.log("Auto-starting voice assistant from location state");
      setAutoStartTriggered(true);
      setOpen(true);
    }
  }, [location.state, autoStartTriggered]);

  // Handle dialog open state change
  useEffect(() => {
    if (open) {
      console.log("Dialog open, starting assistant");
      startAssistant();
    } else {
      console.log("Dialog closed, stopping assistant");
      stopAssistant();
    }

    // Scroll to bottom whenever messages update
    scrollToBottom();

    // Pass speaking state to parent if callback provided
    if (onSpeaking) {
      onSpeaking(isSpeaking);
    }
  }, [open, startAssistant, stopAssistant, onSpeaking]);

  // Listen for Vapi messages
  useEffect(() => {
    // Set up message listener if Vapi is available
    if (vapiRef.current && vapiRef.current.on) {
      const messageHandler = (message: any) => {
        if (message?.content?.text) {
          console.log("Received message from Vapi:", message.content.text);
          // Add AI message to the conversation
          const aiMessage = {
            text: message.content.text,
            sender: 'ai' as const,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          saveMessage(message.content.text, 'ai');
        }
      };

      // Add the event listener
      vapiRef.current.on("message", messageHandler);

      // Cleanup function to remove the event listener
      return () => {
        if (vapiRef.current && vapiRef.current.off) {
          vapiRef.current.off("message", messageHandler);
        }
      };
    }
  }, [vapiRef.current]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create a session in Supabase when started
  useEffect(() => {
    if (open && isAuthenticated && !sessionId) {
      createSession();
    }
  }, [open, isAuthenticated]);

  // Scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Create a new voice session
  const createSession = async () => {
    if (!isAuthenticated) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_type: 'voice',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error creating session:', error);
        return;
      }
      
      if (data) {
        setSessionId(data.id);
        console.log("Created voice session:", data.id);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };
  
  // Save a message to the database
  const saveMessage = async (text: string, sender: 'user' | 'ai') => {
    if (!sessionId || !isAuthenticated) return;
    
    try {
      await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          sender: sender,
          message: text,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Handle assistant button click
  const handleAssistantClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use the voice assistant",
        variant: "default",
      });
      navigate('/login');
      return;
    }
    
    setOpen(true);
  };

  // Handle sending a text message
  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || message;
    if (!messageToSend.trim()) return;
    
    setIsProcessing(true);
    
    // Add user message to the conversation
    const userMessage = {
      text: messageToSend,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(messageToSend, 'user');
    setMessage('');
    
    // Send message to Vapi
    if (vapiRef.current) {
      sendTextMessage(messageToSend);
    }
    
    setIsProcessing(false);
  };

  const toggleMute = () => {
    setAudioMuted(!audioMuted);
    if (vapiRef.current) {
      if (!audioMuted) {
        vapiRef.current.mute && vapiRef.current.mute();
      } else {
        vapiRef.current.unmute && vapiRef.current.unmute();
      }
    }
  };

  return (
    <div className={className}>
      {/* Hidden button for voice assistant */}
      {!open && (
        <Button
          onClick={handleAssistantClick}
          className="rounded-full w-14 h-14 bg-menova-green hover:bg-menova-green/90 shadow-lg"
          aria-label="Voice Assistant"
        >
          <Mic size={20} />
        </Button>
      )}

      {/* Voice assistant dialog */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        // Only close the dialog, never open it from here
        if (!isOpen) {
          setOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white rounded-lg overflow-hidden max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-menova-green flex items-center gap-2">
                <img
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                  alt="MeNova"
                  className="w-8 h-8 rounded-full"
                />
                Voice Assistant
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="hover:bg-gray-100 rounded-full h-8 w-8 p-0"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                    <img
                      src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                      alt="MeNova"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div 
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.sender === 'user' 
                      ? 'bg-menova-green text-white' 
                      : 'bg-menova-lightgreen text-menova-text'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {/* Speech indicator */}
            {(isSpeaking || isListening) && (
              <div className="flex justify-start">
                <div className="bg-menova-lightgreen rounded-lg px-4 py-2 flex items-center">
                  {isSpeaking ? (
                    <>
                      <span className="mr-2">Speaking</span>
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="mr-2">Listening</span>
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-menova-green rounded-full animate-pulse"></div>
                        <div className="h-2 w-2 bg-menova-green rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-2 w-2 bg-menova-green rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-full focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={() => handleSendMessage()}
                className="rounded-full bg-menova-green hover:bg-menova-green/90"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

VapiAssistant.displayName = "VapiAssistant";

export default VapiAssistant;
