
import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import MeNovaChatWindow from './MeNovaChatWindow';

interface MeNovaChatButtonProps {
  variant?: 'fixed' | 'inline';
  className?: string;
}

const MeNovaChatButton = ({ 
  variant = 'fixed', 
  className = '' 
}: MeNovaChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  
  // For fixed variant (floating button)
  if (variant === 'fixed') {
    return (
      <>
        {/* Chat Window (Only shown when open) */}
        {isOpen && <MeNovaChatWindow />}
        
        {/* Floating Chat Button */}
        <button 
          onClick={toggleChat}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-300 hover:scale-110 ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          } ${className}`}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <X className="text-white" size={24} />
          ) : (
            <MessageCircle className="text-white" size={24} />
          )}
        </button>
      </>
    );
  }
  
  // For inline variant (regular button)
  return (
    <>
      <button 
        onClick={toggleChat}
        className={`px-4 py-2 rounded-md shadow-sm flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white transition-all hover:shadow ${className}`}
      >
        <MessageCircle size={18} />
        <span>Chat with MeNova</span>
      </button>
      
      {/* Chat Window (Only shown when open) */}
      {isOpen && <MeNovaChatWindow />}
    </>
  );
};

export default MeNovaChatButton;
