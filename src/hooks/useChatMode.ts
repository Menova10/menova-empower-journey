
import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useIsMobile } from '@/hooks/use-mobile';

export type ChatMode = 'popup' | 'dialog' | 'drawer';

export const useChatMode = () => {
  const isMobile = useIsMobile();
  const { isExpanded } = useChatStore();
  const [chatMode, setChatMode] = useState<ChatMode>('popup');
  
  // Set chat mode based on screen size and expanded state
  useEffect(() => {
    if (isMobile) {
      setChatMode('drawer');
    } else if (isExpanded) {
      setChatMode('dialog');
    } else {
      setChatMode('popup');
    }
  }, [isMobile, isExpanded]);

  return { chatMode };
};
