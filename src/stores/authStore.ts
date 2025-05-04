
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    loading: false
  }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));

// Initialize auth state from Supabase
export const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      useAuthStore.getState().setUser(session.user);
    } else {
      useAuthStore.getState().setUser(null);
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    useAuthStore.getState().setUser(null);
  }
};

// Set up auth state listener
export const setupAuthListener = () => {
  return supabase.auth.onAuthStateChange((_, session) => {
    useAuthStore.getState().setUser(session?.user || null);
  });
};
