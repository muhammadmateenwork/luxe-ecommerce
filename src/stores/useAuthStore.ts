import { create } from 'zustand';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (token: string, password: string) => Promise<void>;
  clearError: () => void;
}

// Helper: get token from localStorage
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('luxe_token');
}

// Helper: save token to localStorage
function saveToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('luxe_token', token);
}

// Helper: remove token from localStorage
function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('luxe_token');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Persist token to localStorage
      saveToken(data.data.token);

      set({
        user: data.data.user,
        token: data.data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      // Persist token to localStorage
      saveToken(data.data.token);

      set({
        user: data.data.user,
        token: data.data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      removeToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      removeToken();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: message });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = getStoredToken();
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success && data.data) {
        set({
          user: data.data,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        removeToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      removeToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateProfile: async (data: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      void data;
      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      set({ isLoading: false });
      return data.resetToken || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  resetPassword: async (token: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Password reset failed');
      }

      set({ isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
