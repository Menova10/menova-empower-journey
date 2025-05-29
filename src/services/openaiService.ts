import { toast } from '@/components/ui/use-toast';

// Get OpenAI API key from environment
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

/**
 * Converts speech to text using OpenAI's Whisper model
 * 
 * @param audioBlob - The audio blob to convert to text
 * @returns A promise that resolves to the transcribed text
 */
export async function convertSpeechToText(audioBlob: Blob): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not set');
    return '';
  }
  
  try {
    // Create form data to send to OpenAI API
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    
    // Send request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.text) {
      throw new Error('No transcription received from OpenAI');
    }
    
    return data.text;
  } catch (error) {
    console.error('Error converting speech to text:', error);
    throw error; // Propagate the error to be handled by the caller
  }
}

/**
 * Simple mock implementation for development without API key
 * This simulates OpenAI's speech-to-text conversion
 * 
 * @param audioBlob - The audio blob to convert to text
 * @returns A promise that resolves to a mock transcribed text
 */
export async function mockSpeechToText(audioBlob: Blob): Promise<string> {
  // If dual transcription is disabled, return empty string
  if (!isDualTranscriptionEnabled()) {
    return '';
  }
  
  // In a real implementation, we would send the audio to OpenAI
  // For now, we'll just return a mock response after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // For testing purposes, sometimes return a mock enhanced transcription
      const shouldEnhance = Math.random() > 0.5;
      
      if (shouldEnhance) {
        resolve('This is a mock enhanced transcription that would be provided by OpenAI.');
      } else {
        // Return an empty string
        resolve('');
      }
    }, 1000);
  });
}

/**
 * Main function to use for speech-to-text conversion
 * Falls back to mock implementation if API key is not set
 * 
 * @param audioBlob - The audio blob to convert to text
 * @returns A promise that resolves to the transcribed text
 */
export async function speechToText(audioBlob: Blob): Promise<string> {
  // If feature is disabled, return empty string immediately
  if (!isDualTranscriptionEnabled()) {
    return '';
  }
  
  // Check if API key is set
  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not set, using mock implementation');
    return mockSpeechToText(audioBlob);
  }
  
  return convertSpeechToText(audioBlob);
} 