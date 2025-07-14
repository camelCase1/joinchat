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
  guestLogin: () => Promise<void>;
  isGuest?: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = 'joinchat_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const signupMutation = api.post.signup.useMutation();
  const loginMutation = api.post.login.useMutation();

  // Get stored user ID for conditional query
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const userId = localStorage.getItem(STORAGE_KEY);
    const guestFlag = localStorage.getItem('joinchat_guest');
    setStoredUserId(userId);
    setIsGuest(guestFlag === '1');
  }, []);

  // Use tRPC query to get current user if we have a stored ID
  const { data: currentUserData, error: currentUserError, isLoading: isCheckingUser } = api.post.getCurrentUser.useQuery(
    { userId: storedUserId! },
    { 
      enabled: !!storedUserId,
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  // Update user state based on query result
  useEffect(() => {
    if (storedUserId && isCheckingUser) {
      return; // Still loading
    }
    
    if (currentUserError || (storedUserId && !currentUserData)) {
      // User not found or error occurred, clear storage
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setIsGuest(false);
      // Don't call setStoredUserId(null) here to prevent infinite loop
    } else if (currentUserData) {
      // User found, update state
      setUser(currentUserData);
      setIsGuest(false);
    }
    
    // Set loading to false only after we've checked the user
    if (!storedUserId || !isCheckingUser) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserData, currentUserError, isCheckingUser]); // Remove storedUserId to prevent loop

  async function signup(email: string, password: string, displayName: string) {
    try {
      const result = await signupMutation.mutateAsync({ email, password, displayName });
      setUser(result.user);
      setStoredUserId(result.user.uid);
      localStorage.setItem(STORAGE_KEY, result.user.uid);
    } catch (error: unknown) {
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      setUser(result.user);
      setStoredUserId(result.user.uid);
      localStorage.setItem(STORAGE_KEY, result.user.uid);
    } catch (error: unknown) {
      throw error;
    }
  }

  async function guestLogin() {
    const guestId = 'guest-' + Math.random().toString(36).substring(2, 10);
    const guestUser = { uid: guestId, email: '', displayName: 'Guest' };
    setUser(guestUser);
    setIsGuest(true);
    localStorage.setItem('joinchat_guest', '1');
    localStorage.removeItem(STORAGE_KEY);
  }

  async function logout() {
    try {
      setUser(null);
      setStoredUserId(null);
      setIsGuest(false);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('joinchat_guest');
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
    guestLogin,
    isGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}