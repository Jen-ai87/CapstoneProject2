import { useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  personCircleOutline,
  checkmarkOutline,
  lockClosedOutline,
  mailOutline,
  keyOutline,
  shieldCheckmarkOutline,
  notificationsOutline,
  happyOutline,
  footballOutline,
  flameOutline,
  flashOutline,
  trophyOutline,
  starOutline,
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import {
  defaultNotificationPreferences,
  fetchUserNotificationPreferences,
  saveUserNotificationPreferences,
} from '../services/userNotificationPreferences';
import './ProfilePage.css';

const AVATAR_ICON_CHOICES = [
  { key: 'personCircleOutline', icon: personCircleOutline, label: 'Classic' },
  { key: 'happyOutline', icon: happyOutline, label: 'Smile' },
  { key: 'footballOutline', icon: footballOutline, label: 'Football' },
  { key: 'flameOutline', icon: flameOutline, label: 'Flame' },
  { key: 'flashOutline', icon: flashOutline, label: 'Bolt' },
  { key: 'trophyOutline', icon: trophyOutline, label: 'Trophy' },
  { key: 'starOutline', icon: starOutline, label: 'Star' },
] as const;

const AVATAR_COLOR_CHOICES = ['#00B8DB', '#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6'] as const;

const AVATAR_ICON_BY_KEY: Record<string, string> = Object.fromEntries(
  AVATAR_ICON_CHOICES.map((choice) => [choice.key, choice.icon])
);

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateUser, openAuthModal } = useAuth();

  /* ── Form state — initialised from current user ── */
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarIcon, setAvatarIcon] = useState(user?.avatarIcon ?? 'personCircleOutline');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? '#00B8DB');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notifGoals, setNotifGoals] = useState(defaultNotificationPreferences.notifGoals);
  const [notifMatchStart, setNotifMatchStart] = useState(defaultNotificationPreferences.notifMatchStart);
  const [notifHalfTime, setNotifHalfTime] = useState(defaultNotificationPreferences.notifHalfTime);
  const [notifFullTime, setNotifFullTime] = useState(defaultNotificationPreferences.notifFullTime);
  const [initialNotifPrefs, setInitialNotifPrefs] = useState(defaultNotificationPreferences);
  const [notifSaving, setNotifSaving] = useState(false);
  const notifSaveRequestRef = useRef(0);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarSaveRequestRef = useRef(0);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setAvatarIcon(user.avatarIcon ?? 'personCircleOutline');
    setAvatarColor(user.avatarColor ?? '#00B8DB');
  }, [user?.name, user?.email, user?.avatarIcon, user?.avatarColor]);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      if (!isAuthenticated || !user?.id) return;

      const prefs = await fetchUserNotificationPreferences(user.id);
      if (cancelled) return;

      setNotifGoals(prefs.notifGoals);
      setNotifMatchStart(prefs.notifMatchStart);
      setNotifHalfTime(prefs.notifHalfTime);
      setNotifFullTime(prefs.notifFullTime);
      setInitialNotifPrefs(prefs);
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const hasProfileChanges =
    name.trim() !== (user?.name ?? '').trim() ||
    email.trim() !== (user?.email ?? '').trim();

  const hasPasswordChanges = Boolean(password || confirmPassword);

  const hasNotificationChanges =
    notifGoals !== initialNotifPrefs.notifGoals ||
    notifMatchStart !== initialNotifPrefs.notifMatchStart ||
    notifHalfTime !== initialNotifPrefs.notifHalfTime ||
    notifFullTime !== initialNotifPrefs.notifFullTime;

  const hasManualChanges = hasProfileChanges || hasPasswordChanges;
  const hasPendingChanges = hasProfileChanges || hasPasswordChanges || hasNotificationChanges;
  const shouldShowSaveButton =
    isEditingProfile || isChangingPassword || hasManualChanges || saving || saved;

  const handleCancelProfileEdit = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setAvatarIcon(user?.avatarIcon ?? 'personCircleOutline');
    setAvatarColor(user?.avatarColor ?? '#00B8DB');
    setIsEditingProfile(false);
    setError(null);
  };

  const openAvatarPicker = () => {
    setIsAvatarPickerOpen(true);
  };

  const autoSaveAvatarSelection = async (nextIcon: string, nextColor: string) => {
    if (!user?.id) return;

    const requestId = ++avatarSaveRequestRef.current;
    setAvatarSaving(true);

    const updateError = await updateUser({
      avatarIcon: nextIcon,
      avatarColor: nextColor,
    });

    if (requestId !== avatarSaveRequestRef.current) {
      return;
    }

    if (updateError) {
      setError(`Avatar failed to sync: ${updateError}`);
      setAvatarSaving(false);
      return;
    }

    setAvatarSaving(false);
  };

  const handleSelectAvatarIcon = (nextIcon: string) => {
    if (nextIcon === avatarIcon) return;
    setError(null);
    setAvatarIcon(nextIcon);
    void autoSaveAvatarSelection(nextIcon, avatarColor);
  };

  const handleSelectAvatarColor = (nextColor: string) => {
    if (nextColor === avatarColor) return;
    setError(null);
    setAvatarColor(nextColor);
    void autoSaveAvatarSelection(avatarIcon, nextColor);
  };

  const handleCancelPasswordEdit = () => {
    setPassword('');
    setConfirmPassword('');
    setIsChangingPassword(false);
    setError(null);
  };

  const autoSaveNotificationPreferences = async (nextPrefs: typeof initialNotifPrefs) => {
    if (!user?.id) return;

    const requestId = ++notifSaveRequestRef.current;
    setNotifSaving(true);

    const result = await saveUserNotificationPreferences(user.id, nextPrefs);

    if (requestId !== notifSaveRequestRef.current) {
      return;
    }

    if (!result.ok && result.error && !result.error.includes('Saved locally only')) {
      setError(`Notification preferences failed to sync: ${result.error}`);
      setNotifSaving(false);
      return;
    }

    setInitialNotifPrefs(nextPrefs);
    setNotifSaving(false);
  };

  const handleNotificationToggle = (key: 'notifGoals' | 'notifMatchStart' | 'notifHalfTime' | 'notifFullTime') => {
    const nextPrefs = {
      notifGoals,
      notifMatchStart,
      notifHalfTime,
      notifFullTime,
      [key]: !({ notifGoals, notifMatchStart, notifHalfTime, notifFullTime }[key]),
    };

    setNotifGoals(nextPrefs.notifGoals);
    setNotifMatchStart(nextPrefs.notifMatchStart);
    setNotifHalfTime(nextPrefs.notifHalfTime);
    setNotifFullTime(nextPrefs.notifFullTime);
    void autoSaveNotificationPreferences(nextPrefs);
  };

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
    if (!hasManualChanges) return;

    setSaving(true);

    if ((isEditingProfile || hasProfileChanges) && (!name.trim() || !email.trim())) {
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

    const updatePayload: { name?: string; email?: string; password?: string; avatarIcon?: string; avatarColor?: string } = {};

    if (isEditingProfile || hasProfileChanges) {
      updatePayload.name = name.trim();
      updatePayload.email = email.trim();
    }

    if (password) {
      updatePayload.password = password;
    }

    if (Object.keys(updatePayload).length > 0) {
      const updateError = await updateUser(updatePayload);
      if (updateError) {
        setError(updateError);
        setSaving(false);
        return;
      }
    }

    const preferenceSaveResult = await saveUserNotificationPreferences(user.id, {
      notifGoals,
      notifMatchStart,
      notifHalfTime,
      notifFullTime,
    });

    if (!preferenceSaveResult.ok && preferenceSaveResult.error && !preferenceSaveResult.error.includes('Saved locally only')) {
      setError(`Profile updated, but notification preferences failed to sync: ${preferenceSaveResult.error}`);
      setSaving(false);
      return;
    }

    setInitialNotifPrefs({
      notifGoals,
      notifMatchStart,
      notifHalfTime,
      notifFullTime,
    });

    setPassword('');
    setConfirmPassword('');
    setIsEditingProfile(false);
    setIsChangingPassword(false);
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
        <div className="profile-avatar-stack">
          <div className="profile-avatar-icon-wrapper" style={{ borderColor: `${avatarColor}55`, background: `${avatarColor}22` }}>
            <IonIcon icon={AVATAR_ICON_BY_KEY[avatarIcon] || personCircleOutline} className="profile-avatar-icon" style={{ color: avatarColor }} />
          </div>
          <button type="button" className="profile-avatar-edit-trigger" onClick={openAvatarPicker}>
            Edit
          </button>
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
            {!isEditingProfile ? (
              <button className="profile-inline-action" onClick={() => setIsEditingProfile(true)}>
                Edit
              </button>
            ) : (
              <button className="profile-inline-action ghost" onClick={handleCancelProfileEdit}>
                Cancel
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="profile-readonly-group">
              <div className="profile-readonly-row">
                <span className="profile-readonly-label">Full Name</span>
                <span className="profile-readonly-value">{user.name}</span>
              </div>
              <div className="profile-readonly-row">
                <span className="profile-readonly-label">Email Address</span>
                <span className="profile-readonly-value">{user.email}</span>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Change password card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <IonIcon icon={keyOutline} className="profile-card-icon" />
            <h3 className="profile-card-title">Change Password</h3>
            {!isChangingPassword ? (
              <button className="profile-inline-action" onClick={() => setIsChangingPassword(true)}>
                Change
              </button>
            ) : (
              <button className="profile-inline-action ghost" onClick={handleCancelPasswordEdit}>
                Cancel
              </button>
            )}
          </div>

          {!isChangingPassword ? (
            <div className="profile-readonly-group">
              <div className="profile-readonly-row">
                <span className="profile-readonly-label">Password</span>
                <span className="profile-readonly-value">••••••••</span>
              </div>
            </div>
          ) : (
            <>
              <label className="profile-label">
                New Password
                <div className="profile-input-with-icon">
                  <IonIcon icon={lockClosedOutline} className="profile-input-icon" />
                  <input
                    type="password"
                    className="profile-input with-icon"
                    placeholder="At least 6 characters"
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
            </>
          )}
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
          {notifSaving && <p className="profile-sync-note">Saving preference changes...</p>}

          <div className="profile-toggle-row">
            <div className="profile-toggle-info">
              <span className="profile-toggle-label">Goal Alerts</span>
              <span className="profile-toggle-desc">Get notified when a goal is scored</span>
            </div>
            <button
              className={`profile-toggle ${notifGoals ? 'on' : ''}`}
              onClick={() => handleNotificationToggle('notifGoals')}
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
              onClick={() => handleNotificationToggle('notifMatchStart')}
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
              onClick={() => handleNotificationToggle('notifHalfTime')}
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
              onClick={() => handleNotificationToggle('notifFullTime')}
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

      {shouldShowSaveButton && (
        <button
          className="profile-save-btn"
          onClick={handleSaveProfile}
          disabled={saving || !hasPendingChanges}
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
      )}

      {isAvatarPickerOpen && (
        <div className="profile-avatar-picker-overlay" role="dialog" aria-modal="true" aria-label="Choose profile icon and color">
          <div className="profile-avatar-picker-modal">
            <h3 className="profile-avatar-picker-title">Choose Your Profile Icon</h3>
            <p className="profile-avatar-picker-subtitle">Pick an icon and color that matches your style.</p>
            {avatarSaving && <p className="profile-sync-note">Saving avatar...</p>}

            <div className="profile-avatar-preview" style={{ borderColor: `${avatarColor}55`, background: `${avatarColor}22` }}>
              <IonIcon
                icon={AVATAR_ICON_BY_KEY[avatarIcon] || personCircleOutline}
                className="profile-avatar-icon"
                style={{ color: avatarColor }}
              />
            </div>

            <span className="profile-avatar-editor-label">Profile Icon</span>
            <div className="profile-avatar-icon-grid">
              {AVATAR_ICON_CHOICES.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  className={`profile-avatar-option ${avatarIcon === choice.key ? 'selected' : ''}`}
                  onClick={() => handleSelectAvatarIcon(choice.key)}
                  aria-label={`Use ${choice.label} icon`}
                  title={choice.label}
                  style={{ color: avatarColor }}
                >
                  <IonIcon icon={choice.icon} />
                </button>
              ))}
            </div>

            <span className="profile-avatar-editor-label">Icon Color</span>
            <div className="profile-avatar-color-grid">
              {AVATAR_COLOR_CHOICES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`profile-avatar-color ${avatarColor === color ? 'selected' : ''}`}
                  onClick={() => handleSelectAvatarColor(color)}
                  aria-label={`Use avatar color ${color}`}
                  title={color}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <button type="button" className="profile-avatar-apply-btn" onClick={() => setIsAvatarPickerOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
