-- Create symptom_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS symptom_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  symptom TEXT NOT NULL,
  severity INTEGER,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add example symptoms for testing (optional)
INSERT INTO symptom_tracking (user_id, symptom, severity, notes)
VALUES 
  ('YOUR_USER_ID', 'Hot Flashes', 3, 'Occurs mainly in the evening'),
  ('YOUR_USER_ID', 'Sleep Disturbance', 4, 'Waking up 2-3 times per night'),
  ('YOUR_USER_ID', 'Mood Changes', 2, 'Feeling more irritable than usual'),
  ('YOUR_USER_ID', 'Joint Pain', 3, 'Mainly in knees and fingers');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_symptom_tracking_user_id ON symptom_tracking(user_id); 