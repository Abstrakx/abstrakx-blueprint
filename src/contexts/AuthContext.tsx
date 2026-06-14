import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { saveToken, getToken, clearAllTokens } from '../lib/token-store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  githubToken: string | null;
  activeProvider: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        const currentUser = data.session.user;
        const hasGithubIdentity = 
          currentUser?.app_metadata?.provider === 'github' ||
          currentUser?.app_metadata?.providers?.includes('github') ||
          currentUser?.identities?.some((id: any) => id.provider === 'github');

        const attemptProvider = localStorage.getItem('auth_attempt_provider');
        const isGithubLogin = 
          attemptProvider === 'github' ||
          (!attemptProvider && data.session.provider_token && (
            data.session.provider_token.startsWith('gho_') || 
            data.session.provider_token.startsWith('ghp_')
          ));

        // Determine and persist active provider
        const storedProvider = localStorage.getItem('active_auth_provider');
        const currentActive = storedProvider || attemptProvider || (isGithubLogin ? 'github' : null) || currentUser?.app_metadata?.provider || null;
        setActiveProvider(currentActive);
        if (currentActive && !storedProvider) {
          localStorage.setItem('active_auth_provider', currentActive);
        }

        // If provider token is in the session and it is a GitHub login, save it
        if (data.session.provider_token && isGithubLogin) {
          setGithubToken(data.session.provider_token);
          await saveToken('github_token', data.session.provider_token);
          localStorage.removeItem('auth_attempt_provider');
        } else if (hasGithubIdentity) {
          // Try to recover it from the secure token store
          const storedToken = await getToken('github_token');
          if (storedToken) {
            setGithubToken(storedToken);
          } else {
            setGithubToken(null);
          }
        } else {
          // Non-GitHub login and no GitHub identity: clear token
          setGithubToken(null);
        }
      } else {
        setSession(null);
        setUser(null);
        setGithubToken(null);
        setActiveProvider(null);
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
        
        const currentUser = newSession.user;
        const hasGithubIdentity = 
          currentUser?.app_metadata?.provider === 'github' ||
          currentUser?.app_metadata?.providers?.includes('github') ||
          currentUser?.identities?.some((id: any) => id.provider === 'github');

        const attemptProvider = localStorage.getItem('auth_attempt_provider');
        const isGithubLogin = 
          attemptProvider === 'github' ||
          (!attemptProvider && newSession.provider_token && (
            newSession.provider_token.startsWith('gho_') || 
            newSession.provider_token.startsWith('ghp_')
          ));

        // Determine and persist active provider
        const storedProvider = localStorage.getItem('active_auth_provider');
        const currentActive = storedProvider || attemptProvider || (isGithubLogin ? 'github' : null) || currentUser?.app_metadata?.provider || null;
        setActiveProvider(currentActive);
        if (currentActive && !storedProvider) {
          localStorage.setItem('active_auth_provider', currentActive);
        }

        if (newSession.provider_token && isGithubLogin) {
          setGithubToken(newSession.provider_token);
          await saveToken('github_token', newSession.provider_token);
          localStorage.removeItem('auth_attempt_provider');
        } else if (hasGithubIdentity) {
          const storedToken = await getToken('github_token');
          if (storedToken) {
            setGithubToken(storedToken);
          } else {
            setGithubToken(null);
          }
        } else {
          setGithubToken(null);
        }
      } else {
        setSession(null);
        setUser(null);
        setGithubToken(null);
        setActiveProvider(null);
        localStorage.removeItem('active_auth_provider');
        localStorage.removeItem('auth_attempt_provider');
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
      localStorage.removeItem('active_auth_provider');
      localStorage.removeItem('auth_attempt_provider');
      setSession(null);
      setUser(null);
      setGithubToken(null);
      setActiveProvider(null);
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
        activeProvider,
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
