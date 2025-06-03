import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { checkSubscriptionStatus, SubscriptionStatus as IAPSubscriptionStatus, SubscriptionData } from '@/utils/inAppPurchase';

// Define subscription types for Apple IAP
export type SubscriptionStatus = 'active' | 'expired' | 'none';

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  transaction_id: string;
  status: SubscriptionStatus;
  expires_date: string;
  purchase_date: string;
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
  const isSubscribed = subscription?.status === 'active';

  // Fetch subscription data from Apple IAP
  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const status = await checkSubscriptionStatus();
      
      if (status.isPremium && status.subscription) {
        // Convert IAP subscription data to our format
        const subscriptionData: Subscription = {
          id: status.subscription.transactionId,
          user_id: user.id,
          product_id: status.subscription.productId,
          transaction_id: status.subscription.transactionId,
          status: 'active',
          expires_date: status.subscription.expiresDate,
          purchase_date: status.subscription.purchaseDate,
        };
        setSubscription(subscriptionData);
      } else {
        setSubscription(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in fetchSubscription:', errorMessage);
      setSubscription(null);
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

  // Periodically check subscription status (since Apple IAP doesn't have real-time updates)
  useEffect(() => {
    if (!user) return;
    
    // Check subscription status every 5 minutes
    const interval = setInterval(() => {
      fetchSubscription();
    }, 5 * 60 * 1000);
      
    return () => {
      clearInterval(interval);
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