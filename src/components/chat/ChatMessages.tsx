
import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';

const ChatMessages = () => {
  const { messages } = useChatStore();
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          {msg.sender === 'assistant' && (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div 
            className={`max-w-[80%] rounded-lg p-3 ${
              msg.sender === 'user' 
                ? 'bg-menova-green text-white' 
                : 'bg-menova-beige text-menova-text'
            }`}
          >
            <p className="text-sm">{msg.message}</p>
          </div>
        </div>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
};

export default ChatMessages;
