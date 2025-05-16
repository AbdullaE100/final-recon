-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create streaks table
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  streak INTEGER DEFAULT 0,
  last_check_in TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS streaks_user_id_idx ON streaks(user_id);

-- Create a Row Level Security policy to only allow users to view their own data
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Policy for selecting own data
CREATE POLICY select_own_streaks ON streaks
  FOR SELECT USING (
    auth.uid()::text = user_id
  );

-- Policy for inserting own data
CREATE POLICY insert_own_streaks ON streaks
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id
  );

-- Policy for updating own data
CREATE POLICY update_own_streaks ON streaks
  FOR UPDATE USING (
    auth.uid()::text = user_id
  );

-- Allow anonymous access for the demo app (we're using a default user ID)
CREATE POLICY anon_access_streaks ON streaks
  FOR ALL USING (true); 