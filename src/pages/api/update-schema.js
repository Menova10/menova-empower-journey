import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API endpoint to update the database schema
 * IMPORTANT: Delete this file after use for security reasons
 */
export default async function handler(req, res) {
  // Only allow POST method with a secure key for safety
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // For extra security, require a secret key in the request
  const { secretKey } = req.body;
  if (secretKey !== 'menova_temp_schema_update') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Run the SQL to add the phone column
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Add phone column to profiles table
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS phone TEXT;
        
        -- Add comment to the column for documentation
        COMMENT ON COLUMN public.profiles.phone IS 'User phone number for WhatsApp notifications, in international format (e.g., +1123456789)';
        
        -- Create index for faster phone lookups
        CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
      `
    });
    
    if (error) {
      console.error('Error updating schema:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to update schema',
        error: error.message
      });
    }
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Schema updated successfully'
    });
    
  } catch (error) {
    console.error('Error in update-schema API:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error',
      error: error.message
    });
  }
} 