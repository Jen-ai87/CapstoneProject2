import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '../data/types';
import { users, findUserByEmail } from '../data/users';

/* ── Context shape ── */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => string | null;   // returns error msg or null
  signUp: (name: string, email: string, password: string) => string | null;
  signOut: () => void;
  updateUser: (updates: Partial<Pick<User, 'name' | 'email' | 'password'>>) => void;
  showAuthModal: boolean;
  openAuthModal: (view?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  authModalView: 'signin' | 'signup';
  setAuthModalView: (view: 'signin' | 'signup') => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ── Provider ── */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');

  const isAuthenticated = user !== null;

  const signIn = useCallback((email: string, password: string): string | null => {
    const found = findUserByEmail(email);
    if (!found) return 'No account found with this email';
    if (found.password !== password) return 'Incorrect password';
    setUser(found);
    setShowAuthModal(false);
    return null;
  }, []);

  const signUp = useCallback((name: string, email: string, password: string): string | null => {
    if (findUserByEmail(email)) return 'An account with this email already exists';
    const newUser: User = {
      id: `user-${users.length + 1}`,
      name,
      email,
      password,
    };
    users.push(newUser); // add to in-memory array
    setUser(newUser);
    setShowAuthModal(false);
    return null;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<Pick<User, 'name' | 'email' | 'password'>>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Also update the in-memory users array so sign-in stays consistent
      const idx = users.findIndex((u) => u.id === prev.id);
      if (idx !== -1) users[idx] = updated;
      return updated;
    });
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
