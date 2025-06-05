import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageCircle, Mic } from 'lucide-react';
import MeNovaChatWindow from './chat/MeNovaChatWindow';
import VapiAssistant from './VapiAssistant';
import { Button } from '@/components/ui/button';
import { useVapi } from '@/contexts/VapiContext';

interface MeNovaChatButtonProps {
  className?: string;
  variant?: 'default' | 'floating';
}

const MeNovaChatButton: React.FC<MeNovaChatButtonProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<'text' | 'voice' | null>(null);
  const vapiAssistantRef = useRef<any>(null);
  const { startAssistant, stopAssistant, sdkLoaded } = useVapi();
  
  const handleButtonClick = () => {
    // Show options dialog instead of directly opening text chat
    setShowOptions(true);
  };

  const selectMode = (mode: 'text' | 'voice') => {
    if (mode === 'voice') {
      // For voice mode, directly trigger the VapiAssistant click
      const vapiButton = document.querySelector('[data-vapi-button]');
      if (vapiButton) {
        (vapiButton as HTMLButtonElement).click();
      }
    } else {
      setSelectedMode(mode);
    }
    setShowOptions(false);
  };

  const closeChat = () => {
    setSelectedMode(null);
  };

  // When voice chat is opened, make sure the assistant greets the user
  useEffect(() => {
    if (selectedMode === 'voice' && sdkLoaded && vapiAssistantRef.current) {
      // Let the component mount first
      const timer = setTimeout(() => {
        if (vapiAssistantRef.current && vapiAssistantRef.current.sendTextMessage) {
          // This will make the assistant speak the initial greeting
          vapiAssistantRef.current.sendTextMessage(
            "Hello! I'm MeNova, your companion through menopause. How are you feeling today?"
          );
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedMode, sdkLoaded]);

  return (
    <>
      <button 
        onClick={handleButtonClick}
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

      {/* Options Dialog */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How would you like to chat?</DialogTitle>
            <DialogDescription>
              Choose how you want to interact with MeNova
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 mt-4">
            <Button 
              onClick={() => selectMode('text')} 
              className="flex-1 flex flex-col items-center py-6 gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
              variant="outline"
            >
              <MessageCircle size={24} className="text-[#92D9A9]" />
              <span>Text Chat</span>
            </Button>
            <Button 
              onClick={() => selectMode('voice')} 
              className="flex-1 flex flex-col items-center py-6 gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
              variant="outline"
            >
              <Mic size={24} className="text-[#92D9A9]" />
              <span>Voice Chat</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show the selected chat mode */}
      {selectedMode === 'text' && <MeNovaChatWindow onClose={closeChat} />}
      
      {/* Hidden VapiAssistant for voice mode - only button is hidden, dialog will show when clicked */}
      <div style={{ display: 'none' }}>
        <VapiAssistant ref={vapiAssistantRef} />
      </div>
    </>
  );
};

export default MeNovaChatButton;
