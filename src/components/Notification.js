import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NotificationComponent = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to convert VAPID public key to Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    // Check if service workers are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          setRegistration(reg);
          
          // Check if already subscribed
          const existingSubscription = await reg.pushManager.getSubscription();
          if (existingSubscription) {
            setIsSubscribed(true);
            setSubscription(existingSubscription);
            console.log('User is already subscribed:', existingSubscription);
          }
        })
        .catch(error => console.error('Service Worker registration failed:', error));
    } else {
      console.warn('Push notifications not supported in this browser');
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive"
      });
    }
  }, []);

  // Request permission and subscribe to push notifications
  const subscribeUser = async () => {
    try {
      setLoading(true);
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }
      
      // Get user ID from Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User must be logged in to subscribe to notifications');
      }
      
      // Create push subscription
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const subscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      };
      
      const pushSubscription = await registration.pushManager.subscribe(subscriptionOptions);
      setSubscription(pushSubscription);
      setIsSubscribed(true);
      
      // Send subscription to backend
      const response = await fetch('/api/save-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: pushSubscription,
          userId: session.user.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }
      
      toast({
        title: "Subscribed!",
        description: "You'll now receive notifications about your symptoms.",
      });
      
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Subscription Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeUser = async () => {
    try {
      setLoading(true);
      
      if (subscription) {
        // Get user ID
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('User must be logged in to unsubscribe');
        }
        
        // Unsubscribe from push manager
        await subscription.unsubscribe();
        
        // Remove subscription from server
        const response = await fetch('/api/delete-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to remove subscription from server');
        }
        
        setIsSubscribed(false);
        setSubscription(null);
        
        toast({
          title: "Unsubscribed",
          description: "You've successfully unsubscribed from notifications.",
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Unsubscribe Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Test notification
  const sendTestNotification = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User must be logged in to test notifications');
      }
      
      // Send test notification request to server
      const response = await fetch('/api/send-test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
      
      toast({
        title: "Test Sent",
        description: "A test notification has been sent. Check your notifications!",
      });
      
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Test WhatsApp notification
  const sendTestWhatsAppNotification = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User must be logged in to test WhatsApp notifications');
      }
      
      // First, get user's phone from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        throw new Error('Unable to fetch profile information');
      }
      
      if (!profile?.phone) {
        toast({
          title: "Phone Number Required",
          description: "Please add your phone number in your profile first. Make sure to include your country code (e.g., +1 for US).",
          variant: "destructive"
        });
        
        // Ask if they want to go to profile page
        if (window.confirm("Would you like to go to your profile page to add your phone number?")) {
          window.location.href = '/profile';
        }
        return;
      }
      
      // Validate phone format
      if (!profile.phone.startsWith('+')) {
        toast({
          title: "Invalid Phone Format",
          description: "Your phone number must include the country code with a + prefix (e.g., +1 for US).",
          variant: "destructive"
        });
        return;
      }
      
      // Send test WhatsApp notification request to server
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          phone: profile.phone
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send WhatsApp notification');
      }
      
      toast({
        title: "WhatsApp Test Sent",
        description: "A test WhatsApp message has been sent to your registered number.",
      });
      
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      toast({
        title: "WhatsApp Test Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white/90 backdrop-blur-sm">
      <h2 className="text-lg font-medium mb-4 text-menova-text">Notifications</h2>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {isSubscribed 
            ? "You're subscribed to notifications about your symptoms and reminders." 
            : "Subscribe to receive notifications about your symptoms and reminders."}
        </p>
        
        {isSubscribed ? (
          <Button 
            onClick={unsubscribeUser}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800"
            disabled={loading}
          >
            {loading ? "Processing..." : "Unsubscribe from Notifications"}
          </Button>
        ) : (
          <Button 
            onClick={subscribeUser}
            className="w-full bg-[#92D9A9] hover:bg-[#7bc492] text-white"
            disabled={loading}
          >
            {loading ? "Processing..." : "Subscribe to Notifications"}
          </Button>
        )}
        
        {isSubscribed && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              onClick={sendTestNotification}
              className="flex-1 bg-[#92D9A9] hover:bg-[#7bc492] text-white"
              disabled={loading}
            >
              Test Browser Notification
            </Button>
            
            <Button 
              onClick={sendTestWhatsAppNotification}
              className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white"
              disabled={loading}
            >
              Test WhatsApp Notification
            </Button>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Note:</span> You'll receive symptom check-ins and daily reminders. 
          WhatsApp notifications will be sent 24 hours after your check-in.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <a href="/whatsapp-demo" className="text-[#25D366] hover:underline">
            Try the WhatsApp demo without real Twilio credentials →
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotificationComponent; 