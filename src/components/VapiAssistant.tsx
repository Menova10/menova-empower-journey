
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface Message {
  sender: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

const INITIATOR_PROMPTS = [
  "What is menopause?",
  "Hot flash management",
  "Sleep difficulties",
  "Mood changes",
  "Weight management",
  "How MeNova helps"
];

const VapiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  
  // Initialize a session when the component mounts
  useEffect(() => {
    if (open && isAuthenticated && user) {
      createOrGetActiveSession();
    }
  }, [open, isAuthenticated, user]);

  const createOrGetActiveSession = async () => {
    try {
      if (!isAuthenticated || !user) return;
      
      // Check if there's an active session
      const { data: activeSessions } = await supabase
        .from('user_sessions')
        .select('id')
        .is('ended_at', null)
        .eq('user_id', user.id)
        .eq('session_type', 'voice')
        .order('started_at', { ascending: false })
        .limit(1);
      
      if (activeSessions && activeSessions.length > 0) {
        setSessionId(activeSessions[0].id);
        // Load session messages
        loadSessionMessages(activeSessions[0].id);
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            session_type: 'voice',
            title: 'Voice Session ' + new Date().toLocaleString()
          })
          .select('id')
          .single();
          
        if (error) {
          console.error('Error creating session:', error);
          return;
        }
        
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
      }
    } catch (error) {
      console.error('Error managing session:', error);
    }
  };
  
  const loadSessionMessages = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', id)
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

  const handleAssistantClick = () => {
    if (isAuthenticated) {
      setOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      if (!sessionId) await createOrGetActiveSession();
      
      // Add user message to state
      const userMessageObj: Message = {
        sender: 'user',
        message: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, userMessageObj]);
      
      // Save to database
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        sender: userMessageObj.sender,
        message: userMessageObj.message,
        timestamp: userMessageObj.timestamp
      });
      
      // Process message for potential symptoms
      await processForSymptoms(message);
      
      // Clear input
      setMessage('');
      
      // Mock assistant response (in a real app, this would call an AI API)
      setTimeout(async () => {
        const assistantResponse = getAssistantResponse(message);
        
        const assistantMessageObj: Message = {
          sender: 'assistant',
          message: assistantResponse,
          timestamp: new Date().toISOString()
        };
        
        setMessages((prev) => [...prev, assistantMessageObj]);
        
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
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleInitiatorClick = async (prompt: string) => {
    setMessage(prompt);
    await handleSendMessage();
  };
  
  // Mock function to process for symptoms - in a real app this would use NLP
  const processForSymptoms = async (messageText: string) => {
    if (!user) return;
    
    const lowerMessage = messageText.toLowerCase();
    const symptomKeywords = [
      { keyword: "hot flash", symptom: "Hot flashes" },
      { keyword: "night sweat", symptom: "Night sweats" },
      { keyword: "sleep", symptom: "Sleep problems" },
      { keyword: "insomnia", symptom: "Insomnia" },
      { keyword: "mood swing", symptom: "Mood swings" },
      { keyword: "anxious", symptom: "Anxiety" },
      { keyword: "anxiety", symptom: "Anxiety" },
      { keyword: "depression", symptom: "Depression" },
      { keyword: "fatigue", symptom: "Fatigue" },
      { keyword: "exhausted", symptom: "Fatigue" },
      { keyword: "joint pain", symptom: "Joint pain" },
      { keyword: "headache", symptom: "Headaches" },
      { keyword: "brain fog", symptom: "Brain fog" }
    ];
    
    for (const { keyword, symptom } of symptomKeywords) {
      if (lowerMessage.includes(keyword)) {
        // Auto-log symptom
        try {
          await supabase.from('symptom_tracker').insert({
            user_id: user.id,
            symptom,
            source: 'voice',
            recorded_at: new Date().toISOString(),
            notes: `Automatically detected from voice conversation`
          });
          
          // Notify user subtly
          toast({
            title: "Symptom Logged",
            description: `I've noted your ${symptom.toLowerCase()} in your symptom tracker.`,
          });
          
          break; // Only log the first symptom found
        } catch (error) {
          console.error('Error logging symptom:', error);
        }
      }
    }
  };

  // Mock function to generate responses - in a real app this would call an AI API
  const getAssistantResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hot flash') || message.includes('hot flush')) {
      return "Hot flashes are a common symptom of menopause. Try keeping your environment cool, dressing in layers, avoiding triggers like spicy foods and caffeine, and practicing deep breathing when a hot flash begins. Would you like me to log this symptom for you?";
    } else if (message.includes('sleep') || message.includes('insomnia')) {
      return "Sleep issues during menopause can be challenging. Establishing a regular sleep schedule, keeping your bedroom cool, limiting screen time before bed, and relaxation techniques like meditation may help. I've made a note of your sleep concerns in your symptom tracker.";
    } else if (message.includes('mood') || message.includes('anxiety') || message.includes('depression')) {
      return "Mood changes are normal during menopause due to hormonal fluctuations. Regular exercise, mindfulness meditation, and staying socially connected can help. If these feelings are persistent, speaking with a healthcare provider might be beneficial. I've noted this in your symptom tracker.";
    } else if (message.includes('menopause')) {
      return "Menopause is a natural biological process marking the end of menstrual cycles, typically occurring in your 40s or 50s. It's diagnosed after 12 months without a period. The transition can last several years and includes physical symptoms like hot flashes and emotional symptoms like mood changes, all driven by changing hormone levels.";
    } else {
      return "I'm here to support you through your menopause journey. I can provide information about symptoms, offer management strategies, or simply listen. What specific aspect of menopause would you like to discuss today?";
    }
  };

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        await supabase
          .from('user_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', sessionId);
          
        setOpen(false);
        setSessionId(null);
        setMessages([]);
      } catch (error) {
        console.error('Error ending session:', error);
      }
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleAssistantClick}
        className="rounded-full w-14 h-14 bg-menova-green text-white shadow-lg hover:bg-menova-green/90 animate-float flex items-center justify-center p-0"
      >
        <div className="rounded-full overflow-hidden w-12 h-12 border-2 border-white">
          <img 
            src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
            alt="MeNova Assistant" 
            className="w-full h-full object-cover"
          />
        </div>
      </Button>

      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleEndSession();
        }
        setOpen(newOpen);
      }}>
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle>Talk with MeNova</DialogTitle>
          </DialogHeader>
          
          {/* Initiator buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {INITIATOR_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-xs border-menova-green text-menova-green hover:bg-menova-green/10"
                onClick={() => handleInitiatorClick(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
          
          <div className="flex flex-col space-y-4 h-[300px] overflow-y-auto p-4 bg-white/80 rounded-md">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                      alt="MeNova" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`${
                  msg.sender === 'assistant' 
                    ? "bg-menova-lightgreen" 
                    : "bg-gray-100 ml-auto"
                } p-3 rounded-lg max-w-[80%]`}>
                  <p className="text-sm text-menova-text">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
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
            <Button 
              className="bg-menova-green hover:bg-menova-green/90"
              onClick={handleSendMessage}
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VapiAssistant;
