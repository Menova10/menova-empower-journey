
import { create } from 'zustand';

export type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  message: string;
  timestamp: string;
};

interface ChatState {
  isOpen: boolean;
  isExpanded: boolean;
  isRecording: boolean;
  messages: ChatMessage[];
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  expandChat: () => void;
  collapseChat: () => void;
  toggleExpand: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  isExpanded: false,
  isRecording: false,
  messages: [],
  
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  
  expandChat: () => set({ isExpanded: true }),
  collapseChat: () => set({ isExpanded: false }),
  toggleExpand: () => set((state) => ({ isExpanded: !state.isExpanded })),
  
  startRecording: () => set({ isRecording: true }),
  stopRecording: () => set({ isRecording: false }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [
      ...state.messages, 
      { 
        ...message, 
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString() 
      }
    ] 
  })),
  
  clearMessages: () => set({ messages: [] }),
}));
