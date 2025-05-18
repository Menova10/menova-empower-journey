/**
 * Mock WhatsApp Service for demonstration purposes
 * This simulates sending WhatsApp messages without requiring actual Twilio credentials
 */

class MockWhatsAppService {
  constructor() {
    this.messages = [];
    this.isEnabled = true;
  }

  /**
   * Simulates sending a WhatsApp message
   * @param {string} to - Recipient phone number
   * @param {string} body - Message content
   * @returns {Promise<object>} - Mock response
   */
  async sendMessage(to, body) {
    // Validate phone format
    if (!to.startsWith('+')) {
      throw new Error('Phone number must be in international format (starting with +)');
    }

    // Create a mock message
    const message = {
      id: `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      to,
      body,
      status: 'delivered',
      sentAt: new Date().toISOString()
    };

    // Store in history
    this.messages.push(message);
    
    // Log for demo purposes
    console.log('✅ DEMO: WhatsApp message sent');
    console.log(`📱 To: ${to}`);
    console.log(`💬 Message: ${body}`);

    // Show browser notification for demo purposes
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('WhatsApp Message Sent', {
          body: `To: ${to}\n${body}`,
          icon: '/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png'
        });
      }
    }

    // Simulate a network delay for realism
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          sid: message.id,
          status: 'sent',
          message
        });
      }, 800);
    });
  }

  /**
   * Get message history
   * @returns {Array} - Sent messages
   */
  getMessageHistory() {
    return this.messages;
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messages = [];
  }
}

// Export singleton instance
export const mockWhatsApp = new MockWhatsAppService();

/**
 * Function to use in place of actual Twilio API calls
 */
export const sendWhatsAppNotification = async (phoneNumber, message) => {
  try {
    return await mockWhatsApp.sendMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error sending mock WhatsApp:', error);
    throw error;
  }
}; 