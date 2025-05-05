
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, Send, X } from 'lucide-react';

const Chat = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m MeNova, your companion through menopause. How are you feeling today?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  
  // Redirect if not authenticated
  useState(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    // Add user message
    setMessages([...messages, { role: 'user', content: inputMessage }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          role: 'assistant', 
          content: `Thank you for sharing. I understand how that can feel during menopause. How can I support you today?` 
        }
      ]);
    }, 1000);
    
    setInputMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md h-full flex flex-col">
          <div className="p-4 border-b border-menova-green/20 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-menova-text">Chat with MeNova</h1>
            <div className="rounded-full overflow-hidden w-10 h-10 border-2 border-menova-green/20">
              <img 
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                alt="MeNova" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                    <img 
                      src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                      alt="MeNova" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div 
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === 'user' 
                      ? 'bg-menova-green/20 text-menova-text ml-2' 
                      : 'bg-menova-lightgreen text-menova-text'
                  }`}
                >
                  <p>{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden ml-2 bg-menova-green/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">You</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-menova-green/20">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 rounded-md border border-menova-green/30 focus:outline-none focus:ring-2 focus:ring-menova-green/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <Button 
                onClick={handleSendMessage}
                className="bg-menova-green hover:bg-menova-green/90 text-white"
              >
                <Send size={18} />
                <span className="sr-only">Send</span>
              </Button>
              <Button 
                variant="outline" 
                className="border-menova-green/30 text-menova-green hover:bg-menova-green/10"
              >
                <Mic size={18} />
                <span className="sr-only">Voice</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
