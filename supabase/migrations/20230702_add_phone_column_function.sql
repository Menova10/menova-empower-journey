-- Create a stored procedure to add the phone column
-- This makes it accessible via the supabase.rpc() method
CREATE OR REPLACE FUNCTION add_phone_column()
RETURNS void AS $$
BEGIN
  -- Add phone column to profiles table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN phone TEXT;
    
    -- Add comment to the column for documentation
    COMMENT ON COLUMN public.profiles.phone IS 'User phone number for WhatsApp notifications, in international format (e.g., +1123456789)';
    
    -- Create index for faster phone lookups
    CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 