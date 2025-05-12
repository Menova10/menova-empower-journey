
import React, { useState } from 'react';
import MeNovaChatWindow from '@/components/chat/MeNovaChatWindow';
import VapiAssistant from '@/components/VapiAssistant';
import { MessageCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const TextChatPage = () => {
  const [chatMode, setChatMode] = useState<'text' | 'voice' | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  const handleSelectMode = (mode: 'text' | 'voice') => {
    setChatMode(mode);
    setShowOptions(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-white animate-wave relative">
      {/* Floral background overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center bg-[url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')]"></div>
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-4">Talk with MeNova</h1>
          <p className="text-gray-600 mb-8">
            Your supportive companion through menopause. Choose your preferred way to interact with MeNova.
          </p>
          
          {/* Chat options when no mode is selected */}
          {!chatMode && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Text Chat Option */}
                <div 
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-green-100"
                  onClick={() => handleSelectMode('text')}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-xl font-medium text-green-800">Text Chat</h2>
                    <p className="text-gray-600 text-sm">
                      Type or use voice-to-text to communicate with MeNova through written messages.
                    </p>
                  </div>
                </div>

                {/* Voice Chat Option */}
                <div 
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-green-100"
                  onClick={() => handleSelectMode('voice')}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Volume2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-xl font-medium text-green-800">Voice Chat</h2>
                    <p className="text-gray-600 text-sm">
                      Have a conversation with MeNova using your voice for a more natural interaction.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Return button */}
              <Button 
                variant="outline" 
                className="mt-4 mx-auto border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => window.history.back()}
              >
                Return to previous page
              </Button>
            </div>
          )}
        </div>
        
        {/* Display the selected chat mode */}
        {chatMode === 'text' && (
          <div className="w-full max-w-3xl">
            <MeNovaChatWindow />
            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                className="border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => setChatMode(null)}
              >
                Back to options
              </Button>
            </div>
          </div>
        )}

        {chatMode === 'voice' && (
          <div className="w-full max-w-3xl flex flex-col items-center">
            <div className="mb-6 bg-white p-6 rounded-lg shadow-md border border-green-100 w-full text-center">
              <p className="mb-4">Click the MeNova button below to start a voice conversation:</p>
              <div className="flex justify-center">
                <VapiAssistant className="bg-green-500 hover:bg-green-600 transition-colors" />
              </div>
            </div>
            <Button 
              variant="outline" 
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => setChatMode(null)}
            >
              Back to options
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextChatPage;
