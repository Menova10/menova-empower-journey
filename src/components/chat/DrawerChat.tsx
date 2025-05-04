
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ConversationStarters from './ConversationStarters';
import { useChat } from '@/hooks/useChat';

interface DrawerChatProps {
  isVisible: boolean;
  onClose: () => void;
}

const DrawerChat = ({ isVisible, onClose }: DrawerChatProps) => {
  const { sendMessage } = useChat();
  
  if (!isVisible) return null;

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[80vh] flex flex-col">
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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-white hover:bg-menova-green/90"
          >
            <ChevronDown size={18} />
          </Button>
        </div>
        
        <ConversationStarters onStarterClick={sendMessage} />
        <ChatMessages />
        <ChatInput />
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerChat;
