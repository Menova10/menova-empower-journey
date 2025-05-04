
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

interface Session {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
}

const INITIATOR_PROMPTS = [
  "What is menopause?",
  "Hot flash management",
  "Sleep difficulties",
  "Mood changes",
  "Weight management",
  "How MeNova helps"
];

const Chat = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  
  // Check if user is logged in
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Access denied",
        description: "Please log in to chat with MeNova.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    loadSessions();
  }, [isAuthenticated, navigate]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load previous sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_type', 'chat')
        .order('started_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setSessions(data || []);
      
      // If there are sessions, load the most recent one
      // Otherwise, create a new session
      if (data && data.length > 0) {
        setCurrentSessionId(data[0].id);
        await loadMessages(data[0].id);
      } else {
        await createNewSession();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Load messages for a session
  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      // Convert database messages to Message type
      const typedMessages: Message[] = (data || []).map(item => ({
        id: item.id,
        sender: item.sender === 'user' || item.sender === 'assistant' 
          ? (item.sender as 'user' | 'assistant') 
          : 'assistant', // Default to assistant if invalid
        message: item.message,
        timestamp: item.timestamp
      }));
      
      setMessages(typedMessages);
      
      // If no messages, add welcome message
      if (!data || data.length === 0) {
        const welcomeMessage: Message = {
          sender: 'assistant',
          message: "Hello! I'm MeNova, your menopause wellness companion. How can I help you today?",
          timestamp: new Date().toISOString()
        };
        
        setMessages([welcomeMessage]);
        
        // Save welcome message
        await supabase.from('session_messages').insert({
          session_id: sessionId,
          sender: welcomeMessage.sender,
          message: welcomeMessage.message,
          timestamp: welcomeMessage.timestamp
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Create a new session
  const createNewSession = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_type: 'chat',
          title: 'Chat Session ' + new Date().toLocaleString()
        })
        .select('id')
        .single();
        
      if (error) {
        throw error;
      }
      
      setCurrentSessionId(data.id);
      
      // Add welcome message
      const welcomeMessage: Message = {
        sender: 'assistant',
        message: "Hello! I'm MeNova, your menopause wellness companion. How can I help you today?",
        timestamp: new Date().toISOString()
      };
      
      setMessages([welcomeMessage]);
      
      // Save welcome message
      await supabase.from('session_messages').insert({
        session_id: data.id,
        sender: welcomeMessage.sender,
        message: welcomeMessage.message,
        timestamp: welcomeMessage.timestamp
      });
      
      // Refresh sessions list
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create a new chat session.",
        variant: "destructive",
      });
    }
  };
  
  // Send a message
  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentSessionId) return;
    
    try {
      setSending(true);
      
      // Add user message
      const userMessage: Message = {
        sender: 'user',
        message: text.trim(),
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setMessageInput('');
      
      // Save user message
      await supabase.from('session_messages').insert({
        session_id: currentSessionId,
        sender: userMessage.sender,
        message: userMessage.message,
        timestamp: userMessage.timestamp
      });
      
      // Process for symptoms
      await processForSymptoms(text);
      
      // Generate assistant response (mock)
      setTimeout(async () => {
        const assistantResponse = getAssistantResponse(text);
        
        const assistantMessage: Message = {
          sender: 'assistant',
          message: assistantResponse,
          timestamp: new Date().toISOString()
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Save assistant message
        await supabase.from('session_messages').insert({
          session_id: currentSessionId,
          sender: assistantMessage.sender,
          message: assistantMessage.message,
          timestamp: assistantMessage.timestamp
        });
        
        setSending(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
      setSending(false);
    }
  };
  
  // Process for symptoms
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
            source: 'chat',
            recorded_at: new Date().toISOString(),
            notes: `Automatically detected from chat conversation`
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
  
  // Handle initiator click
  const handleInitiatorClick = (prompt: string) => {
    sendMessage(prompt);
  };
  
  // Format date
  const formatSessionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
          {/* Sidebar with sessions */}
          <div className="hidden md:block">
            <Card className="h-full">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-menova-text">Chat Sessions</h2>
                <Button
                  variant="link"
                  onClick={createNewSession}
                  className="px-0 text-menova-green"
                >
                  + New Session
                </Button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-70px)]">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 border-b cursor-pointer ${
                      currentSessionId === session.id ? "bg-menova-green/10" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      loadMessages(session.id);
                    }}
                  >
                    <p className="font-medium truncate">
                      {session.title || "Chat Session"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSessionDate(session.started_at)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          
          {/* Chat area */}
          <div className="md:col-span-3 flex flex-col h-full">
            <Card className="flex-1 flex flex-col">
              {/* Mobile tab view for sessions */}
              <div className="md:hidden border-b">
                <Tabs defaultValue="current" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="current" className="flex-1">Current Chat</TabsTrigger>
                    <TabsTrigger value="sessions" className="flex-1">Past Sessions</TabsTrigger>
                  </TabsList>
                  <TabsContent value="current">
                    {/* Current chat content is below */}
                  </TabsContent>
                  <TabsContent value="sessions">
                    <div className="p-4 space-y-2">
                      <Button
                        variant="outline"
                        onClick={createNewSession}
                        className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                      >
                        + New Session
                      </Button>
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-4 border rounded cursor-pointer ${
                            currentSessionId === session.id ? "border-menova-green bg-menova-green/5" : ""
                          }`}
                          onClick={() => {
                            setCurrentSessionId(session.id);
                            loadMessages(session.id);
                          }}
                        >
                          <p className="font-medium truncate">
                            {session.title || "Chat Session"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatSessionDate(session.started_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Initiator buttons */}
              <div className="p-4 border-b overflow-x-auto flex space-x-2">
                {INITIATOR_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap text-xs border-menova-green text-menova-green hover:bg-menova-green/10"
                    onClick={() => handleInitiatorClick(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              
              {/* Message input */}
              <CardContent className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(messageInput);
                      }
                    }}
                    disabled={sending}
                  />
                  <Button
                    className="bg-menova-green hover:bg-menova-green/90"
                    onClick={() => sendMessage(messageInput)}
                    disabled={sending || !messageInput.trim()}
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
