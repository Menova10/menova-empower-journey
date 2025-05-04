
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useChatSpeechRecognition } from '@/hooks/useChatSpeechRecognition';
import { useChatStore } from '@/stores/chatStore';

const ChatInput = () => {
  const { 
    messageInput, 
    setMessageInput, 
    sending, 
    sendMessage 
  } = useChat();
  
  const { isRecording } = useChatStore();
  
  const { handleToggleRecording } = useChatSpeechRecognition((transcript) => {
    setMessageInput(transcript);
  });

  const handleSendClick = () => {
    sendMessage(messageInput);
  };

  const handleToggleMic = () => {
    const transcript = handleToggleRecording();
    if (transcript) {
      sendMessage(transcript);
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex space-x-2">
        <Input
          placeholder={isRecording ? "Listening..." : "Type your message..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(messageInput);
            }
          }}
          disabled={sending || isRecording}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleMic}
          className={isRecording ? "text-red-500 border-red-500" : ""}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </Button>
        <Button
          onClick={handleSendClick}
          disabled={sending || (!messageInput.trim() && !isRecording)}
          className="bg-menova-green hover:bg-menova-green/90 text-white"
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
