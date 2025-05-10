import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Send, Mic, Volume2 } from 'lucide-react';
import VapiAssistant from '@/components/VapiAssistant';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Chat = () => {
  const [messages, setMessages] = useState<{ text: string, sender: 'user' | 'ai', timestamp: Date }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'voice' | 'text'>('text');
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<any>(null);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize session based on location state
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState) {
      // If resuming a specific session
      if (locationState.sessionId) {
        setSessionId(locationState.sessionId);
        // Fetch existing messages for this session
      } 
      
      // Set session type (voice or text)
      if (locationState.sessionType === 'voice') {
        setSessionType('voice');
        setShowVoiceUI(true);
        
        // Auto-open the voice assistant after a short delay
        setTimeout(() => {
          if (vapiRef.current) {
            // Check if we should auto-start the voice based on the flag
            if (locationState.autoStartVoice) {
              // First, find and click the button to open the assistant dialog
              const assistantButton = document.querySelector('.rounded-full.w-14.h-14');
              if (assistantButton instanceof HTMLElement) {
                assistantButton.click();
              }
            }
          }
        }, 500);
      } else {
        setSessionType('text');
      }
    }
    
    // Check if we are authenticated
    if (!isAuthenticated && !locationState?.authenticated) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Add initial greeting when component mounts
    setMessages([
      {
        text: "Hello! I'm MeNova, your companion through menopause. How can I help you today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  }, [isAuthenticated, location.state]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a new session in the database
  const createSession = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_type: sessionType,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error creating session:', error);
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };
  
  // Save a message to the database
  const saveMessage = async (message: string, sender: 'user' | 'ai') => {
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Check if authenticated
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    
    setIsLoading(true);
    
    // Add user message
    const userMessage = {
      text: inputText,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    await saveMessage(inputText, 'user');
    setInputText('');
    
    // Simulate AI response delay
    setTimeout(async () => {
      // In a real implementation, this would call an API
      const aiMessage = {
        text: "I'm here to support you on your journey. What specific aspect of menopause would you like to discuss today?",
        sender: 'ai' as const,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      await saveMessage(aiMessage.text, 'ai');
      setIsLoading(false);
    }, 1500);
  };

  // Handle switching between voice and text modes
  const toggleVoiceMode = () => {
    // Check if authenticated
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    
    setShowVoiceUI(!showVoiceUI);
    setSessionType(showVoiceUI ? 'text' : 'voice');
    
    // If switching to voice, open the voice assistant
    if (!showVoiceUI && vapiRef.current) {
      setTimeout(() => {
        const assistantButton = document.querySelector('.rounded-full.w-14.h-14');
        if (assistantButton instanceof HTMLElement) {
          assistantButton.click();
        }
      }, 100);
    }
  };
  
  const handleLogin = () => {
    setShowLoginPrompt(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat" 
         style={{ backgroundImage: "url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')" }}>
      {/* Header */}
      <div className="bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/welcome')}
            className="text-menova-text hover:bg-menova-lightgreen"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-semibold text-menova-green">Chat with MeNova</h1>
          <Button
            variant="ghost"
            onClick={toggleVoiceMode}
            className="text-menova-text hover:bg-menova-lightgreen"
            aria-label={showVoiceUI ? "Switch to text chat" : "Switch to voice chat"}
          >
            {showVoiceUI ? <Send size={18} /> : <Volume2 size={18} />}
          </Button>
        </div>
      </div>
      
      {/* Chat container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'ai' && (
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
                  message.sender === 'user' 
                    ? 'bg-menova-green text-white' 
                    : 'bg-menova-lightgreen text-menova-text'
                }`}
              >
                <p>{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.sender === 'user' && <div className="w-8 h-8 ml-2"></div>}
            </div>
          ))}
          <div ref={messagesEndRef} />
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-menova-lightgreen rounded-lg px-4 py-2 flex items-center space-x-1">
                <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 bg-menova-green rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input container - only show for text chat */}
        {!showVoiceUI && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 p-2 border border-menova-green/30 rounded-full focus:outline-none focus:ring-2 focus:ring-menova-green/50"
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                className="bg-menova-green hover:bg-menova-green/90 rounded-full"
                disabled={isLoading}
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-center">Sign in to Chat with MeNova</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-menova-green">
              <img 
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                alt="MeNova" 
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-gray-600">
              To continue your conversation with MeNova, please sign in to your account.
            </p>
            <div className="flex gap-4 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowLoginPrompt(false)}
              >
                Continue as Guest
              </Button>
              <Button 
                className="flex-1 bg-menova-green hover:bg-menova-green/90"
                onClick={handleLogin}
              >
                Sign In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Voice Assistant - Always render but only make prominent when in voice mode */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant ref={vapiRef} />
      </div>
    </div>
  );
};

export default Chat;
