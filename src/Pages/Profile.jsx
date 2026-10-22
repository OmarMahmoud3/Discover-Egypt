import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';
import { usePlaces } from '../context/PlacesContext';
import { supabase } from '../lib/supabase';
import { CURATED_INTERESTS } from '../lib/communityService';
import LogIn from './LogIn';
import '../styles/profile.css';

// Curated Heritage Egyptian Avatars
const HERITAGE_AVATARS = [
  { id: 'pharaoh', emoji: '👑', labelAr: 'توت عنخ آمون', labelEn: 'Pharaoh' },
  { id: 'sphinx', emoji: '🦁', labelAr: 'أبو الهول', labelEn: 'Sphinx' },
  { id: 'pyramid', emoji: '🏛️', labelAr: 'الأهرامات', labelEn: 'Pyramid' },
  { id: 'horus_eye', emoji: '👁️', labelAr: 'عين حورس', labelEn: 'Eye of Horus' },
  { id: 'sun_ra', emoji: '☀️', labelAr: 'شمس رع', labelEn: 'Sun of Ra' },
  { id: 'lotus', emoji: '🪷', labelAr: 'زهرة اللوتس', labelEn: 'Lotus' },
  { id: 'felucca', emoji: '⛵', labelAr: 'فلوكة النيل', labelEn: 'Felucca' },
  { id: 'falcon', emoji: '🦅', labelAr: 'صقر حورس', labelEn: 'Royal Falcon' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { session, profile, isAdmin, handleLogout, handleDeleteAccount, refreshProfile } = useAdminAuth();
  const { lang, setLanguage, t, isArabic } = useLanguage();
  const { favoriteIds } = useFavorites();
  const { places } = usePlaces();

  // URL search params for active tab deep-linking
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const validTabs = ['personal', 'preferences', 'security', 'favorites', 'interests'];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(initialTabParam) ? initialTabParam : 'personal'
  );

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  useEffect(() => {
    if (initialTabParam && validTabs.includes(initialTabParam)) {
      setActiveTab(initialTabParam);
    }
  }, [initialTabParam]);

  // Form editable state
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('pharaoh');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [bio, setBio] = useState('');
  const [preferredLang, setPreferredLang] = useState('ar');
  const [defaultCity, setDefaultCity] = useState('all');
  const [travelTips, setTravelTips] = useState(true);

  // Community & Interests state
  const [interests, setInterests] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [contactPref, setContactPref] = useState('in_app');
  const [socialHandle, setSocialHandle] = useState('');
  const [customInterestInput, setCustomInterestInput] = useState('');

  // Baseline state to detect dirty changes
  const [baseline, setBaseline] = useState(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const expectedConfirmWord = t('profile.deleteConfirmWord') || (isArabic ? 'حذف' : 'DELETE');
  const normalizedDeleteInput = deleteConfirmInput.trim().toUpperCase();
  const isDeleteConfirmed =
    normalizedDeleteInput === expectedConfirmWord.toUpperCase() ||
    normalizedDeleteInput === 'حذف' ||
    normalizedDeleteInput === 'DELETE';

  const onConfirmDeleteAccount = async () => {
    if (!isDeleteConfirmed || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      if (typeof handleDeleteAccount === 'function') {
        await handleDeleteAccount();
      } else {
        const { deleteCurrentUserAccount } = await import('../lib/communityService');
        await deleteCurrentUserAccount();
      }
      setDeleteModalOpen(false);
      navigate('/login', {
        replace: true,
        state: { accountDeleted: true, message: t('profile.deleteAccountSuccess') },
      });
    } catch (err) {
      console.error('Account deletion error:', err);
      const isSystemAdminErr =
        err.message?.includes('System Protection') ||
        err.message?.includes('administrator') ||
        err.message?.includes('المسؤول');

      const isServerNotConfigured =
        err.message?.includes('Edge Function') ||
        err.message?.includes('PGRST202') ||
        err.message?.includes('delete_own_user') ||
        err.message?.includes('تفعيل دالة SQL') ||
        err.message?.includes('غير مفعلة');

      setDeleteError(
        isSystemAdminErr
          ? t('profile.deleteAdminError')
          : isServerNotConfigured
          ? (t('profile.deleteServerNotConfigured') || err.message)
          : (err.message || t('profile.deleteAccountError'))
      );
      setDeleteLoading(false);
    }
  };

  // Page interaction state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Initialize form state from session & profile
  useEffect(() => {
    if (!session) return;

    const meta = session.user?.user_metadata || {};
    const initialName = profile?.display_name || meta.full_name || meta.name || session.user.email?.split('@')[0] || '';
    const initialAvatar = profile?.avatar_url || meta.avatar_url || 'pharaoh';
    const initialLang = profile?.preferred_language || meta.preferred_language || lang || 'ar';
    const initialBio = meta.bio || '';
    const initialCity = meta.default_city || 'all';
    const initialTips = meta.travel_tips !== undefined ? meta.travel_tips : true;
    const initialInterests = Array.isArray(profile?.interests)
      ? profile.interests
      : (Array.isArray(meta.interests) ? meta.interests : []);
    const initialIsPublic = profile?.is_public !== undefined
      ? profile.is_public
      : (meta.is_public !== undefined ? meta.is_public : true);
    const initialContactPref = profile?.contact_preference || meta.contact_preference || 'in_app';
    const initialSocialHandle = profile?.social_handle || meta.social_handle || '';

    setDisplayName(initialName);
    setAvatarUrl(initialAvatar);
    if (initialAvatar.startsWith('http://') || initialAvatar.startsWith('https://')) {
      setCustomAvatarInput(initialAvatar);
    }
    setBio(initialBio);
    setPreferredLang(initialLang);
    setDefaultCity(initialCity);
    setTravelTips(initialTips);
    setInterests(initialInterests);
    setIsPublic(initialIsPublic);
    setContactPref(initialContactPref);
    setSocialHandle(initialSocialHandle);

    setBaseline({
      displayName: initialName,
      avatarUrl: initialAvatar,
      bio: initialBio,
      preferredLang: initialLang,
      defaultCity: initialCity,
      travelTips: initialTips,
      interests: initialInterests,
      isPublic: initialIsPublic,
      contactPref: initialContactPref,
      socialHandle: initialSocialHandle,
    });
  }, [session, profile, lang]);

  // Compute dirty state (has uncommitted changes)
  const hasChanges = useMemo(() => {
    if (!baseline) return false;
    const interestsEqual =
      Array.isArray(interests) &&
      Array.isArray(baseline.interests) &&
      interests.length === baseline.interests.length &&
      interests.every((val, idx) => val === baseline.interests[idx]);

    return (
      displayName !== baseline.displayName ||
      avatarUrl !== baseline.avatarUrl ||
      bio !== baseline.bio ||
      preferredLang !== baseline.preferredLang ||
      defaultCity !== baseline.defaultCity ||
      travelTips !== baseline.travelTips ||
      !interestsEqual ||
      isPublic !== baseline.isPublic ||
      contactPref !== baseline.contactPref ||
      socialHandle !== baseline.socialHandle
    );
  }, [
    baseline,
    displayName,
    avatarUrl,
    bio,
    preferredLang,
    defaultCity,
    travelTips,
    interests,
    isPublic,
    contactPref,
    socialHandle,
  ]);

  // Revert all changes
  const handleCancelChanges = () => {
    if (!baseline) return;
    setDisplayName(baseline.displayName);
    setAvatarUrl(baseline.avatarUrl);
    if (baseline.avatarUrl.startsWith('http://') || baseline.avatarUrl.startsWith('https://')) {
      setCustomAvatarInput(baseline.avatarUrl);
    } else {
      setCustomAvatarInput('');
    }
    setBio(baseline.bio);
    setPreferredLang(baseline.preferredLang);
    setDefaultCity(baseline.defaultCity);
    setTravelTips(baseline.travelTips);
    setInterests(baseline.interests || []);
    setIsPublic(baseline.isPublic);
    setContactPref(baseline.contactPref);
    setSocialHandle(baseline.socialHandle);
    showToast(t('profile.changesDiscarded'), 'info');
  };

  // Save changes to Supabase & Context
  const handleSaveChanges = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!hasChanges || saving || !session) return;

    setSaving(true);
    try {
      const cleanName = displayName.trim();
      const cleanAvatar = avatarUrl.trim();
      const cleanBio = bio.trim();

      // 1. Upsert public.profiles table (including community attributes)
      const updateData = {
        id: session.user.id,
        display_name: cleanName,
        avatar_url: cleanAvatar,
        preferred_language: preferredLang,
        bio: cleanBio,
        interests: interests,
        is_public: isPublic,
        city: defaultCity !== 'all' ? defaultCity : '',
        contact_preference: contactPref,
        social_handle: socialHandle.trim(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(updateData, { onConflict: 'id' });

      if (profileError) {
        console.warn('Profile table upsert notice (falling back if columns not present):', profileError.message);
        // Fallback update with core columns if optional community columns aren't in remote schema yet
        await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            display_name: cleanName,
            avatar_url: cleanAvatar,
            preferred_language: preferredLang,
          }, { onConflict: 'id' });
      }

      // 2. Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          name: cleanName,
          avatar_url: cleanAvatar,
          preferred_language: preferredLang,
          bio: cleanBio,
          default_city: defaultCity,
          travel_tips: travelTips,
          interests: interests,
          is_public: isPublic,
          contact_preference: contactPref,
          social_handle: socialHandle.trim(),
        },
      });

      if (authError) throw authError;

      // 3. Synchronize site language if user altered language preference
      if (preferredLang !== lang) {
        setLanguage(preferredLang);
      }

      // 4. Refresh admin/user auth context to update navbar & header
      await refreshProfile();

      // 5. Update baseline state
      setBaseline({
        displayName: cleanName,
        avatarUrl: cleanAvatar,
        bio: cleanBio,
        preferredLang,
        defaultCity,
        travelTips,
        interests: [...interests],
        isPublic,
        contactPref,
        socialHandle: socialHandle.trim(),
      });

      showToast(t('profile.saveSuccess'), 'success');
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message || t('profile.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword.length < 6) {
      setPasswordError(t('profile.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setPasswordMessage(t('profile.passwordUpdatedSuccess'));
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('profile.passwordUpdatedSuccess'), 'success');
    } catch (err) {
      setPasswordError(err.message || t('profile.saveError'));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Calculate Password Strength
  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    if (newPassword.length < 6) return 'weak';
    if (newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) {
      return 'strong';
    }
    return 'medium';
  }, [newPassword]);

  // Saved Places preview list
  const savedPlacesList = useMemo(() => {
    if (!Array.isArray(favoriteIds) || !Array.isArray(places)) return [];
    return places.filter((p) => favoriteIds.includes(p.id)).slice(0, 4);
  }, [favoriteIds, places]);

  // Unique cities list for preferred destination selector
  const availableCities = useMemo(() => {
    if (!Array.isArray(places)) return [];
    const set = new Set();
    places.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set).sort();
  }, [places]);

  // Render current avatar icon or image
  const renderCurrentAvatar = () => {
    const isUrl = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');
    if (isUrl) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    const match = HERITAGE_AVATARS.find((a) => a.id === avatarUrl);
    if (match) {
      return <span>{match.emoji}</span>;
    }
    return <span>{displayName?.[0]?.toUpperCase() || '👤'}</span>;
  };

  // Format member joined date
  const memberSinceFormatted = useMemo(() => {
    const rawDate = profile?.created_at || session?.user?.created_at;
    if (!rawDate) return isArabic ? 'عضو نشط' : 'Active Member';
    try {
      const date = new Date(rawDate);
      return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch {
      return isArabic ? 'عضو نشط' : 'Active Member';
    }
  }, [profile, session, isArabic]);

  // Provider Label
  const authProviderName = useMemo(() => {
    const appMeta = session?.user?.app_metadata;
    const provider = appMeta?.provider || appMeta?.providers?.[0];
    if (provider === 'google') return t('profile.authProviderGoogle');
    return t('profile.authProviderEmail');
  }, [session, t]);

  // Guest State View (when not logged in)
  if (!session) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-inner">
          <nav className="profile-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
              <span>{t('profile.breadcrumbHome')}</span>
            </Link>
            <span className="separator">/</span>
            <span className="current">{t('profile.breadcrumbProfile')}</span>
          </nav>

          <div className="profile-guest-card">
            <div className="profile-guest-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '38px' }}>
                account_circle
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
              {t('profile.guestTitle')}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 24px' }}>
              {t('profile.guestSubtitle')}
            </p>

            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <LogIn session={null} />
            </div>

            <div style={{ marginTop: '20px' }}>
              <Link
                to="/explore"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: 'var(--surface-low)',
                  color: 'var(--primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  travel_explore
                </span>
                <span>{t('profile.guestExploreBtn')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <div className="profile-page-inner">
        {/* Breadcrumb Navigation */}
        <nav className="profile-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
            <span>{t('profile.breadcrumbHome')}</span>
          </Link>
          <span className="separator">/</span>
          <span className="current">{t('profile.breadcrumbProfile')}</span>
        </nav>

        {/* Hero Masthead Card */}
        <header className="profile-hero-card">
          <div className="profile-hero-content">
            {/* User Details */}
            <div className="profile-hero-user">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-display" title={displayName}>
                  {renderCurrentAvatar()}
                </div>
                <div className="profile-avatar-badge" title={isAdmin ? t('profile.roleAdmin') : t('profile.roleExplorer')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {isAdmin ? 'shield_person' : 'verified'}
                  </span>
                </div>
              </div>

              <div className="profile-user-details">
                <div className="profile-badge-strip">
                  <span className={`profile-role-badge ${isAdmin ? 'admin' : 'explorer'}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {isAdmin ? 'admin_panel_settings' : 'explore'}
                    </span>
                    <span>{isAdmin ? t('profile.roleAdmin') : t('profile.roleExplorer')}</span>
                  </span>

                  <span className="profile-status-badge">
                    <span>{t('profile.activeStatus')}</span>
                  </span>
                </div>

                <h1 className="profile-display-name">{displayName}</h1>

                <div className="profile-email-row">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--secondary)' }}>
                    mail
                  </span>
                  <span>{session.user.email}</span>
                </div>

                <div className="profile-member-date">
                  <span>{t('profile.memberSince')} </span>
                  <strong>{memberSinceFormatted}</strong>
                </div>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="profile-stats-strip">
              <Link to="/favorites" className="profile-stat-link" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="profile-stat-box" style={{ cursor: 'pointer' }}>
                  <div className="profile-stat-icon">
                    <span className="material-symbols-outlined material-filled" style={{ color: 'var(--secondary)' }}>
                      favorite
                    </span>
                  </div>
                  <div>
                    <div className="profile-stat-num">{favoriteIds.length}</div>
                    <div className="profile-stat-label">{t('nav.favorites')}</div>
                  </div>
                </div>
              </Link>

              <div className="profile-stat-box">
                <div className="profile-stat-icon">
                  <span className="material-symbols-outlined" style={{ color: 'var(--gold-dark)' }}>
                    translate
                  </span>
                </div>
                <div>
                  <div className="profile-stat-num">{lang.toUpperCase()}</div>
                  <div className="profile-stat-label">{lang === 'ar' ? 'العربية' : 'English'}</div>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  className="profile-admin-btn"
                  onClick={() => navigate('/admin')}
                  style={{
                    backgroundColor: 'var(--gold-surface)',
                    border: '1px solid var(--gold)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--gold-dark)' }}>
                    dashboard
                  </span>
                  <span>{t('profile.adminBadgeAction')}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tab Sub-Navigation */}
        <nav className="profile-tabs-bar" role="tablist" aria-label="Profile Sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'personal'}
            className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => handleTabChange('personal')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person
            </span>
            <span>{t('profile.tabPersonalInfo')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'interests'}
            className={`profile-tab-btn ${activeTab === 'interests' ? 'active' : ''}`}
            onClick={() => handleTabChange('interests')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              groups
            </span>
            <span>{t('profile.tabInterests')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preferences'}
            className={`profile-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => handleTabChange('preferences')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              tune
            </span>
            <span>{t('profile.tabPreferences')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'security'}
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => handleTabChange('security')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              lock
            </span>
            <span>{t('profile.tabSecurity')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={`profile-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => handleTabChange('favorites')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              bookmarks
            </span>
            <span>{t('profile.tabFavorites')}</span>
          </button>
        </nav>

        {/* Main Tab Content */}
        <div className="profile-content-grid">
          {/* TAB 1: Personal Info */}
          {activeTab === 'personal' && (
            <section className="profile-card" aria-label={t('profile.tabPersonalInfo')}>
              <div className="profile-card-header">
                <div>
                  <h2 className="profile-card-title">
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                      badge
                    </span>
                    <span>{t('profile.tabPersonalInfo')}</span>
                  </h2>
                  <p className="profile-card-subtitle">{t('profile.pageSubtitle')}</p>
                </div>
              </div>

              <div className="profile-form-grid">
                {/* Full Name */}
                <div className="profile-form-group">
                  <label htmlFor="display-name" className="profile-label">
                    <span>{t('profile.displayNameLabel')}</span>
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    className="profile-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('profile.displayNamePlaceholder')}
                    required
                  />
                </div>

                {/* Email (Readonly) */}
                <div className="profile-form-group">
                  <label htmlFor="profile-email" className="profile-label">
                    <span>{t('profile.emailLabel')}</span>
                    <span className="profile-label-hint">{t('profile.emailVerifiedBadge')}</span>
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    className="profile-input"
                    value={session.user.email || ''}
                    readOnly
                    disabled
                  />
                </div>

                {/* Heritage Cultural Avatar Picker */}
                <div className="profile-form-group full-width">
                  <label className="profile-label">
                    <span>{t('profile.avatarLabel')}</span>
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>
                    {t('profile.selectAvatarPrompt')}
                  </p>

                  <div className="avatar-selection-grid">
                    {HERITAGE_AVATARS.map((item) => {
                      const isSelected = avatarUrl === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`avatar-choice-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setAvatarUrl(item.id)}
                          title={isArabic ? item.labelAr : item.labelEn}
                        >
                          <span className="avatar-choice-emoji">{item.emoji}</span>
                          <span className="avatar-choice-label">
                            {isArabic ? item.labelAr : item.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom URL fallback */}
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor="custom-avatar-url" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      {t('profile.avatarCustomUrl')}
                    </label>
                    <input
                      id="custom-avatar-url"
                      type="url"
                      className="profile-input"
                      value={customAvatarInput}
                      onChange={(e) => {
                        setCustomAvatarInput(e.target.value);
                        if (e.target.value.trim()) {
                          setAvatarUrl(e.target.value.trim());
                        }
                      }}
                      placeholder={t('profile.avatarCustomUrlPlaceholder')}
                    />
                  </div>
                </div>

                {/* Travel Bio */}
                <div className="profile-form-group full-width">
                  <label htmlFor="profile-bio" className="profile-label">
                    <span>{t('profile.bioLabel')}</span>
                  </label>
                  <textarea
                    id="profile-bio"
                    className="profile-input profile-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('profile.bioPlaceholder')}
                    maxLength={300}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', textAlign: isArabic ? 'left' : 'right', marginTop: '2px' }}>
                    {bio.length} / 300
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 2: Preferences */}
          {activeTab === 'preferences' && (
            <section className="profile-card" aria-label={t('profile.tabPreferences')}>
              <div className="profile-card-header">
                <div>
                  <h2 className="profile-card-title">
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                      tune
                    </span>
                    <span>{t('profile.tabPreferences')}</span>
                  </h2>
                  <p className="profile-card-subtitle">{t('profile.preferredLangDesc')}</p>
                </div>
              </div>

              <div className="profile-form-grid">
                {/* Interface Language */}
                <div className="profile-form-group">
                  <label className="profile-label">
                    <span>{t('profile.preferredLangLabel')}</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setPreferredLang('ar')}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        borderRadius: 'var(--radius-md)',
                        border: preferredLang === 'ar' ? '2px solid var(--secondary)' : '1px solid var(--border)',
                        backgroundColor: preferredLang === 'ar' ? 'var(--secondary-surface)' : 'var(--surface)',
                        color: preferredLang === 'ar' ? 'var(--secondary)' : 'var(--primary)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span>🇪🇬</span>
                      <span>العربية (الافتراضية)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreferredLang('en')}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        borderRadius: 'var(--radius-md)',
                        border: preferredLang === 'en' ? '2px solid var(--secondary)' : '1px solid var(--border)',
                        backgroundColor: preferredLang === 'en' ? 'var(--secondary-surface)' : 'var(--surface)',
                        color: preferredLang === 'en' ? 'var(--secondary)' : 'var(--primary)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span>🌐</span>
                      <span>English</span>
                    </button>
                  </div>
                </div>

                {/* Primary Destination Choice */}
                <div className="profile-form-group">
                  <label htmlFor="default-city" className="profile-label">
                    <span>{t('profile.defaultCityLabel')}</span>
                  </label>
                  <select
                    id="default-city"
                    className="profile-input"
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="all">{t('profile.allCities')}</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Travel Alerts Toggle */}
                <div className="profile-form-group full-width" style={{ marginTop: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={travelTips}
                      onChange={(e) => setTravelTips(e.target.checked)}
                      style={{
                        width: '20px',
                        height: '20px',
                        accentColor: 'var(--secondary)',
                        marginTop: '2px',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                        {t('profile.travelTipsLabel')}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('profile.travelTipsDesc')}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: Security & Credentials */}
          {activeTab === 'security' && (
            <section className="profile-card" aria-label={t('profile.tabSecurity')}>
              <div className="profile-card-header">
                <div>
                  <h2 className="profile-card-title">
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                      lock
                    </span>
                    <span>{t('profile.tabSecurity')}</span>
                  </h2>
                  <p className="profile-card-subtitle">{t('profile.changePasswordDesc')}</p>
                </div>
              </div>

              {/* Authentication Provider Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>
                    security
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t('profile.authProviderLabel')}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                      {authProviderName}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--error-bg)',
                    color: 'var(--error)',
                    border: '1px solid rgba(185, 28, 28, 0.25)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    logout
                  </span>
                  <span>{t('profile.logoutBtn')}</span>
                </button>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleUpdatePassword} style={{ maxWidth: '520px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', marginBottom: '14px' }}>
                  {t('profile.changePasswordTitle')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="profile-form-group">
                    <label htmlFor="new-password" className="profile-label">
                      <span>{t('profile.newPasswordLabel')}</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        className="profile-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('profile.newPasswordPlaceholder')}
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword((prev) => !prev)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {passwordStrength && (
                      <div className="password-meter-wrap">
                        <span style={{ color: 'var(--text-muted)' }}>{t('profile.passwordStrength')}</span>
                        <div className="password-meter-bar">
                          <div className={`password-meter-fill ${passwordStrength}`} />
                        </div>
                        <span style={{
                          color: passwordStrength === 'strong' ? 'var(--success)' : passwordStrength === 'medium' ? 'var(--gold-dark)' : 'var(--error)'
                        }}>
                          {passwordStrength === 'strong' ? t('profile.strengthStrong') : passwordStrength === 'medium' ? t('profile.strengthMedium') : t('profile.strengthWeak')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="confirm-password" className="profile-label">
                      <span>{t('profile.confirmPasswordLabel')}</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        className="profile-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('profile.confirmPasswordPlaceholder')}
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--error-bg)', color: 'var(--error)', fontSize: '12px', fontWeight: 600 }}>
                      ⚠️ {passwordError}
                    </div>
                  )}

                  {passwordMessage && (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-bg)', color: 'var(--success)', fontSize: '12px', fontWeight: 600 }}>
                      ✓ {passwordMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword}
                    className="btn-primary"
                    style={{
                      alignSelf: 'flex-start',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 700,
                      opacity: passwordLoading || !newPassword ? 0.6 : 1,
                    }}
                  >
                    <span>{passwordLoading ? t('profile.updatingPassword') : t('profile.updatePasswordBtn')}</span>
                  </button>
                </div>
              </form>

              {/* Danger Zone: Permanent Account Deletion */}
              <div className="profile-danger-card">
                <div className="profile-danger-header">
                  <div>
                    <div className="profile-danger-title-row">
                      <span className="material-symbols-outlined" style={{ color: '#DC2626', fontSize: '22px' }}>
                        warning
                      </span>
                      <h3 className="profile-danger-title">
                        {t('profile.deleteAccountDangerTitle')}
                      </h3>
                    </div>
                    <p className="profile-danger-desc">
                      {t('profile.deleteAccountDangerDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-danger-btn"
                    onClick={() => {
                      setDeleteModalOpen(true);
                      setDeleteConfirmInput('');
                      setDeleteError('');
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      delete_forever
                    </span>
                    <span>{t('profile.deleteAccountBtn')}</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* TAB 4: Saved Places & Activity */}
          {activeTab === 'favorites' && (
            <section className="profile-card" aria-label={t('profile.tabFavorites')}>
              <div className="profile-card-header">
                <div>
                  <h2 className="profile-card-title">
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                      bookmark_heart
                    </span>
                    <span>{t('profile.savedPlacesTitle')}</span>
                  </h2>
                  <p className="profile-card-subtitle">{t('profile.savedPlacesDesc')}</p>
                </div>

                <Link
                  to="/favorites"
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    backgroundColor: 'var(--secondary-surface)',
                    color: 'var(--secondary)',
                    border: '1px solid rgba(15, 118, 110, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{t('profile.viewAllFavorites', { count: favoriteIds.length })}</span>
                  <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                    arrow_forward
                  </span>
                </Link>
              </div>

              {savedPlacesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🧭</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
                    {t('profile.noFavoritesYet')}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {t('favorites.emptyDesc')}
                  </p>
                  <Link
                    to="/explore"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 18px',
                      textDecoration: 'none',
                      fontSize: '13px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      explore
                    </span>
                    <span>{t('profile.explorePlacesBtn')}</span>
                  </Link>
                </div>
              ) : (
                <div className="profile-favorites-grid">
                  {savedPlacesList.map((place) => (
                    <Link
                      key={place.id}
                      to={`/places/${place.id}`}
                      className="profile-favorite-card"
                    >
                      <img
                        src={place.image}
                        alt={place.name}
                        className="profile-favorite-card-img"
                        loading="lazy"
                      />
                      <div className="profile-favorite-card-body">
                        <div className="profile-favorite-card-name">{place.name}</div>
                        <div className="profile-favorite-card-city">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>
                            location_on
                          </span>
                          <span>{place.city}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 5: Interests & Community Discovery */}
          {activeTab === 'interests' && (
            <section className="profile-card" aria-label={t('profile.tabInterests')}>
              <div className="profile-card-header">
                <div>
                  <h2 className="profile-card-title">
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                      groups
                    </span>
                    <span>{t('profile.tabInterests')}</span>
                  </h2>
                  <p className="profile-card-subtitle">{t('profile.interestsTabDesc')}</p>
                </div>
              </div>

              <div className="profile-form-grid">
                {/* 1. Privacy Discovery Toggle */}
                <div className="profile-form-group profile-full-width">
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface)',
                      border: isPublic ? '1px solid var(--border-gold)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      style={{
                        width: '20px',
                        height: '20px',
                        accentColor: 'var(--secondary)',
                        marginTop: '2px',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                        {t('profile.allowDiscoveryLabel')}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                        {t('profile.allowDiscoveryDesc')}
                      </div>
                    </div>
                  </label>
                </div>

                {/* 2. Interests Selection */}
                <div className="profile-form-group profile-full-width">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="profile-label" style={{ margin: 0 }}>
                      <span>{t('profile.myInterestsLabel')}</span>
                    </label>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--gold-dark)',
                        background: 'var(--gold-surface)',
                        padding: '2px 10px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-gold)',
                      }}
                    >
                      {t('profile.selectedCount').replace('{count}', interests.length)}
                    </span>
                  </div>

                  {/* Curated Pre-set Interest Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {CURATED_INTERESTS.map((item) => {
                      const tagLabel = isArabic ? item.labelAr : item.labelEn;
                      const isSelected = interests.includes(tagLabel) || interests.includes(item.labelAr) || interests.includes(item.labelEn);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setInterests(interests.filter((i) => i !== tagLabel && i !== item.labelAr && i !== item.labelEn));
                            } else {
                              setInterests([...interests, tagLabel]);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: isSelected ? '1px solid var(--gold)' : '1px solid var(--border)',
                            backgroundColor: isSelected ? 'var(--gold-surface)' : 'var(--beige-light)',
                            color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          <span>{tagLabel}</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? 'var(--secondary)' : 'var(--text-light)' }}>
                            {isSelected ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Interest Input */}
                  <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                    <input
                      type="text"
                      className="profile-input"
                      placeholder={t('profile.addCustomInterest')}
                      value={customInterestInput}
                      onChange={(e) => setCustomInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = customInterestInput.trim();
                          if (trimmed && !interests.includes(trimmed)) {
                            setInterests([...interests, trimmed]);
                            setCustomInterestInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const trimmed = customInterestInput.trim();
                        if (trimmed && !interests.includes(trimmed)) {
                          setInterests([...interests, trimmed]);
                          setCustomInterestInput('');
                        }
                      }}
                      disabled={!customInterestInput.trim()}
                      style={{ padding: '0 18px', whiteSpace: 'nowrap', opacity: customInterestInput.trim() ? 1 : 0.6 }}
                    >
                      {t('profile.addInterestBtn')}
                    </button>
                  </div>

                  {/* Custom Added Tags display */}
                  {interests.some((i) => !CURATED_INTERESTS.some((ci) => ci.labelAr === i || ci.labelEn === i)) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                      {interests
                        .filter((i) => !CURATED_INTERESTS.some((ci) => ci.labelAr === i || ci.labelEn === i))
                        .map((customTag, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              backgroundColor: 'var(--secondary-surface)',
                              color: 'var(--secondary-dark)',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid var(--secondary-light)',
                            }}
                          >
                            <span>#{customTag}</span>
                            <button
                              type="button"
                              onClick={() => setInterests(interests.filter((i) => i !== customTag))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--secondary-dark)', fontSize: '14px', lineHeight: 1 }}
                              aria-label={`Remove ${customTag}`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* 3. Preferred Contact Method */}
                <div className="profile-form-group profile-full-width">
                  <label className="profile-label">
                    <span>{t('profile.contactPrefLabel')}</span>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface)',
                        border: contactPref === 'in_app' ? '1px solid var(--secondary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="contact_pref"
                        value="in_app"
                        checked={contactPref === 'in_app'}
                        onChange={() => setContactPref('in_app')}
                        style={{ accentColor: 'var(--secondary)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                          🛡️ {t('profile.contactPrefInApp')}
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface)',
                        border: contactPref === 'social' ? '1px solid var(--secondary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="contact_pref"
                        value="social"
                        checked={contactPref === 'social'}
                        onChange={() => setContactPref('social')}
                        style={{ accentColor: 'var(--secondary)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                          🌐 {t('profile.contactPrefSocial')}
                        </div>
                      </div>
                    </label>

                    {contactPref === 'social' && (
                      <div style={{ marginTop: '6px', maxWidth: '420px', paddingLeft: isArabic ? 0 : '28px', paddingRight: isArabic ? '28px' : 0 }}>
                        <label htmlFor="social-handle" className="profile-label" style={{ fontSize: '12px' }}>
                          {t('profile.socialHandleLabel')}
                        </label>
                        <input
                          id="social-handle"
                          type="text"
                          className="profile-input"
                          value={socialHandle}
                          onChange={(e) => setSocialHandle(e.target.value)}
                          placeholder={t('profile.socialHandlePlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sticky Action Bar (appears whenever dirty modifications exist) */}
        {hasChanges && (
          <aside className="profile-actions-bar" aria-label="Action controls">
            <div className="profile-actions-status">
              <span className="profile-actions-status-dot" />
              <span>{t('profile.unsavedChangesAlert')}</span>
            </div>

            <div className="profile-actions-buttons">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancelChanges}
                disabled={saving}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  restart_alt
                </span>
                <span>{t('profile.cancelChangesBtn')}</span>
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {saving ? 'sync' : 'save'}
                </span>
                <span>{saving ? t('profile.savingChanges') : t('profile.saveChangesBtn')}</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(18, 48, 74, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                logout
              </span>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
              {t('profile.logoutConfirmTitle')}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              {t('profile.logoutConfirmMessage')}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="btn-cancel"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {t('profile.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLogoutConfirmOpen(false);
                  await handleLogout();
                  navigate('/');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--error)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('profile.confirmLogoutBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="delete-modal-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => {
            if (!deleteLoading) setDeleteModalOpen(false);
          }}
        >
          <div
            className="delete-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="delete-modal-header">
              <div className="delete-modal-header-text">
                <div className="delete-modal-header-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    delete_forever
                  </span>
                </div>
                <h3 id="delete-dialog-title" className="delete-modal-title">
                  {t('profile.deleteModalTitle')}
                </h3>
              </div>
              <button
                type="button"
                className="delete-modal-close-btn"
                onClick={() => {
                  if (!deleteLoading) setDeleteModalOpen(false);
                }}
                disabled={deleteLoading}
                aria-label={t('profile.cancelBtn')}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="delete-modal-body">
              {/* Critical Warning Alert */}
              <div className="delete-warning-banner">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', flexShrink: 0 }}>
                  warning
                </span>
                <span>{t('profile.deleteModalWarning')}</span>
              </div>

              {/* Data Eradication Summary List */}
              <div className="delete-data-list">
                <div className="delete-data-list-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#DC2626' }}>
                    shield
                  </span>
                  <span>{t('profile.deleteDataListTitle')}</span>
                </div>
                <ul className="delete-data-items">
                  <li className="delete-data-item">
                    <span className="delete-data-item-icon">🔐</span>
                    <span>{t('profile.deleteDataAuth')}</span>
                  </li>
                  <li className="delete-data-item">
                    <span className="delete-data-item-icon">👤</span>
                    <span>{t('profile.deleteDataProfile')}</span>
                  </li>
                  <li className="delete-data-item">
                    <span className="delete-data-item-icon">💖</span>
                    <span>{t('profile.deleteDataFavorites')}</span>
                  </li>
                  <li className="delete-data-item">
                    <span className="delete-data-item-icon">💬</span>
                    <span>{t('profile.deleteDataMessages')}</span>
                  </li>
                </ul>
              </div>

              {/* Explicit Confirmation Input */}
              <div className="delete-confirm-box">
                <label htmlFor="delete-confirm-input" className="delete-confirm-label">
                  {t('profile.deleteConfirmPrompt', { word: expectedConfirmWord })}
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  className={`delete-confirm-input ${isDeleteConfirmed ? 'is-matched' : ''}`}
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={t('profile.deleteConfirmPlaceholder')}
                  disabled={deleteLoading}
                  autoComplete="off"
                />
              </div>

              {/* Error feedback if any */}
              {deleteError && (
                <div className="delete-modal-error" role="alert">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    error
                  </span>
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="delete-modal-footer">
              <button
                type="button"
                className="delete-cancel-btn"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
              >
                {t('profile.cancelBtn')}
              </button>
              <button
                type="button"
                className="delete-submit-btn"
                onClick={onConfirmDeleteAccount}
                disabled={!isDeleteConfirmed || deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '16px', animation: 'spin 0.8s linear infinite' }}
                    >
                      progress_activity
                    </span>
                    <span>{t('profile.deletingAccount')}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      delete_forever
                    </span>
                    <span>{t('profile.confirmDeleteBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {toast && (
        <div className="profile-toast" role="status" aria-live="polite">
          <span className="material-symbols-outlined" style={{ color: toast.type === 'error' ? 'var(--error)' : 'var(--gold)' }}>
            {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
