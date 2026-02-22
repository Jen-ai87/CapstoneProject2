import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    closeAuthModal,
    authModalView,
    setAuthModalView,
    signIn,
    signUp,
  } = useAuth();

  /* ── Form state ── */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
  };

  const switchView = (view: 'signin' | 'signup') => {
    resetForm();
    setAuthModalView(view);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    const err = signIn(email, password);
    if (err) setError(err);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    const err = signUp(name, email, password);
    if (err) setError(err);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeAuthModal();
  };

  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal">
        {/* Close button */}
        <button className="auth-close-btn" onClick={closeAuthModal}>
          <IonIcon icon={closeOutline} />
        </button>

        {/* ── Sign In view ── */}
        {authModalView === 'signin' && (
          <>
            <h2 className="auth-title">Sign In</h2>

            <form onSubmit={handleSignIn} className="auth-form">
              <label className="auth-label">
                Email
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  autoFocus
                />
              </label>

              <label className="auth-label">
                Password
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-submit-btn">Sign In</button>
            </form>

            <p className="auth-switch">
              Don't have an account?{' '}
              <button className="auth-switch-btn" onClick={() => switchView('signup')}>
                Sign up
              </button>
            </p>
          </>
        )}

        {/* ── Create Account view ── */}
        {authModalView === 'signup' && (
          <>
            <h2 className="auth-title">Create Account</h2>

            <form onSubmit={handleSignUp} className="auth-form">
              <label className="auth-label">
                Name
                <input
                  type="text"
                  className="auth-input"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  autoFocus
                />
              </label>

              <label className="auth-label">
                Email
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                />
              </label>

              <label className="auth-label">
                Password
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-submit-btn">Create Account</button>
            </form>

            <p className="auth-switch">
              Already have an account?{' '}
              <button className="auth-switch-btn" onClick={() => switchView('signin')}>
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
