import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Send } from 'lucide-react';
import VapiAssistant from '@/components/VapiAssistant';

const Chat = () => {
  const [messages, setMessages] = useState<{ text: string, sender: 'user' | 'ai', timestamp: Date }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Add initial greeting when component mounts
  useEffect(() => {
    // Check if we were navigated here from an authenticated page
    const comingFromAuthenticatedPage = location.state?.authenticated === true;
    
    if (!isAuthenticated && !comingFromAuthenticatedPage) {
      navigate('/login');
      return;
    }
    
    setMessages([
      {
        text: "Hello! I'm MeNova, your companion through menopause. How can I help you today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  }, [isAuthenticated, navigate, location.state]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    setIsLoading(true);
    
    // Add user message
    const userMessage = {
      text: inputText,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    
    // Simulate AI response delay
    setTimeout(() => {
      // In a real implementation, this would call an API
      const aiMessage = {
        text: "I'm here to support you on your journey. What specific aspect of menopause would you like to discuss today?",
        sender: 'ai' as const,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      setIsLoading(false);
    }, 1500);
    
    // In a real implementation, you would save the conversation to Supabase
    try {
      // Create a new session if needed
      // Save the message to Supabase
      // etc.
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat" 
         style={{ backgroundImage: "url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')" }}>
      {/* Header */}
      <div className="bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-menova-text hover:bg-menova-lightgreen"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-semibold text-menova-green">Chat with MeNova</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
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
        
        {/* Input container */}
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
      </div>
      
      {/* Voice Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant />
      </div>
    </div>
  );
};

export default Chat;
