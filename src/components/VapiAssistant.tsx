
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, Send, X } from 'lucide-react';

const VapiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m MeNova, your companion through menopause. How are you feeling today?'
    }
  ]);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleAssistantClick = () => {
    if (isAuthenticated) {
      setOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message
    setMessages([...messages, { role: 'user', content: message }]);
    
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
    
    setMessage('');
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Chat with MeNova</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => setOpen(false)}
              >
                <X size={18} />
                <span className="sr-only">Close</span>
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 h-[300px] overflow-y-auto p-4 bg-white/80 rounded-md">
            {messages.map((msg, index) => (
              <div key={index} className="flex items-start gap-2">
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                      alt="MeNova" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`${
                  msg.role === 'assistant' 
                    ? 'bg-menova-lightgreen ml-0 mr-auto' 
                    : 'bg-menova-green/20 ml-auto mr-0'
                  } p-3 rounded-lg max-w-[80%]`}
                >
                  <p className="text-sm text-menova-text">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-menova-green/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">You</span>
                  </div>
                )}
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
              <Send size={18} />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VapiAssistant;
