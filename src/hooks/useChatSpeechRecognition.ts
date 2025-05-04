
import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export const useChatSpeechRecognition = (onTranscriptChange: (transcript: string) => void) => {
  const { isRecording, startRecording, stopRecording } = useChatStore();
  
  // Initialize speech recognition
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening 
  } = useSpeechRecognition({
    onResult: (result) => {
      onTranscriptChange(result);
    },
    onEnd: () => {
      stopRecording();
    }
  });

  // Handle recording state
  useEffect(() => {
    if (isRecording) {
      startListening();
    } else {
      stopListening();
    }
  }, [isRecording, startListening, stopListening]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      // Return transcript for further processing
      return transcript;
    } else {
      startRecording();
      return '';
    }
  };

  return {
    isListening,
    transcript,
    handleToggleRecording
  };
};
