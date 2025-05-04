import { vapiConfig } from "@/config/vapiConfig";
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  sender: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

interface VapiAssistantProps {
  compact?: boolean;
}

declare global {
  interface Window {
    Vapi: any;
    vapi: any;
  }
}

const VapiAssistant = ({ compact = false }: VapiAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Create or get active session
  const createOrGetActiveSession = async () => {
    if (!user) return null;
    
    try {
      // Check for active session first
      const { data: existingSession, error: fetchError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .eq('session_type', 'voice')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existingSession) {
        setSessionId(existingSession.id);
        await loadSessionMessages(existingSession.id);
        return existingSession.id;
      }
      
      // Create new session
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_type: 'voice',
          title: 'Voice Session ' + new Date().toLocaleDateString()
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      setSessionId(data.id);
      
      // Add initial greeting message
      const initialMessage: Message = {
        sender: 'assistant',
        message: 'Hello! I\'m MeNova, your menopause wellness companion. How can I help you today?',
        timestamp: new Date().toISOString()
      };
      
      setMessages([initialMessage]);
      
      // Save message to database
      await supabase.from('session_messages').insert({
        session_id: data.id,
        sender: initialMessage.sender,
        message: initialMessage.message,
        timestamp: initialMessage.timestamp
      });
      
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  // Load messages from a session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      // Convert database messages to Message type
      const typedMessages: Message[] = (data || []).map(item => ({
        sender: item.sender === 'user' || item.sender === 'assistant' 
          ? (item.sender as 'user' | 'assistant') 
          : 'assistant', // Default to assistant if invalid
        message: item.message,
        timestamp: item.timestamp
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  };
  
  // Mock assistant response for now
  const getAssistantResponse = (userMessage: string): string => {
    if (userMessage.toLowerCase().includes('hot flash')) {
      return 'Hot flashes can be challenging. Try keeping your room cool and wearing layered clothing that can be easily removed.';
    } else if (userMessage.toLowerCase().includes('sleep') || userMessage.toLowerCase().includes('insomnia')) {
      return 'Many people experience sleep issues during menopause. Try establishing a regular sleep schedule and limiting caffeine intake in the afternoon.';
    } else {
      return 'I understand. Tell me more about what you\'re experiencing, and I\'ll do my best to help.';
    }
  };
  
  // Send message to assistant
  const sendMessage = async (message: string) => {
    try {
      if (!sessionId) await createOrGetActiveSession();
      
      // Add user message to state
      const userMessageObj: Message = {
        sender: 'user',
        message: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessageObj]);
      
      // Save to database
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        sender: userMessageObj.sender,
        message: userMessageObj.message,
        timestamp: userMessageObj.timestamp
      });
      
      // In a real implementation, we would call the Vapi API here
      // For now, just mock a response after a delay
      
      // Show thinking indicator
      
      setTimeout(async () => {
        const assistantResponse = getAssistantResponse(message);
        
        const assistantMessageObj: Message = {
          sender: 'assistant',
          message: assistantResponse,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessageObj]);
        
        // Save to database
        await supabase.from('session_messages').insert({
          session_id: sessionId,
          sender: assistantMessageObj.sender,
          message: assistantMessageObj.message,
          timestamp: assistantMessageObj.timestamp
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const toggleMic = async () => {
    // Here we would integrate with the Vapi API
    // But for now, just toggle state
    setIsListening(!isListening);
    
    // Initialize Vapi with the stored assistant ID
    if (!window.vapi && window.Vapi && !isListening) {
      window.vapi = new window.Vapi({
        apiKey: 'your-vapi-api-key', // Replace with your actual API key from environment variable
        assistantId: vapiConfig.assistantId
      });
      
      // In a real implementation, we would set up event listeners
      // window.vapi.on('transcript', (transcript) => {
      //   sendMessage(transcript);
      // });
    }
    
    // Simulate microphone activation
    if (!isListening) {
      await createOrGetActiveSession();
    }
  };

  // Main button view
  if (compact || !isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className={`rounded-full ${compact ? 'p-2' : 'px-4 py-2'} bg-menova-green hover:bg-menova-green/90 text-white shadow-lg`}
      >
        {compact ? <Mic size={18} /> : (
          <>
            <Mic size={18} className="mr-2" />
            <span>Voice Assistant</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-6 w-80 shadow-lg p-4 z-50 bg-white border-menova-green">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-menova-green">Voice Assistant</h3>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0" 
          onClick={() => setIsOpen(false)}
        >
          <X size={16} />
        </Button>
      </div>
      
      <div className="h-64 overflow-y-auto mb-3 space-y-2">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`rounded-lg px-3 py-2 max-w-[80%] ${
                msg.sender === 'user' 
                  ? 'bg-menova-green text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex justify-center">
        <Button
          onClick={toggleMic}
          className={`rounded-full p-4 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-menova-green hover:bg-menova-green/90'
          }`}
        >
          <Mic size={24} />
        </Button>
      </div>
    </Card>
  );
};

export default VapiAssistant;
