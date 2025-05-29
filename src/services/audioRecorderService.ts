/**
 * Service to handle audio recording for speech-to-text conversion
 * This is used to capture audio in parallel with Vapi for improved recognition
 */

class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;
  
  /**
   * Starts recording audio
   * @returns A promise that resolves when recording has started
   */
  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        console.log('Already recording');
        return;
      }
      
      // Reset audio chunks
      this.audioChunks = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(stream);
      
      // Add data handler
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }
  
  /**
   * Stops recording audio
   * @returns A promise that resolves to the recorded audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Not recording'));
        return;
      }
      
      // Add handler for when recording stops
      this.mediaRecorder.onstop = () => {
        // Create blob from audio chunks
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Stop all tracks
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        
        // Reset recording state
        this.isRecording = false;
        
        console.log('Recording stopped, blob size:', audioBlob.size);
        
        // Resolve with audio blob
        resolve(audioBlob);
      };
      
      // Stop recording
      this.mediaRecorder.stop();
    });
  }
  
  /**
   * Checks if recording is in progress
   * @returns True if recording, false otherwise
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

// Export singleton instance
export const audioRecorder = new AudioRecorderService(); 