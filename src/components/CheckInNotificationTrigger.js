import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * This component handles sending WhatsApp notifications when a user
 * completes a symptom check-in. It should be included in the check-in form.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.submitted - Whether the check-in form was submitted
 * @param {string[]} props.symptoms - Array of symptoms reported
 */
const CheckInNotificationTrigger = ({ submitted, symptoms }) => {
  useEffect(() => {
    // Only trigger when the form is submitted with symptoms
    if (submitted && symptoms && symptoms.length > 0) {
      const triggerNotification = async () => {
        try {
          // Get current user
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          
          // Send to the webhook endpoint
          await fetch('/api/check-in-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: session.user.id,
              symptoms: symptoms
            }),
          });
          
          console.log('Check-in notification triggered successfully');
        } catch (error) {
          console.error('Error triggering check-in notification:', error);
        }
      };
      
      triggerNotification();
    }
  }, [submitted, symptoms]);
  
  // This is a non-visual component
  return null;
};

export default CheckInNotificationTrigger; 