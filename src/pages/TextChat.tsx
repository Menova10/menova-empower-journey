
import React from 'react';
import MeNovaChatWindow from '@/components/chat/MeNovaChatWindow';

const TextChatPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-white animate-wave relative">
      {/* Floral background overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center bg-[url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')]"></div>
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-4">Chat with MeNova</h1>
          <p className="text-gray-600 mb-8">
            Your supportive companion through menopause. Ask questions, share how you're feeling, or get personalized advice.
          </p>
        </div>
        
        {/* Chat window is displayed on this page but also can appear as a floating widget */}
        <div className="w-full max-w-3xl">
          <MeNovaChatWindow />
        </div>
      </div>
    </div>
  );
};

export default TextChatPage;
