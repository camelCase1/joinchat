'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '~/trpc/react';

export interface SimpleUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = 'joinchat_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signupMutation = api.post.signup.useMutation();
  const loginMutation = api.post.login.useMutation();

  // Check for existing user on mount
  useEffect(() => {
    async function checkUser() {
      const storedUserId = localStorage.getItem(STORAGE_KEY);
      if (storedUserId) {
        try {
          // Create a direct fetch to avoid tRPC hook issues
          const response = await fetch('/api/trpc/post.getCurrentUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              json: { userId: storedUserId },
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.result?.data) {
              setUser(data.result.data);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.error('Error checking user:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    }
    
    checkUser();
  }, []);

  async function signup(email: string, password: string, displayName: string) {
    try {
      const result = await signupMutation.mutateAsync({ email, password, displayName });
      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, result.user.uid);
    } catch (error: unknown) {
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, result.user.uid);
    } catch (error: unknown) {
      throw error;
    }
  }

  async function logout() {
    try {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error: unknown) {
      throw error;
    }
  }

  const value = {
    user,
    signup,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}