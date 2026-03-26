import { useState, useEffect } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  personCircleOutline,
  checkmarkOutline,
  lockClosedOutline,
  mailOutline,
  keyOutline,
  shieldCheckmarkOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateUser, openAuthModal } = useAuth();

  /* ── Form state — initialised from current user ── */
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* Notification preferences (dummy toggles, in-memory only) */
  const [notifGoals, setNotifGoals] = useState(true);
  const [notifMatchStart, setNotifMatchStart] = useState(true);
  const [notifHalfTime, setNotifHalfTime] = useState(false);
  const [notifFullTime, setNotifFullTime] = useState(true);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Auth guard ── */
  if (!isAuthenticated || !user) {
    return (
      <div className="profile-page">
        <div className="profile-page-header">
          <h1 className="profile-title">Profile</h1>
          <p className="profile-subtitle">Manage your account settings</p>
        </div>
        <div className="profile-auth-guard">
          <div className="profile-guard-icon-wrapper">
            <IonIcon icon={lockClosedOutline} className="profile-guard-icon" />
          </div>
          <p className="profile-guard-title">Sign in required</p>
          <p className="profile-guard-subtitle">Please sign in to view your profile and manage settings</p>
          <div className="profile-guard-actions">
            <button className="profile-guard-btn-primary" onClick={() => openAuthModal('signin')}>
              Sign In
            </button>
            <button className="profile-guard-btn-secondary" onClick={() => openAuthModal('signup')}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setError(null);
    setSaving(true);
    
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      setSaving(false);
      return;
    }

    // If password fields are filled, validate they match
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setSaving(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setSaving(false);
        return;
      }
    }

    // Simulate async save
    await new Promise(resolve => setTimeout(resolve, 800));

    updateUser({
      name: name.trim(),
      email: email.trim(),
      ...(password ? { password } : {}),
    });

    setPassword('');
    setConfirmPassword('');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="profile-page">
      {/* Page heading */}
      <div className="profile-page-header">
        <h1 className="profile-title">Profile</h1>
        <p className="profile-subtitle">Manage your account settings and preferences</p>
      </div>

      {/* User avatar card */}
      <div className="profile-avatar-card">
        <div className="profile-avatar-icon-wrapper">
          <IonIcon icon={personCircleOutline} className="profile-avatar-icon" />
        </div>
        <div className="profile-avatar-info">
          <span className="profile-avatar-name">{user.name}</span>
          <span className="profile-avatar-email">{user.email}</span>
        </div>
      </div>

      {/* Account Settings Section */}
      <div className="profile-section">
        <h2 className="profile-section-title">
          <IonIcon icon={shieldCheckmarkOutline} />
          Account Settings
        </h2>

        {/* Personal info card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <IonIcon icon={personCircleOutline} className="profile-card-icon" />
            <h3 className="profile-card-title">Personal Information</h3>
          </div>

          <label className="profile-label">
            Full Name
            <input
              type="text"
              className="profile-input"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Enter your full name"
            />
          </label>

          <label className="profile-label">
            Email Address
            <div className="profile-input-with-icon">
              <IonIcon icon={mailOutline} className="profile-input-icon" />
              <input
                type="email"
                className="profile-input with-icon"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="your.email@example.com"
              />
            </div>
          </label>
        </div>

        {/* Change password card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <IonIcon icon={keyOutline} className="profile-card-icon" />
            <h3 className="profile-card-title">Change Password</h3>
          </div>

          <label className="profile-label">
            New Password
            <div className="profile-input-with-icon">
              <IonIcon icon={lockClosedOutline} className="profile-input-icon" />
              <input
                type="password"
                className="profile-input with-icon"
                placeholder="Leave blank to keep current"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
              />
            </div>
          </label>

          <label className="profile-label">
            Confirm Password
            <div className="profile-input-with-icon">
              <IonIcon icon={lockClosedOutline} className="profile-input-icon" />
              <input
                type="password"
                className="profile-input with-icon"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Notification preferences Section */}
      <div className="profile-section">
        <h2 className="profile-section-title">
          <IonIcon icon={notificationsOutline} />
          Notification Preferences
        </h2>

        <div className="profile-card">
          <p className="profile-card-description">
            Choose what notifications you want to receive for your favourite teams
          </p>

          <div className="profile-toggle-row">
            <div className="profile-toggle-info">
              <span className="profile-toggle-label">Goal Alerts</span>
              <span className="profile-toggle-desc">Get notified when a goal is scored</span>
            </div>
            <button
              className={`profile-toggle ${notifGoals ? 'on' : ''}`}
              onClick={() => setNotifGoals((v) => !v)}
            >
              <span className="profile-toggle-knob" />
            </button>
          </div>

          <div className="profile-toggle-row">
            <div className="profile-toggle-info">
              <span className="profile-toggle-label">Match Start</span>
              <span className="profile-toggle-desc">Notified when a match kicks off</span>
            </div>
            <button
              className={`profile-toggle ${notifMatchStart ? 'on' : ''}`}
              onClick={() => setNotifMatchStart((v) => !v)}
            >
              <span className="profile-toggle-knob" />
            </button>
          </div>

          <div className="profile-toggle-row">
            <div className="profile-toggle-info">
              <span className="profile-toggle-label">Half Time</span>
              <span className="profile-toggle-desc">Half time score updates</span>
            </div>
            <button
              className={`profile-toggle ${notifHalfTime ? 'on' : ''}`}
              onClick={() => setNotifHalfTime((v) => !v)}
            >
              <span className="profile-toggle-knob" />
            </button>
          </div>

          <div className="profile-toggle-row">
            <div className="profile-toggle-info">
              <span className="profile-toggle-label">Full Time</span>
              <span className="profile-toggle-desc">Final score notifications</span>
            </div>
            <button
              className={`profile-toggle ${notifFullTime ? 'on' : ''}`}
              onClick={() => setNotifFullTime((v) => !v)}
            >
              <span className="profile-toggle-knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Error / success + save button */}
      {error && (
        <div className="profile-error">
          <IonIcon icon={lockClosedOutline} />
          {error}
        </div>
      )}

      <button 
        className="profile-save-btn" 
        onClick={handleSaveProfile}
        disabled={saving}
      >
        {saving ? (
          <>
            <IonSpinner name="crescent" className="profile-save-spinner" />
            Saving...
          </>
        ) : saved ? (
          <>
            <IonIcon icon={checkmarkOutline} />
            Saved Successfully
          </>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  );
};

export default ProfilePage;
