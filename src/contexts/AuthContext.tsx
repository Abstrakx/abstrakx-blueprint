import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { saveToken, getToken, clearAllTokens } from '../lib/token-store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  githubToken: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        // If provider token is in the session, save it
        if (data.session.provider_token) {
          setGithubToken(data.session.provider_token);
          await saveToken('github_token', data.session.provider_token);
        } else {
          // Try to recover it from the secure token store
          const storedToken = await getToken('github_token');
          if (storedToken) {
            setGithubToken(storedToken);
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setGithubToken(null);
      }
    } catch (err) {
      console.error('Error getting session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change event:', event);
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        
        if (newSession.provider_token) {
          setGithubToken(newSession.provider_token);
          await saveToken('github_token', newSession.provider_token);
        } else if (!githubToken) {
          const storedToken = await getToken('github_token');
          if (storedToken) {
            setGithubToken(storedToken);
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setGithubToken(null);
        await clearAllTokens();
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      await clearAllTokens();
      setSession(null);
      setUser(null);
      setGithubToken(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        githubToken,
        isLoading,
        signOut: handleSignOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
