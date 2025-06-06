import React from 'react';
import { useVapi } from '@/contexts/VapiContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const VoiceTest = () => {
  const { startAssistant, stopAssistant, isSpeaking, isListening, sdkLoaded, error } = useVapi();

  const handleStart = () => {
    console.log("Test: Starting assistant");
    startAssistant();
  };

  const handleStop = () => {
    console.log("Test: Stopping assistant");
    stopAssistant();
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Voice Assistant Test</CardTitle>
            <CardDescription>Test the VAPI integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>SDK Loaded: {sdkLoaded ? '✅' : '❌'}</div>
              <div>Is Speaking: {isSpeaking ? '🔊' : '🔇'}</div>
              <div>Is Listening: {isListening ? '🎤' : '🔇'}</div>
              <div>Error: {error ? '❌' : '✅'}</div>
            </div>
            
            {error && (
              <div className="p-2 bg-red-100 text-red-800 rounded text-sm">
                Error: {error}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleStart} 
                disabled={!sdkLoaded || isListening || isSpeaking}
                className="flex-1"
              >
                Start
              </Button>
              <Button 
                onClick={handleStop} 
                variant="outline"
                disabled={!isListening && !isSpeaking}
                className="flex-1"
              >
                Stop
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              Environment vars:
              <br />• API Key: {import.meta.env.VITE_VAPI_API_KEY ? 'Set' : 'Missing'}
              <br />• Assistant ID: {import.meta.env.VITE_VAPI_ASSISTANT_ID ? 'Set' : 'Missing'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceTest; 