const useAuth = () => ({
  user: null,
  isAuthenticated: false,
  signIn: () => null,
  signUp: () => null,
  signOut: () => {},
  updateUser: () => {},
  showAuthModal: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  authModalView: 'signin' as const,
  setAuthModalView: () => {},
});

export { useAuth };
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

// TODO: GABRIEL TO WORK ON AUTHENTICATION
// CREATED TEMP CODE HERE TO MIMIC AUTH