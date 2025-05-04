
import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useChatMode, ChatMode } from '@/hooks/useChatMode';
import { getWelcomeMessage } from '@/utils/chatUtils';
import { useChat } from '@/hooks/useChat';

// Import our new components
import ChatButton from './chat/ChatButton';
import PopupChat from './chat/PopupChat';
import DialogChat from './chat/DialogChat';
import DrawerChat from './chat/DrawerChat';

const ChatInterface = () => {
  const { 
    isOpen, 
    messages, 
    closeChat,
    addMessage 
  } = useChatStore();
  
  const { chatMode } = useChatMode();
  
  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage(getWelcomeMessage());
    }
  }, [isOpen, messages.length, addMessage]);

  // Handle close chat
  const handleCloseChat = () => {
    closeChat();
    // Don't clear messages to preserve conversation
  };
  
  return (
    <>
      <ChatButton />
      <PopupChat 
        isVisible={isOpen && chatMode === 'popup'} 
        onClose={handleCloseChat} 
      />
      <DialogChat 
        isVisible={isOpen && chatMode === 'dialog'} 
        onClose={handleCloseChat} 
      />
      <DrawerChat 
        isVisible={isOpen && chatMode === 'drawer'} 
        onClose={handleCloseChat} 
      />
    </>
  );
};

export default ChatInterface;
