import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore, ChatMessage } from '@/stores/chatStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { generateResponse, processForSymptoms, getWelcomeMessage, getConversationStarters } from '@/utils/chatUtils';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageCircle, X, Mic, MicOff, Expand, Minimize, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const ChatInterface = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, isAuthenticated } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatMode, setChatMode] = useState<'popup' | 'dialog' | 'drawer'>('popup');
  
  const { 
    isOpen, 
    isExpanded,
    isRecording, 
    messages, 
    openChat, 
    closeChat,
    toggleExpand,
    startRecording,
    stopRecording,
    addMessage,
    clearMessages 
  } = useChatStore();
  
  // Initialize speech recognition
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening 
  } = useSpeechRecognition({
    onResult: (result) => {
      setMessageInput(result);
    },
    onEnd: () => {
      stopRecording();
    }
  });

  // Set chat mode based on screen size and expanded state
  useEffect(() => {
    if (isMobile) {
      setChatMode('drawer');
    } else if (isExpanded) {
      setChatMode('dialog');
    } else {
      setChatMode('popup');
    }
  }, [isMobile, isExpanded]);
  
  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage(getWelcomeMessage());
    }
  }, [isOpen, messages.length, addMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle recording state
  useEffect(() => {
    if (isRecording) {
      startListening();
    } else {
      stopListening();
    }
  }, [isRecording, startListening, stopListening]);

  // Handle sending a message
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to chat with MeNova",
      });
      navigate('/login');
      return;
    }
    
    try {
      setSending(true);
      
      // Add user message to chat
      const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        sender: 'user',
        message: text.trim()
      };
      
      addMessage(userMessage);
      setMessageInput('');
      
      // Save message to database if authenticated
      if (user) {
        try {
          // Create a session if needed
          let sessionId: string | null = null;
          
          const { data: existingSessions, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_type', 'chat')
            .order('started_at', { ascending: false })
            .limit(1);
            
          if (sessionsError) {
            console.error('Error getting sessions:', sessionsError);
          }
            
          if (existingSessions && existingSessions.length > 0) {
            sessionId = existingSessions[0].id;
          } else {
            // Create new session
            const { data: newSession, error: newSessionError } = await supabase
              .from('user_sessions')
              .insert({
                user_id: user.id,
                session_type: 'chat',
                title: 'Chat Session ' + new Date().toLocaleString()
              })
              .select('id')
              .single();
              
            if (newSessionError) {
              console.error('Error creating session:', newSessionError);
            } else if (newSession) {
              sessionId = newSession.id;
            }
          }
          
          // Save the message if we have a session
          if (sessionId) {
            await supabase.from('session_messages').insert({
              session_id: sessionId,
              sender: userMessage.sender,
              message: userMessage.message,
              timestamp: new Date().toISOString()
            }).then(null).catch((error) => {
              console.error('Error saving message:', error);
            });
          }
          
          // Process for symptoms
          const detectedSymptom = processForSymptoms(text);
          if (detectedSymptom && user) {
            await supabase.from('symptom_tracker').insert({
              user_id: user.id,
              symptom: detectedSymptom,
              source: 'chat',
              recorded_at: new Date().toISOString(),
              notes: `Automatically detected from chat conversation`
            }).then(null).catch((error) => {
              console.error('Error saving symptom:', error);
            });
            
            // Notify user subtly
            toast({
              title: "Symptom Logged",
              description: `I've noted your ${detectedSymptom.toLowerCase()} in your symptom tracker.`,
            });
          }
        } catch (error) {
          console.error('Error saving message:', error);
        }
      }
      
      // Generate assistant response
      setTimeout(() => {
        const response = generateResponse(text);
        
        const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          sender: 'assistant',
          message: response
        };
        
        addMessage(assistantMessage);
        
        // Save assistant response to database if authenticated
        if (user && userMessage.sender === 'user') {
          // Get the last created session
          supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_type', 'chat')
            .order('started_at', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
              if (error) {
                console.error('Error getting session:', error);
                return;
              }
              
              if (data && data.length > 0) {
                const sessionId = data[0].id;
                
                // Save assistant message
                supabase.from('session_messages').insert({
                  session_id: sessionId,
                  sender: assistantMessage.sender,
                  message: assistantMessage.message,
                  timestamp: new Date().toISOString()
                }).then(null).catch((error) => {
                  console.error('Error saving assistant message:', error);
                });
              }
            })
            .catch((error) => {
              console.error('Error getting session:', error);
            });
        }
        
        setSending(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setSending(false);
    }
  };
  
  // Handle initiator click
  const handleInitiatorClick = (prompt: string) => {
    sendMessage(prompt);
  };
  
  // Handle close chat
  const handleCloseChat = () => {
    closeChat();
    // Don't clear messages to preserve conversation
  };
  
  // Handle toggle recording
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      // Send the transcript if it's not empty
      if (transcript.trim()) {
        sendMessage(transcript);
      }
    } else {
      startRecording();
    }
  };
  
  // Render chat messages
  const renderMessages = () => {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2">
                <img
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                  alt="MeNova"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender === 'user' 
                  ? 'bg-menova-green text-white' 
                  : 'bg-menova-beige text-menova-text'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
    );
  };
  
  // Render message input
  const renderMessageInput = () => {
    return (
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            placeholder={isRecording ? "Listening..." : "Type your message..."}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(messageInput);
              }
            }}
            disabled={sending || isRecording}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleRecording}
            className={isRecording ? "text-red-500 border-red-500" : ""}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </Button>
          <Button
            onClick={() => sendMessage(messageInput)}
            disabled={sending || (!messageInput.trim() && !isRecording)}
            className="bg-menova-green hover:bg-menova-green/90 text-white"
          >
            Send
          </Button>
        </div>
      </div>
    );
  };
  
  // Render conversation starters
  const renderConversationStarters = () => {
    const starters = getConversationStarters();
    
    return (
      <div className="p-4 border-b overflow-x-auto flex space-x-2">
        {starters.map((starter) => (
          <Button
            key={starter}
            variant="outline"
            size="sm"
            className="whitespace-nowrap text-xs border-menova-green text-menova-green hover:bg-menova-green/10"
            onClick={() => handleInitiatorClick(starter)}
          >
            {starter}
          </Button>
        ))}
      </div>
    );
  };
  
  // Render chat button
  const renderChatButton = () => {
    return (
      <Button 
        onClick={openChat}
        className="fixed bottom-20 right-6 z-40 bg-menova-green hover:bg-menova-green/90 text-white rounded-full py-3 px-4 shadow-lg cursor-pointer flex items-center gap-2"
      >
        <MessageCircle size={18} />
        <span className="text-sm font-medium">Text Chat</span>
      </Button>
    );
  };
  
  // Render popup chat
  const renderPopupChat = () => {
    if (!isOpen || chatMode !== 'popup') return null;
    
    return (
      <Card className="fixed bottom-24 right-6 z-40 w-[350px] h-[500px] shadow-lg flex flex-col overflow-hidden">
        <div className="bg-menova-green p-3 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-medium">Chat with MeNova</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleExpand}
              className="text-white hover:bg-menova-green/90"
            >
              <Expand size={18} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCloseChat}
              className="text-white hover:bg-menova-green/90"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
        
        {renderConversationStarters()}
        {renderMessages()}
        {renderMessageInput()}
      </Card>
    );
  };
  
  // Render dialog chat (expanded view)
  const renderDialogChat = () => {
    if (!isOpen || chatMode !== 'dialog') return null;
    
    return (
      <Dialog open={true} onOpenChange={(open) => !open && handleCloseChat()}>
        <DialogContent className="sm:max-w-[500px] h-[600px] max-h-[80vh] flex flex-col p-0">
          <div className="bg-menova-green p-3 text-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                  alt="MeNova"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium">Chat with MeNova</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleExpand}
                className="text-white hover:bg-menova-green/90"
              >
                <Minimize size={18} />
              </Button>
            </div>
          </div>
          
          {renderConversationStarters()}
          {renderMessages()}
          {renderMessageInput()}
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render drawer chat (mobile view)
  const renderDrawerChat = () => {
    if (!isOpen || chatMode !== 'drawer') return null;
    
    return (
      <Drawer open={true} onOpenChange={(open) => !open && handleCloseChat()}>
        <DrawerContent className="h-[80vh] flex flex-col">
          <div className="bg-menova-green p-3 text-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                  alt="MeNova"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium">Chat with MeNova</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCloseChat}
              className="text-white hover:bg-menova-green/90"
            >
              <ChevronDown size={18} />
            </Button>
          </div>
          
          {renderConversationStarters()}
          {renderMessages()}
          {renderMessageInput()}
        </DrawerContent>
      </Drawer>
    );
  };
  
  return (
    <>
      {renderChatButton()}
      {renderPopupChat()}
      {renderDialogChat()}
      {renderDrawerChat()}
    </>
  );
};

export default ChatInterface;
