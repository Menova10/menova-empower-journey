import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API handler for saving push notification subscriptions
 * This should be placed in pages/api/save-subscription.js for Next.js
 */
export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields' 
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
    console.error('Error in save-subscription API:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
} 