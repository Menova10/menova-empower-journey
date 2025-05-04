
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

const ChatButton = () => {
  const { openChat } = useChatStore();
  
  return (
    <Button 
      onClick={openChat}
      className="fixed bottom-20 right-6 z-40 bg-menova-green hover:bg-menova-green/90 text-white rounded-full py-3 px-4 shadow-lg cursor-pointer flex items-center gap-2"
    >
      <MessageCircle size={18} />
      <span className="text-sm font-medium">Text Chat</span>
    </Button>
  );
};

export default ChatButton;
