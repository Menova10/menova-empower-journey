import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, X, Mic, Send } from 'lucide-react';
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
      className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-full hover:bg-green-600 transition-all hover:scale-105"
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
          text: "Hello! I'm MeNova, your dedicated companion on your menopause journey. I'm here to provide support, answer your questions, and help you track your symptoms. How are you feeling today?",
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
        await supabase
          .from('symptom_tracking')
          .insert({
            user_id: user.id,
            symptom: primarySymptom,
            intensity: intensity,
            source: 'chat',
            notes: enhancedSummary,
            recorded_at: new Date().toISOString()
          });
          
        // If multiple symptoms detected, save the additional ones
        if (detectedSymptoms.size > 1) {
          const additionalSymptoms = Array.from(detectedSymptoms).slice(1);
          for (const symptomId of additionalSymptoms) {
            await supabase
              .from('symptom_tracking')
              .insert({
                user_id: user.id,
                symptom: symptomId,
                intensity: intensity,
                source: 'chat',
                notes: enhancedSummary,
                recorded_at: new Date().toISOString()
              });
          }
        }
        
        // Schedule a follow-up WhatsApp notification
        try {
          // Import the notification trigger service dynamically to avoid circular dependencies
          const { notificationTrigger } = await import('@/services/notificationTriggerService');
          
          // Schedule the notification
          const result = await notificationTrigger.scheduleFollowUpNotification(
            user.id, 
            'voice-chat'
          );
          
          console.log('Chat: WhatsApp follow-up scheduled for symptom detection');
          
          if (result.success) {
            // Show a notification about the scheduled follow-up
            toast({
              title: "WhatsApp Follow-up Scheduled",
              description: `A follow-up message will be sent to ${result.phone} in 24 hours to check on your symptoms`,
              variant: "default",
              duration: 8000, // Display for 8 seconds for better visibility
            });
          }
        } catch (notifyError) {
          console.error("Error scheduling voice chat follow-up:", notifyError);
        }
        
        // Return the primary symptom for display
        const symptomObj = symptoms.find(s => s.id === primarySymptom);
        return symptomObj ? symptomObj.name : primarySymptom;
        
      } catch (error) {
        console.error('Error saving symptom:', error);
      }
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
    ? "fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-white to-green-50 rounded-lg shadow-xl backdrop-blur-md bg-white/90 border border-green-200 transition-all duration-300"
    : "fixed bottom-20 right-6 w-96 max-h-[80vh] z-50 flex flex-col bg-gradient-to-br from-white to-green-50 rounded-lg shadow-lg backdrop-blur-md bg-white/90 border border-green-200 transition-all duration-300";

  return (
    <div className={containerClasses}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-200 bg-green-100/50 rounded-t-lg">
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
            className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Messages Container - adjusted height for better visibility */}
      <div className="flex-1 overflow-y-auto p-4 bg-white/30 backdrop-blur-sm max-h-[calc(80vh-140px)]">
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
                <p className={`${message.sender === 'user' ? 'text-sm' : 'text-sm leading-relaxed'}`}>{message.text}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            
            {/* Quick reply buttons after MeNova messages */}
            {message.sender === 'menova' && message.quickReplies && (
              <div className="ml-12 mt-2 flex flex-wrap gap-2">
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
      <div className="p-4 border-t border-green-200 bg-white/50">
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
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            <Mic size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 p-3 border border-green-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-white/80 shadow-inner"
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
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
      
      <style>
        {`
        @keyframes typing {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        @keyframes slide-right {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slide-left {
          from { transform: translateX(10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .typing-dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: currentColor;
          margin: 0 1px;
        }
        
        .animate-typing {
          animation: typing 1.4s infinite;
          animation-fill-mode: both;
        }
        
        .animate-typing:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .animate-typing:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        .animate-slide-right {
          animation: slide-right 0.3s ease-out;
        }
        
        .animate-slide-left {
          animation: slide-left 0.3s ease-out;
        }
        
        .pulse-animation {
          animation: pulse-animation 2s infinite;
        }
        `}
      </style>
    </div>
  );
};

export default MeNovaChatWindow;
