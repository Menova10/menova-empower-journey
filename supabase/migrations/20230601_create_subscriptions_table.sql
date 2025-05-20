-- Create subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Make sure each user only has one subscription
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Allow authenticated users to see their own subscription
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to update their own subscription
CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own subscription
CREATE POLICY "Users can insert their own subscriptions" 
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own subscription
CREATE POLICY "Users can delete their own subscriptions" 
  ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add phone column to profiles table if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscriptions table
CREATE TRIGGER update_subscriptions_timestamp
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 