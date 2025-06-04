import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import http from 'http';
import resourcesRouter from './src/server/api/resources.js';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// If in production, serve static files from the build directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Default VAPID keys for testing - DO NOT USE IN PRODUCTION!
const DEFAULT_PUBLIC_KEY = 'BNbKwE3jf2S1F42OjUO9bKtQiEyYWdQ1ivtP3YfPQOK99Db-u-CWEv3gcyPRPILXLb9vhq-U_-3-ACinR0CYV6Y';
const DEFAULT_PRIVATE_KEY = 'KpXTETtvNGQxZHh-lb9KgMl-kqS4t0tZS9lXUQzUQYM';
const DEFAULT_CONTACT = 'mailto:test@example.com';

// Set up VAPID keys for web push
try {
  webpush.setVapidDetails(
    process.env.WEB_PUSH_CONTACT || DEFAULT_CONTACT,
    process.env.VAPID_PUBLIC_KEY || DEFAULT_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY || DEFAULT_PRIVATE_KEY
  );
  console.log('VAPID keys configured successfully');
} catch (error) {
  console.error('Error setting VAPID details:', error.message);
  console.log('Using fallback VAPID configuration for testing');
  
  webpush.setVapidDetails(
    DEFAULT_CONTACT,
    DEFAULT_PUBLIC_KEY,
    DEFAULT_PRIVATE_KEY
  );
}

// Initialize Supabase client with fallback to dummy client if credentials not provided
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('Supabase client initialized successfully');
  } else {
    // Create a mock client for testing
    console.warn('No Supabase credentials found. Using mock Supabase client for testing.');
    supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'test-user-id' } }),
            limit: () => Promise.resolve({ data: [{ symptom: 'hot flashes', created_at: new Date() }] }),
            order: () => ({ limit: () => Promise.resolve({ data: [{ symptom: 'hot flashes' }] }) })
          }),
          order: () => ({ limit: () => Promise.resolve({ data: [{ symptom: 'hot flashes' }] }) })
        }),
        delete: () => ({ eq: () => Promise.resolve({}) }),
        upsert: () => Promise.resolve({})
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'test-user-id' } } } })
      }
    };
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
}

// Initialize Twilio client for WhatsApp notifications
let twilioClient;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio client initialized successfully');
  } else {
    // Create a mock client for testing
    console.warn('No Twilio credentials found. Using mock Twilio client for testing.');
    twilioClient = {
      messages: {
        create: (options) => {
          console.log('MOCK: Would send WhatsApp message:', options);
          return Promise.resolve({ sid: 'mock-message-sid' });
        }
      }
    };
  }
} catch (error) {
  console.error('Error initializing Twilio client:', error);
}

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Add a simple test route
app.get('/api/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running correctly'
  });
});

// Save push subscription
app.post('/api/save-subscription', async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields' 
      });
    }
    
    // In testing mode, just return success
    if (!process.env.SUPABASE_URL) {
      return res.status(201).json({ 
        status: 'success', 
        message: 'Subscription saved (TEST MODE)' 
      });
    }
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
    }
    
    // Save or update subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        updated_at: new Date()
      }, {
        onConflict: 'user_id'
      });
      
    if (error) {
      console.error('Error saving subscription:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to save subscription' 
      });
    }
    
    return res.status(201).json({ 
      status: 'success', 
      message: 'Subscription saved' 
    });
    
  } catch (error) {
    console.error('Error in save-subscription:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// Delete push subscription
app.post('/api/delete-subscription', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields' 
      });
    }
    
    // In testing mode, just return success
    if (!process.env.SUPABASE_URL) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'Subscription deleted (TEST MODE)' 
      });
    }
    
    // Delete subscription
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error deleting subscription:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to delete subscription' 
      });
    }
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Subscription deleted' 
    });
    
  } catch (error) {
    console.error('Error in delete-subscription:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// Send test notification
app.post('/api/send-test-notification', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required field: userId' 
      });
    }
    
    // For testing mode without Supabase
    if (!process.env.SUPABASE_URL) {
      console.log('TEST MODE: Would send a push notification');
      return res.status(200).json({ 
        status: 'success', 
        message: 'Test notification sent (TEST MODE)' 
      });
    }
    
    // Get user's subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Subscription not found' 
      });
    }
    
    // Prepare notification payload
    const notificationPayload = {
      title: 'MeNova Test Notification',
      body: 'This is a test notification from MeNova. Your notifications are working!',
      icon: '/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png',
      url: '/',
      timestamp: Date.now()
    };
    
    // Send push notification
    await webpush.sendNotification(
      data.subscription,
      JSON.stringify(notificationPayload)
    );
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Test notification sent' 
    });
    
  } catch (error) {
    console.error('Error sending test notification:', error);
    
    // Check if it's a subscription expired error
    if (error.statusCode === 410) {
      return res.status(410).json({ 
        status: 'error', 
        message: 'Subscription has expired or is invalid' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to send notification' 
    });
  }
});

// Send WhatsApp notification
app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { userId, phone } = req.body;
    
    if (!userId || !phone) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields' 
      });
    }
    
    // For testing mode
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`TEST MODE: Would send WhatsApp message to ${phone}`);
      return res.status(200).json({ 
        status: 'success', 
        message: 'WhatsApp notification sent (TEST MODE)',
        sid: 'test-message-sid' 
      });
    }
    
    // Format phone number to international format
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = `+${phone}`;
    }
    
    // Get user's latest symptom
    const { data: symptoms, error: symptomsError } = await supabase
      .from('symptoms')
      .select('symptom, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    let messageBody = "Hi there! It's been 24 hours since your last check-in with MeNova. How are you feeling today?";
    
    if (!symptomsError && symptoms && symptoms.length > 0) {
      messageBody = `Hi there! Yesterday you reported symptoms related to ${symptoms[0].symptom}. How are you feeling today? Visit MeNova to log your daily check-in.`;
    }
    
    // Send WhatsApp message using Twilio
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
      to: `whatsapp:${formattedPhone}`
    });
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'WhatsApp notification sent',
      sid: message.sid
    });
    
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to send WhatsApp notification',
      error: error.message
    });
  }
});

// Webhook endpoint for daily check-in submissions
app.post('/api/check-in-webhook', async (req, res) => {
  try {
    const { userId, symptoms } = req.body;
    
    if (!userId || !symptoms) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields' 
      });
    }
    
    // For testing mode without Supabase
    if (!process.env.SUPABASE_URL) {
      console.log('TEST MODE: Would process a check-in webhook');
      console.log(`User: ${userId}, Symptoms: ${symptoms.join(', ')}`);
      return res.status(200).json({ 
        status: 'success', 
        message: 'Check-in webhook processed (TEST MODE)' 
      });
    }
    
    // Get user's phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .single();
      
    if (!profileError && profile && profile.phone) {
      // Schedule a WhatsApp notification for 24 hours later
      // In a real implementation, you'd use a task queue or scheduler like Bull
      // For demo purposes, we'll just log it
      console.log(`Scheduled WhatsApp notification for user ${userId} with phone ${profile.phone} in 24 hours`);
      
      // For demo, we'll send it immediately
      let formattedPhone = profile.phone;
      if (!profile.phone.startsWith('+')) {
        formattedPhone = `+${profile.phone}`;
      }
      
      let messageBody = "Thank you for your check-in with MeNova! We'll check back with you in 24 hours to see how you're feeling.";
      
      try {
        await twilioClient.messages.create({
          body: messageBody,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
          to: `whatsapp:${formattedPhone}`
        });
        console.log('Confirmation WhatsApp message sent');
      } catch (twilioError) {
        console.error('Error sending WhatsApp message:', twilioError);
      }
    }
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Check-in webhook processed' 
    });
    
  } catch (error) {
    console.error('Error processing check-in webhook:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
const broadcast = (data) => {
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(data));
    }
  });
};

// Update Vapi Webhook endpoint to broadcast transcriptions
app.post('/api/vapi-webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Validate webhook payload
    if (!type || !data) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook payload'
      });
    }

    // Handle different event types
    switch (type) {
      case 'transcript':
        // Broadcast transcription to connected clients
        broadcast({
          type: 'transcript',
          text: data.text,
          isFinal: data.isFinal
        });
        break;
        
      case 'function_call':
        // Handle function calls from the assistant
        console.log('Received function call:', data.name);
        break;
        
      case 'call_ended':
        // Handle call end events
        console.log('Call ended:', data.reason);
        broadcast({
          type: 'transcript_end',
          text: data.finalTranscript
        });
        break;
        
      default:
        console.log('Unhandled event type:', type);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Webhook received'
    });

  } catch (error) {
    console.error('Error in vapi-webhook:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Routes
app.use('/api', resourcesRouter);

// Catch-all route for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Update server listen to use the HTTP server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Visit http://localhost:${PORT}/api/test to verify the server is running`);
  console.log(`WebSocket server is ready on ws://localhost:${PORT}`);
}); 