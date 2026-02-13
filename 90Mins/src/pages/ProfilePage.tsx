import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import {
    personCircleOutline,
    checkmarkOutline,
    lockClosedOutline,
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
    const [notifTransfers, setNotifTransfers] = useState(false);

    const [saved, setSaved] = useState(false);
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
                    <IonIcon icon={lockClosedOutline} className="profile-guard-icon" />
                    <p className="profile-guard-title">Sign in required</p>
                    <p className="profile-guard-subtitle">Please sign in to view your profile</p>
                    <button className="profile-guard-btn" onClick={() => openAuthModal('signin')}>
                        Sign In
                    </button>
                </div>
            </div>
        );
    }

    const handleSaveProfile = () => {
        setError(null);
        if (!name.trim() || !email.trim()) {
            setError('Name and email are required');
            return;
        }

        // If password fields are filled, validate they match
        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
        }

        updateUser({
            name: name.trim(),
            email: email.trim(),
            ...(password ? { password } : {}),
        });

        setPassword('');
        setConfirmPassword('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="profile-page">
            {/* Page heading */}
            <div className="profile-page-header">
                <h1 className="profile-title">Profile</h1>
                <p className="profile-subtitle">Manage your account settings</p>
            </div>

            {/* User avatar card */}
            <div className="profile-avatar-card">
                <IonIcon icon={personCircleOutline} className="profile-avatar-icon" />
                <div className="profile-avatar-info">
                    <span className="profile-avatar-name">{user.name}</span>
                    <span className="profile-avatar-email">{user.email}</span>
                </div>
            </div>

            {/* Personal info card */}
            <div className="profile-card">
                <h3 className="profile-card-title">Personal Information</h3>

                <label className="profile-label">
                    Name
                    <input
                        type="text"
                        className="profile-input"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(null); }}
                    />
                </label>

                <label className="profile-label">
                    Email
                    <input
                        type="email"
                        className="profile-input"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    />
                </label>
            </div>

            {/* Change password card */}
            <div className="profile-card">
                <h3 className="profile-card-title">Change Password</h3>

                <label className="profile-label">
                    New Password
                    <input
                        type="password"
                        className="profile-input"
                        placeholder="Leave blank to keep current"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    />
                </label>

                <label className="profile-label">
                    Confirm Password
                    <input
                        type="password"
                        className="profile-input"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    />
                </label>
            </div>

            {/* Notification preferences card */}
            <div className="profile-card">
                <h3 className="profile-card-title">Notification Preferences</h3>

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

                <div className="profile-toggle-row">
                    <div className="profile-toggle-info">
                        <span className="profile-toggle-label">Transfer News</span>
                        <span className="profile-toggle-desc">Breaking transfer updates</span>
                    </div>
                    <button
                        className={`profile-toggle ${notifTransfers ? 'on' : ''}`}
                        onClick={() => setNotifTransfers((v) => !v)}
                    >
                        <span className="profile-toggle-knob" />
                    </button>
                </div>
            </div>

            {/* Error / success + save button */}
            {error && <p className="profile-error">{error}</p>}

            <button className="profile-save-btn" onClick={handleSaveProfile}>
                {saved ? (
                    <>
                        <IonIcon icon={checkmarkOutline} />
                        Saved
                    </>
                ) : (
                    'Save Changes'
                )}
            </button>
        </div>
    );
};

export default ProfilePage;
