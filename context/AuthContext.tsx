import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signInWithGoogle: () => Promise<{ error: any | null, session?: Session | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: any) => Promise<{ error: any | null }>;
}

// Create the context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up auth state listener
  useEffect(() => {
    // Get the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes to auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      // Configure the redirect URI
      const redirectUri = makeRedirectUri({
        scheme: 'nofapapp',
        path: 'auth/callback',
      });

      
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        return { error };
      }
      
      if (data?.url) {
        // Open the Supabase auth URL in a browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );
        
        if (result.type === 'success') {
          // After successful authentication, get the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            return { error: sessionError };
          }
          
          return { session, error: null };
        } else {
          // Even if browser redirect fails, user might have authenticated successfully
          // Wait a moment for Supabase to process the auth
          return await new Promise<{ error: any | null, session?: Session | null }>((resolve) => {
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                resolve({ session: retrySession, error: null });
              } else if (result.type !== 'cancel') {
                resolve({ error: new Error('Failed to authenticate with Google') });
              } else {
                resolve({ error: new Error('Authentication canceled') });
              }
            }, 1000);
          });
        }
      } else {
        return { error: new Error('No authentication URL provided') };
      }
    } catch (error) {
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Update user
  const updateUser = async (updates: any) => {
    try {
      const { error } = await supabase.auth.updateUser(updates);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Context value
  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateUser,
  };

  // Provide auth context
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 