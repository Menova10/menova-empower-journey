import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, MicOff, Speaker, Volume2, VolumeX } from 'lucide-react';
import { useVapi } from '@/contexts/VapiContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface VapiAssistantProps {
  onSpeaking?: (speaking: boolean) => void;
  className?: string;
}

const VapiAssistant = forwardRef<any, VapiAssistantProps>(({ onSpeaking, className }, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const navigate = useNavigate();

  const {
    isSpeaking,
    isListening,
    sdkLoaded,
    error,
    startAssistant,
    stopAssistant,
  } = useVapi();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Start/stop assistant on dialog open/close
  useEffect(() => {
    if (open && sdkLoaded) {
      startAssistant();
    } else if (!open) {
      stopAssistant();
    }
  }, [open, sdkLoaded, startAssistant, stopAssistant]);

  // Expose a dummy speak method for parent compatibility (no-op)
  useImperativeHandle(ref, () => ({
    speak: async (_text: string) => {},
  }));

  const handleAssistantClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handleSendMessage = async () => {
    if (message.trim()) {
      setMessage('');
      // Optionally, implement text input to Vapi if supported in future
    }
  };

  const handleToggleAudio = () => {
    setAudioMuted(!audioMuted);
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
                {/* Only audio toggle remains */}
                <Button 
                  size="icon"
                  variant={audioMuted ? "outline" : "default"}
                  className={`rounded-full ${!audioMuted ? 'bg-menova-green hover:bg-menova-green/90 text-white' : 'text-menova-green'}`}
                  onClick={handleToggleAudio}
                  disabled={!sdkLoaded}
                >
                  {audioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </Button>
              </div>
            </DialogTitle>
            {!sdkLoaded && (
              <DialogDescription className="text-yellow-600">
                Voice assistant is loading...
              </DialogDescription>
            )}
            {error && (
              <DialogDescription className="text-red-500">
                Error: Could not connect voice assistant
              </DialogDescription>
            )}
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
