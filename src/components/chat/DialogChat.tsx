
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minimize } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ConversationStarters from './ConversationStarters';
import { useChat } from '@/hooks/useChat';

interface DialogChatProps {
  isVisible: boolean;
  onClose: () => void;
}

const DialogChat = ({ isVisible, onClose }: DialogChatProps) => {
  const { toggleExpand } = useChatStore();
  const { sendMessage } = useChat();
  
  if (!isVisible) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] h-[600px] max-h-[80vh] flex flex-col p-0">
        <div className="bg-menova-green p-3 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-medium">Chat with MeNova</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleExpand}
              className="text-white hover:bg-menova-green/90"
            >
              <Minimize size={18} />
            </Button>
          </div>
        </div>
        
        <ConversationStarters onStarterClick={sendMessage} />
        <ChatMessages />
        <ChatInput />
      </DialogContent>
    </Dialog>
  );
};

export default DialogChat;
