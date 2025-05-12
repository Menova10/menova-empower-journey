
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Volume2 } from 'lucide-react';
import MeNovaChatWindow from './chat/MeNovaChatWindow';
import VapiAssistant from './VapiAssistant';

interface MeNovaChatButtonProps {
  className?: string;
  variant?: 'default' | 'floating';
}

const MeNovaChatButton: React.FC<MeNovaChatButtonProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const [showChatOptions, setShowChatOptions] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<'text' | 'voice' | null>(null);
  
  const handleChatOptionSelected = (type: 'text' | 'voice') => {
    setShowChatOptions(false);
    setSelectedMode(type);
  };

  const closeChat = () => {
    setSelectedMode(null);
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
          
          <div className="grid grid-cols-2 gap-6 py-4">
            <Button 
              onClick={() => handleChatOptionSelected('text')}
              className="flex flex-col items-center justify-center w-full gap-3 h-auto py-4 bg-white hover:bg-white/80 text-menova-text border border-menova-green/30"
              variant="outline"
            >
              <MessageCircle className="h-6 w-6 text-menova-green" />
              <div className="text-center">
                <p className="font-medium">Text Chat</p>
                <p className="text-sm text-gray-500">Type messages to MeNova</p>
              </div>
            </Button>
            
            <Button 
              onClick={() => handleChatOptionSelected('voice')}
              className="flex flex-col items-center justify-center w-full gap-3 h-auto py-4 bg-white hover:bg-white/80 text-menova-text border border-menova-green/30"
              variant="outline"
            >
              <Volume2 className="h-6 w-6 text-menova-green" />
              <div className="text-center">
                <p className="font-medium">Voice Chat</p>
                <p className="text-sm text-gray-500">Talk with MeNova using your voice</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show the selected chat mode */}
      {selectedMode === 'text' && <MeNovaChatWindow onClose={closeChat} />}
      {selectedMode === 'voice' && (
        <Dialog open={true} onOpenChange={closeChat}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Voice Chat with MeNova</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <VapiAssistant />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MeNovaChatButton;
