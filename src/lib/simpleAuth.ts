'use client';

export interface SimpleUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthError {
  code: string;
  message: string;
}

const STORAGE_KEY = 'joinchat_user';
const USERS_KEY = 'joinchat_users';

// Clear all previous data
if (typeof window !== 'undefined') {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem('joinchat_user');
  localStorage.removeItem('joinchat_users');
}

export function createUser(email: string, password: string, displayName: string): Promise<{ user: SimpleUser }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!email || !password || !displayName) {
        reject(new Error('All fields are required'));
        return;
      }

      // Check if user already exists
      const existingUsers = getStoredUsers();
      if (existingUsers.find(u => u.email === email)) {
        reject(new Error('Email already exists'));
        return;
      }

      // Create new user
      const user: SimpleUser = {
        uid: Date.now().toString(),
        email,
        displayName,
      };

      // Store user
      existingUsers.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(existingUsers));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      resolve({ user });
    }, 300);
  });
}

export function signInUser(email: string, password: string): Promise<{ user: SimpleUser }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!email || !password) {
        reject(new Error('Email and password are required'));
        return;
      }

      const existingUsers = getStoredUsers();
      const user = existingUsers.find(u => u.email === email);
      
      if (!user) {
        reject(new Error('User not found'));
        return;
      }

      // Store current user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      resolve({ user });
    }, 300);
  });
}

export function signOutUser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem(STORAGE_KEY);
      resolve();
    }, 100);
  });
}

export function getCurrentUser(): SimpleUser | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredUsers(): SimpleUser[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}