
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic } from 'lucide-react';

const VapiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
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
    if (message.trim()) {
      // In a real implementation, this would send the message to a backend
      setMessage('');
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle>Chat with MeNova</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 h-[300px] overflow-y-auto p-4 bg-white/80 rounded-md">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img 
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                  alt="MeNova" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-menova-lightgreen p-3 rounded-lg max-w-[80%]">
                <p className="text-sm text-menova-text">
                  Hello! I'm MeNova, your companion through menopause. How are you feeling today?
                </p>
              </div>
            </div>
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
