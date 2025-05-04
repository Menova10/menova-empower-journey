
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore, ChatMessage } from '@/stores/chatStore';
import { generateResponse, processForSymptoms, getWelcomeMessage } from '@/utils/chatUtils';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useChat = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const { 
    addMessage,
    clearMessages 
  } = useChatStore();

  // Handle sending a message
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to chat with MeNova",
      });
      navigate('/login');
      return;
    }
    
    try {
      setSending(true);
      
      // Add user message to chat
      const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        sender: 'user',
        message: text.trim()
      };
      
      addMessage(userMessage);
      setMessageInput('');
      
      // Save message to database if authenticated
      if (user) {
        try {
          // Create a session if needed
          let sessionId: string | null = null;
          
          const { data: existingSessions, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_type', 'chat')
            .order('started_at', { ascending: false })
            .limit(1);
            
          if (sessionsError) {
            console.error('Error getting sessions:', sessionsError);
          }
            
          if (existingSessions && existingSessions.length > 0) {
            sessionId = existingSessions[0].id;
          } else {
            // Create new session
            const { data: newSession, error: newSessionError } = await supabase
              .from('user_sessions')
              .insert({
                user_id: user.id,
                session_type: 'chat',
                title: 'Chat Session ' + new Date().toLocaleString()
              })
              .select('id')
              .single();
              
            if (newSessionError) {
              console.error('Error creating session:', newSessionError);
            } else if (newSession) {
              sessionId = newSession.id;
            }
          }
          
          // Save the message if we have a session
          if (sessionId) {
            await supabase
              .from('session_messages')
              .insert({
                session_id: sessionId,
                sender: userMessage.sender,
                message: userMessage.message,
                timestamp: new Date().toISOString()
              })
              .then(() => {
                // Success case handled silently
              })
              .then(null).catch((error) => {   // Fixed: Added .then(null) before .catch()
                console.error('Error saving message:', error);
              });
          }
          
          // Process for symptoms
          const detectedSymptom = processForSymptoms(text);
          if (detectedSymptom && user) {
            await supabase
              .from('symptom_tracker')
              .insert({
                user_id: user.id,
                symptom: detectedSymptom,
                source: 'chat',
                recorded_at: new Date().toISOString(),
                notes: `Automatically detected from chat conversation`
              })
              .then(() => {
                // Success case handled silently
              })
              .then(null).catch((error) => {   // Fixed: Added .then(null) before .catch()
                console.error('Error saving symptom:', error);
              });
            
            // Notify user subtly
            toast({
              title: "Symptom Logged",
              description: `I've noted your ${detectedSymptom.toLowerCase()} in your symptom tracker.`,
            });
          }
        } catch (error) {
          console.error('Error saving message:', error);
        }
      }
      
      // Generate assistant response
      setTimeout(() => {
        const response = generateResponse(text);
        
        const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          sender: 'assistant',
          message: response
        };
        
        addMessage(assistantMessage);
        
        // Save assistant response to database if authenticated
        if (user && userMessage.sender === 'user') {
          // Get the last created session
          supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_type', 'chat')
            .order('started_at', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
              if (error) {
                console.error('Error getting session:', error);
                return;
              }
              
              if (data && data.length > 0) {
                const sessionId = data[0].id;
                
                // Save assistant message
                supabase
                  .from('session_messages')
                  .insert({
                    session_id: sessionId,
                    sender: assistantMessage.sender,
                    message: assistantMessage.message,
                    timestamp: new Date().toISOString()
                  })
                  .then(() => {
                    // Success case handled silently
                  })
                  .then(null).catch((error) => {   // Fixed: Added .then(null) before .catch()
                    console.error('Error saving assistant message:', error);
                  });
              }
            })
            .then(null).catch((error) => {   // Fixed: Added .then(null) before .catch()
              console.error('Error getting session:', error);
            });
        }
        
        setSending(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setSending(false);
    }
  };

  return {
    messageInput,
    setMessageInput,
    sending,
    sendMessage
  };
};
