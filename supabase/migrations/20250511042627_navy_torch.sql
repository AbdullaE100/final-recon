/*
  # Initial Schema for ClearMind App

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `created_at` (timestamp)
      - `streak` (integer)
      - `last_check_in` (timestamp)
      - `level` (integer)
      - `points` (integer)
      
    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp)
      - `tags` (text array)
      
    - `challenges`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `is_daily` (boolean)
      - `points` (integer)
      - `created_at` (timestamp)
      
    - `user_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `challenge_id` (uuid, references challenges)
      - `progress` (integer)
      - `started_at` (timestamp)
      - `completed_at` (timestamp)
      - `status` (text)
      
    - `achievements`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `unlock_criteria` (text)
      - `created_at` (timestamp)
      
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `achievement_id` (uuid, references achievements)
      - `unlocked_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Prevent unauthorized access to other users' data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  streak integer DEFAULT 0,
  last_check_in timestamptz,
  level integer DEFAULT 1,
  points integer DEFAULT 0
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  tags text[]
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own journal entries"
  ON journal_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  is_daily boolean DEFAULT false,
  points integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (true);

-- Create user_challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  challenge_id uuid REFERENCES challenges NOT NULL,
  progress integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'active',
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own challenges"
  ON user_challenges FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  unlock_criteria text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  achievement_id uuid REFERENCES achievements NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert initial challenges
INSERT INTO challenges (title, description, is_daily, points) VALUES
  ('Stay Clean Today', 'Complete a full day without relapsing.', true, 50),
  ('Morning Meditation', 'Start your day with a 5-minute meditation session.', true, 30),
  ('Journal Streak', 'Write in your journal for 3 consecutive days.', false, 100),
  ('Habit Replacement', 'Replace urges with a healthy activity 5 times this week.', false, 150),
  ('Weekly Exercise', 'Exercise for at least 30 minutes, 3 times this week.', false, 120);

-- Insert initial achievements
INSERT INTO achievements (name, description, category, unlock_criteria) VALUES
  ('1 Week Milestone', 'Maintained a clean streak for 7 days', 'streak', 'Maintain a 7-day streak'),
  ('1 Month Strong', 'Maintained a clean streak for 30 days', 'streak', 'Maintain a 30-day streak'),
  ('90 Day Champion', 'Maintained a clean streak for 90 days', 'streak', 'Maintain a 90-day streak'),
  ('Thoughtful Writer', 'Completed the Journal Streak challenge', 'journal', 'Complete the Journal Streak challenge'),
  ('Consistent Journaler', 'Created 10 journal entries', 'journal', 'Create 10 journal entries'),
  ('Habit Master', 'Completed the Habit Replacement challenge', 'challenge', 'Complete the Habit Replacement challenge'),
  ('Challenge Seeker', 'Completed 5 challenges', 'challenge', 'Complete 5 challenges');