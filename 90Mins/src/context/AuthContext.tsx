import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../data/types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

/* ── Context shape ── */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;   // returns error msg or null
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateUser: (updates: { name?: string; email?: string; password?: string; avatarIcon?: string; avatarColor?: string }) => Promise<string | null>;
  showAuthModal: boolean;
  openAuthModal: (view?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  authModalView: 'signin' | 'signup';
  setAuthModalView: (view: 'signin' | 'signup') => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapSupabaseUser = (authUser: SupabaseUser): User => {
  const fullName = authUser.user_metadata?.name;
  const avatarIcon = authUser.user_metadata?.avatarIcon;
  const avatarColor = authUser.user_metadata?.avatarColor;
  const derivedName = typeof fullName === 'string' && fullName.trim().length > 0
    ? fullName
    : authUser.email?.split('@')[0] || 'User';

  return {
    id: authUser.id,
    name: derivedName,
    email: authUser.email || '',
    avatarIcon: typeof avatarIcon === 'string' && avatarIcon.trim().length > 0 ? avatarIcon : 'personCircleOutline',
    avatarColor: typeof avatarColor === 'string' && avatarColor.trim().length > 0 ? avatarColor : '#00B8DB',
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    let mounted = true;

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(data.session?.user ? mapSupabaseUser(data.session.user) : null);
      setIsAuthLoading(false);
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = user !== null;

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!isSupabaseConfigured) {
      return 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.';
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (!data.user) return 'Unable to sign in right now. Please try again.';

    setUser(mapSupabaseUser(data.user));
    setShowAuthModal(false);
    return null;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<string | null> => {
    if (!isSupabaseConfigured) {
      return 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.';
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) return error.message;

    if (data.user && data.session) {
      setUser(mapSupabaseUser(data.user));
      setShowAuthModal(false);
      return null;
    }

    return 'Account created. Please check your email to confirm your account, then sign in.';
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updates: { name?: string; email?: string; password?: string; avatarIcon?: string; avatarColor?: string }) => {
    if (!isSupabaseConfigured) {
      return 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.';
    }

    const payload: {
      email?: string;
      password?: string;
      data?: Record<string, string>;
    } = {};

    if (updates.email) payload.email = updates.email;
    if (updates.password) payload.password = updates.password;

    const metadataUpdates: Record<string, string> = {};
    if (updates.name) metadataUpdates.name = updates.name;
    if (updates.avatarIcon) metadataUpdates.avatarIcon = updates.avatarIcon;
    if (updates.avatarColor) metadataUpdates.avatarColor = updates.avatarColor;
    if (Object.keys(metadataUpdates).length > 0) payload.data = metadataUpdates;

    const { data, error } = await supabase.auth.updateUser(payload);
    if (error) return error.message;

    if (data.user) {
      setUser(mapSupabaseUser(data.user));
    }

    return null;
  }, []);

  const openAuthModal = useCallback((view: 'signin' | 'signup' = 'signin') => {
    setAuthModalView(view);
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthLoading,
        signIn,
        signUp,
        signOut,
        updateUser,
        showAuthModal,
        openAuthModal,
        closeAuthModal,
        authModalView,
        setAuthModalView,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ── Hook ── */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
