import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from './AuthContext';

// Define subscription types
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'none';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  current_period_end: string;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  loading: boolean;
  isSubscribed: boolean;
  fetchSubscription: () => Promise<void>;
}

// Create the context
const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

// Hook for using the subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Provider component
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if the user has an active subscription
  const isSubscribed = 
    subscription?.status === 'active' || 
    subscription?.status === 'trialing';

  // Fetch subscription data from Supabase
  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching subscription:', error);
      }
      
      // Check if data exists and has at least one entry
      setSubscription(data && data.length > 0 ? data[0] : null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in fetchSubscription:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription data when the user changes
  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  // Set up a real-time subscription to update when the subscription data changes
  useEffect(() => {
    if (!user) return;
    
    const subscriptionChannel = supabase
      .channel(`subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();
      
    return () => {
      subscriptionChannel.unsubscribe();
    };
  }, [user]);

  const value = {
    subscription,
    loading,
    isSubscribed,
    fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
} 