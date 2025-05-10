
-- Create daily_quotes table for storing cached quotes
CREATE TABLE IF NOT EXISTS public.daily_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to quotes
CREATE POLICY "Allow public read access to daily quotes"
    ON public.daily_quotes
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow only service role to insert or update quotes
CREATE POLICY "Allow service role to manage quotes"
    ON public.daily_quotes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
