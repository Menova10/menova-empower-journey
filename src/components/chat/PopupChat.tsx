
import { useChatStore } from '@/stores/chatStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Expand } from 'lucide-react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ConversationStarters from './ConversationStarters';
import { useChat } from '@/hooks/useChat';

interface PopupChatProps {
  isVisible: boolean;
  onClose: () => void;
}

const PopupChat = ({ isVisible, onClose }: PopupChatProps) => {
  const { toggleExpand } = useChatStore();
  const { sendMessage } = useChat();
  
  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-24 right-6 z-40 w-[350px] h-[500px] shadow-lg flex flex-col overflow-hidden">
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
            <Expand size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-white hover:bg-menova-green/90"
          >
            <X size={18} />
          </Button>
        </div>
      </div>
      
      <ConversationStarters onStarterClick={sendMessage} />
      <ChatMessages />
      <ChatInput />
    </Card>
  );
};

export default PopupChat;
