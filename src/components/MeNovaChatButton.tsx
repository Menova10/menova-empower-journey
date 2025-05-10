
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface MeNovaChatButtonProps {
  className?: string;
  variant?: 'default' | 'floating';
}

const MeNovaChatButton: React.FC<MeNovaChatButtonProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const navigate = useNavigate();
  const [showChatOptions, setShowChatOptions] = React.useState(false);
  
  const handleChatOptionSelected = (type: 'text') => {
    setShowChatOptions(false);
    
    // Navigate to chat with text mode
    navigate('/chat', { 
      state: { 
        sessionType: type, 
        authenticated: true
      } 
    });
  };

  return (
    <>
      <button 
        onClick={() => setShowChatOptions(true)}
        className={`
          ${variant === 'floating' 
            ? 'fixed bottom-6 right-6 z-40 shadow-lg py-3 px-4 rounded-full' 
            : 'rounded-full py-2 px-6'}
          bg-[#92D9A9] hover:bg-[#7bc492] transition-colors 
          text-white flex items-center gap-2 ${className}
        `}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
          <img 
            src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
            alt="MeNova Character" 
            className="w-full h-full object-cover"
          />
        </div>
        <span className="font-semibold">Talk to MeNova</span>
      </button>

      {/* Chat Options Dialog */}
      <Dialog open={showChatOptions} onOpenChange={setShowChatOptions}>
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle className="text-center">Start a conversation with MeNova</DialogTitle>
            <DialogDescription className="text-center">
              MeNova is here to help with your menopause journey
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Button 
              onClick={() => handleChatOptionSelected('text')}
              className="flex items-center justify-center w-full gap-3 h-auto py-4 bg-white hover:bg-white/80 text-menova-text border border-menova-green/30"
              variant="outline"
            >
              <MessageCircle className="h-6 w-6 text-menova-green" />
              <div className="text-center">
                <p className="font-medium">Open Chat</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MeNovaChatButton;
