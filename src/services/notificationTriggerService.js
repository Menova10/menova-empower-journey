import { sendWhatsAppNotification } from '@/services/mockWhatsAppService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Service to trigger WhatsApp follow-up notifications after symptom tracking or voice chat interactions
 */
class NotificationTriggerService {
  /**
   * Schedules a follow-up WhatsApp notification for 24 hours later
   * 
   * @param {string} userId - The user ID to send notification to
   * @param {string} interactionType - Type of interaction (symptom-tracker, voice-chat)
   * @returns {Promise<object>} Result of the scheduled notification
   */
  async scheduleFollowUpNotification(userId, interactionType) {
    try {
      if (!userId) {
        throw new Error('User ID is required to schedule notification');
      }
      
      // Get user's profile data including phone number
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        throw new Error('Unable to retrieve user profile');
      }
      
      if (!profile.phone) {
        console.warn('No phone number available for user, skipping WhatsApp notification');
        return { success: false, reason: 'no-phone' };
      }
      
      // Prepare notification data
      const now = new Date();
      const followUpTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      
      // Create personalized message based on interaction type
      let message = '';
      const userName = profile.full_name ? profile.full_name.split(' ')[0] : 'there';
      
      if (interactionType === 'symptom-tracker') {
        message = `Hi ${userName}, it's been 24 hours since you logged your symptoms with MeNova. How are you feeling today? Log in to track any changes in your symptoms.`;
      } else if (interactionType === 'voice-chat') {
        message = `Hi ${userName}, following up on our chat yesterday. I hope you're feeling better today. Is there anything else I can help you with?`;
      } else {
        message = `Hi ${userName}, checking in with you from MeNova. How are you feeling today?`;
      }
      
      // In a real production app, we would store this in a database table to be processed
      // by a background job. For the demo, we'll use setTimeout to simulate this.
      
      // Log the scheduled notification
      console.log(`✅ Scheduled WhatsApp follow-up for ${profile.phone} at ${followUpTime.toLocaleString()}`);
      
      // Demo: Immediately show in console what will be sent later
      console.log('📱 Follow-up will send:', { 
        to: profile.phone, 
        message, 
        scheduledFor: followUpTime 
      });
      
      // For demo purposes, send immediately with a short delay so it feels like a real notification
      setTimeout(async () => {
        try {
          await sendWhatsAppNotification(profile.phone, message);
          console.log('✅ Demo: Follow-up notification sent immediately (simulating 24h wait)');
          
          // Update last notification time in profiles
          await supabase
            .from('profiles')
            .update({ last_notification: new Date().toISOString() })
            .eq('id', userId);
            
        } catch (error) {
          console.error('Error sending follow-up notification:', error);
        }
      }, 5000); // Send after 5 seconds for demo purposes
      
      return { 
        success: true, 
        scheduledFor: followUpTime.toISOString(),
        phone: profile.phone
      };
    } catch (error) {
      console.error('Error scheduling follow-up notification:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const notificationTrigger = new NotificationTriggerService(); 