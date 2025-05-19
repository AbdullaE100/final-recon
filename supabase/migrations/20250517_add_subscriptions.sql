-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Create function to check if a user has an active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('active', 'trialing')
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for the user_subscriptions table
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read only their own subscription data
CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy to only allow the service role to insert/update/delete
CREATE POLICY "Only service role can insert"
  ON user_subscriptions
  FOR INSERT
  TO service_role
  USING (true);

CREATE POLICY "Only service role can update"
  ON user_subscriptions
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Only service role can delete"
  ON user_subscriptions
  FOR DELETE
  TO service_role
  USING (true);

-- Update the user profiles view to include subscription status if needed
-- Modify as needed to match your existing schema
CREATE OR REPLACE VIEW user_profiles AS
SELECT
  u.id,
  u.email,
  -- Add any other user fields you need
  COALESCE(s.status, 'none') as subscription_status,
  CASE 
    WHEN s.status IN ('active', 'trialing') AND s.current_period_end > NOW() THEN true
    ELSE false
  END as is_premium
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id AND (s.status IN ('active', 'trialing') AND s.current_period_end > NOW()); 