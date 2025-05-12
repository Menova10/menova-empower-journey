
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, X, Mic, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/use-toast';

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

// MeNovaAvatar Component
const MeNovaAvatar = () => (
  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a9 9 0 0 1 9 9c0 3.3-1.8 6.3-4.5 7.9L12 22l-4.5-3.1A9 9 0 0 1 12 2z"></path>
      <path d="M12 7v5l2.5 2.5"></path>
    </svg>
  </div>
);

// Quick Reply Button
const QuickReplyButton = ({ 
  label, 
  onClick, 
  to = null 
}: { 
  label: string; 
  onClick?: () => void; 
  to?: string | null 
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (onClick) {
      onClick();
    }
  };
  
  return (
    <button 
      onClick={handleClick}
      className="text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-all hover:scale-105"
    >
      {label}
    </button>
  );
};

// Typing Indicator
const TypingIndicator = () => (
  <div className="flex items-center space-x-1 ml-10 mt-2 text-green-700">
    <span className="text-sm">MeNova is typing</span>
    <span className="typing-dot animate-typing"></span>
    <span className="typing-dot animate-typing"></span>
    <span className="typing-dot animate-typing"></span>
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
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  // Initialize session and load initial greeting
  useEffect(() => {
    // Add initial greeting when component mounts
    if (messages.length === 0) {
      setMessages([
        {
          text: "Hello! I'm MeNova, your companion through menopause. How can I help you today?",
          sender: 'menova',
          timestamp: new Date(),
          quickReplies: true
        }
      ]);
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
  
  // Speech recognition setup
  useEffect(() => {
    let recognition: SpeechRecognition | null = null;
    
    if (isListening) {
      try {
        // Use type assertion to tell TypeScript these properties exist
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');
          
          setInputText(transcript);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          setSpeechError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.start();
      } catch (error) {
        setSpeechError("Speech recognition not supported in this browser");
        setIsListening(false);
      }
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isListening]);
  
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
    // This would call the existing Supabase Edge Function
    // For now, we'll just look for common symptom keywords
    const symptomKeywords = [
      'hot flash', 'hot flashes', 'mood swing', 'mood swings', 'fatigue',
      'tired', 'exhausted', 'insomnia', 'joint pain', 'ache', 'pain',
      'night sweat', 'night sweats', 'anxiety', 'depression'
    ];
    
    // Check if the message contains any symptom keywords
    const foundSymptoms = symptomKeywords.filter(symptom => 
      message.toLowerCase().includes(symptom)
    );
    
    if (foundSymptoms.length > 0 && user) {
      // For each found symptom, add to symptom_tracking
      for (const symptom of foundSymptoms) {
        try {
          await supabase
            .from('symptom_tracking')
            .insert({
              user_id: user.id,
              symptom: symptom,
              intensity: 3, // Default mid-level intensity
              source: 'chat',
              notes: `Detected from chat: "${message}"`
            });
        } catch (error) {
          console.error('Error saving symptom:', error);
        }
      }
      
      return foundSymptoms[0]; // Return the first detected symptom
    }
    
    return null;
  };
  
  // Generate AI response
  const generateAIResponse = async (userMessage: string) => {
    try {
      // In a real implementation, this would call OpenAI API
      // For now, we'll simulate responses based on keywords
      setIsLoading(true);
      
      // Extract any symptoms mentioned
      const detectedSymptom = await extractSymptoms(userMessage);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let response = '';
      
      if (userMessage.toLowerCase().includes('hot flash') || userMessage.toLowerCase().includes('hot flashes')) {
        response = "I hear you—hot flashes can be really disruptive. Try a cooling breath exercise: inhale for 4, exhale for 6. Keeping a small fan nearby might help too. Would you like to log this on the Symptom Tracker page? You're taking such great steps by sharing how you feel!";
      } 
      else if (userMessage.toLowerCase().includes('mood swing') || userMessage.toLowerCase().includes('mood swings')) {
        response = "I hear you—mood swings can be challenging during menopause. Try a 5-minute breathing exercise: inhale for 4, exhale for 6. A short mindfulness activity might help too. Would you like to log this on the Symptom Tracker page? You're taking such great steps for your well-being!";
      }
      else if (userMessage.toLowerCase().includes('tired') || userMessage.toLowerCase().includes('fatigue') || userMessage.toLowerCase().includes('exhausted')) {
        response = "Fatigue during menopause is common due to hormonal changes affecting your sleep and energy levels. Try setting a consistent sleep schedule and consider gentle movement like yoga. The Community page has helpful discussions about managing energy levels too. You're doing great by recognizing what your body needs!";
      }
      else if (userMessage.toLowerCase().includes('sleep') || userMessage.toLowerCase().includes('insomnia')) {
        response = "Sleep disruptions are common during menopause. Try creating a cool, dark sleeping environment and a relaxing bedtime routine. Limiting screens and caffeine before bed can help too. Would logging this symptom help you track patterns? You're taking important steps by addressing this!";
      }
      else if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi') || userMessage.toLowerCase().includes('hey')) {
        response = "Hello there! I'm MeNova, your companion through menopause. I'm here to support you with information, symptom tracking, and mindfulness techniques. How are you feeling today? Remember, I'm here to listen and help whenever you need.";
      }
      else {
        response = "I'm here to support you through your menopause journey. If you're experiencing any symptoms or have questions, feel free to share. You might also find it helpful to connect with others in our Community page. What's on your mind today? Remember, you're doing wonderfully by seeking support.";
      }
      
      return {
        text: response,
        detectedSymptom
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        detectedSymptom: null
      };
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    const { text, detectedSymptom } = await generateAIResponse(userMessage.text);
    
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
  
  const toggleListening = () => {
    setSpeechError(null);
    setIsListening(!isListening);
  };
  
  // Determine the container classes based on isMaximized state
  const containerClasses = isMaximized
    ? "fixed inset-4 z-50 flex flex-col bg-gradient-to-br from-white to-green-50 rounded-lg shadow-xl backdrop-blur-md bg-white/30 border border-white/20 animate-scale-in"
    : "fixed bottom-20 right-6 w-96 h-[500px] z-50 flex flex-col bg-gradient-to-br from-white to-green-50 rounded-lg shadow-lg backdrop-blur-md bg-white/30 border border-white/20";

  return (
    <div className={containerClasses}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-green-100">
        <div className="flex items-center space-x-2">
          <MeNovaAvatar />
          <h3 className="font-semibold text-green-800">Chat with MeNova</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={toggleMaximize}
            className="p-1.5 rounded-full hover:bg-green-100 transition-colors"
            aria-label={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={closeChat}
            className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-white/10 backdrop-blur-sm">
        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            <div 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'menova' && (
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex items-center justify-center bg-green-500 text-white">
                  <MeNovaAvatar />
                </div>
              )}
              <div 
                className={`max-w-[70%] rounded-lg px-4 py-2.5 transition-all hover:shadow-md ${
                  message.sender === 'user' 
                    ? 'bg-green-500 text-white animate-slide-right transform hover:scale-[1.02]' 
                    : 'bg-white border border-green-100 text-gray-800 animate-fade-in transform hover:scale-[1.02]'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.sender === 'user' && <div className="w-8"></div>}
            </div>
            
            {/* Quick reply buttons after MeNova messages */}
            {message.sender === 'menova' && message.quickReplies && (
              <div className="ml-10 mt-2 flex flex-wrap gap-2">
                {message.detectedSymptom && (
                  <QuickReplyButton 
                    label="Log this symptom" 
                    to="/symptom-tracker" 
                  />
                )}
                <QuickReplyButton 
                  label="Set a wellness goal" 
                  to="/todays-wellness" 
                />
                <QuickReplyButton 
                  label="Tell me more" 
                  onClick={() => handleContinueChat(message.detectedSymptom || "menopause")} 
                />
                {message.text.toLowerCase().includes('community') && (
                  <QuickReplyButton 
                    label="Visit community" 
                    to="/community" 
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
      <div className="p-3 border-t border-green-100 bg-white/30">
        {speechError && (
          <div className="text-red-500 text-xs mb-2">{speechError}</div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleListening}
            className={`p-2 rounded-full transition-colors ${
              isListening 
                ? 'bg-red-500 text-white mic-animated' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            <Mic size={18} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 p-2 border border-green-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-white/50"
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <button 
            onClick={handleSendMessage}
            className={`p-2 rounded-full bg-green-500 text-white transition-all hover:bg-green-600 ${
              inputText.trim() ? 'animate-pulse' : 'opacity-50'
            }`}
            disabled={!inputText.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
      
      {/* Back to Home button (only shown when maximized) */}
      {isMaximized && (
        <button
          onClick={() => navigate('/')}
          className="absolute bottom-4 left-4 flex items-center space-x-1 text-sm text-green-700 hover:text-green-900"
        >
          <span>Back to Home</span>
        </button>
      )}
    </div>
  );
};

export default MeNovaChatWindow;
