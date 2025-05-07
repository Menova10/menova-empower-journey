
import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, MicOff, Speaker } from 'lucide-react';
import { useVapi } from '@/contexts/VapiContext';

interface VapiAssistantProps {
  onSpeaking?: (speaking: boolean) => void;
  className?: string;
}

const VapiAssistant = forwardRef<any, VapiAssistantProps>(({ onSpeaking, className }, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const { 
    isSpeaking,
    isListening, 
    isConnected,
    startListening,
    stopListening,
    speak,
    connect,
    disconnect
  } = useVapi();

  // Connect to Vapi when component mounts
  useEffect(() => {
    if (open && !isConnected) {
      connect();
    }
  }, [open, isConnected]);

  // Call onSpeaking prop when isSpeaking changes
  useEffect(() => {
    if (onSpeaking) onSpeaking(isSpeaking);
  }, [isSpeaking, onSpeaking]);
  
  // Expose the speak method to parent components
  useImperativeHandle(ref, () => ({
    speak: async (text: string) => {
      console.log("MeNova says:", text);
      await speak(text);
    }
  }));

  const handleAssistantClick = () => {
    if (isAuthenticated) {
      setOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handleSendMessage = async () => {
    if (message.trim()) {
      // In a real implementation, this would call Vapi's text input API
      // For now, we'll just speak a response
      const userMessage = message;
      setMessage('');
      
      // Simulate a response
      const responses = [
        "I'm here to help you through your menopause journey. What can I assist you with today?",
        "That's a common concern during menopause. Would you like some information about managing those symptoms?",
        "I understand how challenging this can be. Let's work through some strategies together."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      await speak(randomResponse);
    }
  };

  const handleToggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  return (
    <>
      <Button
        onClick={handleAssistantClick}
        className={className || `rounded-full w-14 h-14 bg-menova-green text-white shadow-lg hover:bg-menova-green/90 ${isSpeaking ? 'animate-float' : ''} flex items-center justify-center p-0`}
      >
        <div className="rounded-full overflow-hidden w-12 h-12 border-2 border-white">
          <img 
            src="/lovable-uploads/9f5f031b-af45-4b14-96fd-a87e2a176359.png" 
            alt="MeNova Assistant" 
            className="w-full h-full object-cover"
          />
        </div>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Chat with MeNova</span>
              <div className="flex space-x-2">
                <Button 
                  size="icon"
                  variant={isListening ? "default" : "outline"}
                  className={`rounded-full ${isListening ? 'bg-menova-green hover:bg-menova-green/90 text-white' : 'text-menova-green'}`}
                  onClick={handleToggleListening}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </Button>
                <Button 
                  size="icon"
                  variant={isSpeaking ? "default" : "outline"}
                  className={`rounded-full ${isSpeaking ? 'bg-menova-green hover:bg-menova-green/90 text-white' : 'text-menova-green'}`}
                >
                  <Speaker size={18} />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 h-[300px] overflow-y-auto p-4 bg-white/80 rounded-md">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img 
                  src="/lovable-uploads/9f5f031b-af45-4b14-96fd-a87e2a176359.png" 
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
});

VapiAssistant.displayName = 'VapiAssistant';

export default VapiAssistant;
