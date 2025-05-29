import { supabase } from '@/integrations/supabase/client';

/**
 * TEMPORARY UTILITY: Adds the phone column to the profiles table
 * WARNING: Only use during development - delete this file after use
 */
export const updateProfilesSchema = async () => {
  try {
    // You need to be logged in as a user with enough permissions
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('You must be logged in to update the schema');
      return { success: false, message: 'Authentication required' };
    }

    // Run the SQL directly via Supabase JavaScript client
    const { error } = await supabase.rpc('execute_sql', {
      query: `
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
      return { success: false, message: error.message };
    }

    console.log('Schema updated successfully!');
    return { success: true, message: 'Schema updated successfully' };
    
  } catch (error) {
    console.error('Error updating schema:', error);
    return { success: false, message: error.message };
  }
};

// Instructions:
// 1. Import this function in a component or run it from the browser console
// 2. Call updateProfilesSchema() to add the phone column
// 3. Delete this file after use 