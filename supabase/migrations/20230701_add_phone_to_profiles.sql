-- Add phone column to profiles table if not exists
-- This ensures the column exists for WhatsApp notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for WhatsApp notifications, in international format (e.g., +1123456789)';

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone); 