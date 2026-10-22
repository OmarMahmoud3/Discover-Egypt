import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  CURATED_INTERESTS,
  CITIES_LIST,
  fetchCommunityProfiles,
  filterCommunityProfiles,
  sendConnectionRequest,
} from '../lib/communityService';
import '../styles/community.css';

// Heritage Avatars Map for visual rendering
const HERITAGE_AVATARS_MAP = {
  pharaoh: '👑',
  sphinx: '🦁',
  pyramid: '🏛️',
  horus_eye: '👁️',
  sun_ra: '☀️',
  lotus: '🪷',
  felucca: '⛵',
  falcon: '🦅',
};

export default function Community() {
  const { session, profile } = useAdminAuth();
  const { lang, t, isArabic } = useLanguage();

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [onlyShared, setOnlyShared] = useState(false);

  // Data states
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState(new Set());

  // Safe Connect Modal states
  const [connectModalUser, setConnectModalUser] = useState(null);
  const [connectPurpose, setConnectPurpose] = useState('travel_buddy');
  const [connectMessage, setConnectMessage] = useState('');
  const [sendingConnect, setSendingConnect] = useState(false);
  const [toast, setToast] = useState(null);

  // Extract current user interests from auth profile or user metadata
  const currentUserInterests = useMemo(() => {
    if (!session) return [];
    if (Array.isArray(profile?.interests)) return profile.interests;
    const metaInterests = session?.user?.user_metadata?.interests;
    if (Array.isArray(metaInterests)) return metaInterests;
    return [];
  }, [session, profile]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch all discoverable profiles once on mount or account/lang switch
  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCommunityProfiles({
        currentUserId: session?.user?.id || null,
        currentUserInterests,
        search: '',
        selectedInterest: 'all',
        selectedCity: 'all',
        onlyShared: false,
        lang,
      });
      setAllProfiles(data);
    } catch (err) {
      console.warn('Error loading community profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [session, currentUserInterests, lang]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Instant in-memory real-time filtering as user types or toggles chips
  const profiles = useMemo(() => {
    return filterCommunityProfiles(allProfiles, {
      search,
      selectedInterest,
      selectedCity,
      onlyShared,
    });
  }, [allProfiles, search, selectedInterest, selectedCity, onlyShared]);

  // Load existing sent requests from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('discover_egypt_community_requests') || '[]');
      const ids = new Set(saved.map((r) => r.receiver_id));
      setConnectedIds(ids);
    } catch (e) {
      console.warn('Failed to load sent requests from cache:', e);
    }
  }, []);

  // Open Safe Connect Modal
  const handleOpenConnect = (explorer) => {
    if (!session) {
      showToast(t('community.guestNotice'), 'info');
      return;
    }

    setConnectModalUser(explorer);
    setConnectPurpose('travel_buddy');

    // Generate polite default message using shared interests if available
    const primaryInterest = explorer.sharedInterests?.[0] || explorer.interests?.[0] || (isArabic ? 'معالم مصر' : 'Egyptian heritage');
    const defaultMsg = isArabic
      ? `مرحباً ${explorer.displayNameLocalized || explorer.display_name}، لاحظت اهتمامك المشترك بـ ${primaryInterest} وأود التواصل لتبادل المعرفة والتخطيط للزيارات.`
      : `Hello ${explorer.displayNameLocalized || explorer.display_name}, I noticed your interest in ${primaryInterest} and would love to connect to exchange travel insights.`;
    setConnectMessage(defaultMsg);
  };

  // Close Safe Connect Modal
  const handleCloseModal = () => {
    setConnectModalUser(null);
    setConnectMessage('');
    setSendingConnect(false);
  };

  // Submit Safe Connect Request
  const handleSubmitConnect = async (e) => {
    e.preventDefault();
    if (!connectModalUser || !session || !connectMessage.trim()) return;

    setSendingConnect(true);
    try {
      const res = await sendConnectionRequest({
        senderId: session.user.id,
        receiverId: connectModalUser.id,
        message: connectMessage.trim(),
        sharedInterests: connectModalUser.sharedInterests || [],
      });

      if (res.success) {
        setConnectedIds((prev) => new Set([...prev, connectModalUser.id]));
        showToast(t('community.requestSentSuccess'), 'success');
        handleCloseModal();
      } else {
        showToast(t('community.requestSentError'), 'error');
      }
    } catch (err) {
      console.warn('Failed to send connection:', err);
      showToast(t('community.requestSentError'), 'error');
    } finally {
      setSendingConnect(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedInterest('all');
    setSelectedCity('all');
    setOnlyShared(false);
  };

  // Helper for rendering avatar emoji or image
  const renderAvatar = (avatarUrl) => {
    if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
      return <img src={avatarUrl} alt="" className="explorer-avatar-img" />;
    }
    const emoji = HERITAGE_AVATARS_MAP[avatarUrl] || '🏛️';
    return <span aria-hidden="true">{emoji}</span>;
  };

  return (
    <main className="community-page-container" id="main-content">
      <div className="community-page-inner">
        {/* Breadcrumb Navigation */}
        <nav className="community-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">{t('community.breadcrumbHome')}</Link>
          <span className="separator" aria-hidden="true">/</span>
          <span className="current" aria-current="page">{t('community.breadcrumbCommunity')}</span>
        </nav>

        {/* Hero Masthead Card */}
        <header className="community-hero-card">
          <div className="community-hero-content">
            <span className="community-badge">
              <span aria-hidden="true">✨</span> {t('community.badge')}
            </span>
            <h1 className="community-hero-title">{t('community.pageTitle')}</h1>
            <p className="community-hero-subtitle">{t('community.pageSubtitle')}</p>
          </div>
          <div className="community-hero-actions">
            <Link to="/profile?tab=interests" className="community-action-btn primary">
              <span aria-hidden="true">🎯</span>
              <span>{t('community.manageMyInterests')}</span>
            </Link>
          </div>
        </header>

        {/* Search & Filtering Control Card */}
        <section className="community-controls-card" aria-label="Explorer Search and Filters">
          <div className="community-search-row">
            <div className="community-search-box">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="community-search-input"
                placeholder={t('community.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('community.searchPlaceholder')}
              />
              {search && (
                <button
                  type="button"
                  className="community-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="community-city-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label={t('community.filterCity')}
            >
              <option value="all">{t('community.filterCityAll')}</option>
              {CITIES_LIST.map((c) => (
                <option key={c.id} value={isArabic ? c.nameAr : c.nameEn}>
                  {isArabic ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Interest Chips Horizontal Scroller */}
          <div className="community-chips-container" role="tablist" aria-label="Interest Filter Categories">
            <button
              type="button"
              className={`community-chip-btn ${selectedInterest === 'all' && !onlyShared ? 'active' : ''}`}
              onClick={() => {
                setSelectedInterest('all');
                setOnlyShared(false);
              }}
            >
              🏛️ {t('community.filterAllInterests')}
            </button>

            {currentUserInterests.length > 0 && (
              <button
                type="button"
                className={`community-chip-btn shared-toggle ${onlyShared ? 'active' : ''}`}
                onClick={() => setOnlyShared(!onlyShared)}
              >
                ⭐ {t('community.filterSharedOnly')}
              </button>
            )}

            {CURATED_INTERESTS.map((interest) => {
              const label = isArabic ? interest.labelAr : interest.labelEn;
              const isActive = selectedInterest === (isArabic ? interest.labelAr : interest.labelEn);
              return (
                <button
                  key={interest.id}
                  type="button"
                  className={`community-chip-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedInterest(isActive ? 'all' : label);
                    setOnlyShared(false);
                  }}
                >
                  <span aria-hidden="true">{interest.icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Results Summary Counter */}
          <div className="community-results-header">
            <span className="community-results-count">
              {t('community.explorersCount').replace('{count}', profiles.length)}
            </span>
            {(search || selectedInterest !== 'all' || selectedCity !== 'all' || onlyShared) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="community-action-btn secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {t('community.resetFilters')}
              </button>
            )}
          </div>
        </section>

        {/* Explorers Directory Grid */}
        {loading ? (
          <div className="community-grid" aria-busy="true">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="explorer-card" style={{ opacity: 0.6 }}>
                <div className="explorer-card-header">
                  <div className="explorer-avatar-wrapper">🏛️</div>
                  <div className="explorer-header-info">
                    <div style={{ height: 16, background: 'var(--beige)', borderRadius: 4, width: '60%' }} />
                    <div style={{ height: 12, background: 'var(--beige-light)', borderRadius: 4, width: '40%', marginTop: 6 }} />
                  </div>
                </div>
                <div style={{ height: 48, background: 'var(--beige-light)', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="community-empty-card">
            <div className="community-empty-icon" aria-hidden="true">🔍</div>
            <h2 className="community-empty-title">{t('community.emptyTitle')}</h2>
            <p className="community-empty-desc">{t('community.emptyDesc')}</p>
            <button type="button" onClick={handleResetFilters} className="community-action-btn primary">
              {t('community.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="community-grid">
            {profiles.map((explorer) => {
              const isConnected = connectedIds.has(explorer.id);
              const hasShared = explorer.sharedCount > 0;

              return (
                <article key={explorer.id} className="explorer-card">
                  {/* Card Header */}
                  <div className="explorer-card-header">
                    <div className="explorer-avatar-wrapper">
                      {renderAvatar(explorer.avatar_url)}
                    </div>

                    <div className="explorer-header-info">
                      <div className="explorer-name-row">
                        <h2 className="explorer-name">
                          {explorer.displayNameLocalized || explorer.display_name}
                        </h2>
                        {explorer.role === 'admin' && (
                          <span className="explorer-admin-badge">Admin</span>
                        )}
                      </div>

                      {explorer.cityLocalized && (
                        <div className="explorer-location-row">
                          <span className="loc-icon" aria-hidden="true">📍</span>
                          <span>{explorer.cityLocalized}</span>
                        </div>
                      )}

                      {hasShared && (
                        <span className="explorer-shared-pill">
                          <span aria-hidden="true">⭐</span>
                          {t('community.sharedInterestsBadge').replace('{count}', explorer.sharedCount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="explorer-bio">
                    {explorer.bioLocalized || t('community.joinCommunityPrompt')}
                  </p>

                  {/* Interests Tags List */}
                  <div className="explorer-interests-section">
                    <div className="explorer-tags-list">
                      {Array.isArray(explorer.interests) && explorer.interests.length > 0 ? (
                        explorer.interests.map((interest, idx) => {
                          const isSharedTag = explorer.sharedInterests?.includes(interest);
                          return (
                            <span
                              key={idx}
                              className={`explorer-tag ${isSharedTag ? 'shared' : ''}`}
                            >
                              {isSharedTag && <span className="shared-star" aria-hidden="true">★</span>}
                              {interest}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          {t('community.noInterestsListed')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer & Connection Button */}
                  <div className="explorer-card-footer">
                    <span className="explorer-contact-badge">
                      <span aria-hidden="true">🛡️</span>
                      {explorer.contact_preference === 'social' && explorer.social_handle
                        ? explorer.social_handle
                        : t('community.inAppSafeLabel')}
                    </span>

                    <button
                      type="button"
                      className={`explorer-connect-btn ${isConnected ? 'connected' : ''}`}
                      disabled={isConnected}
                      onClick={() => handleOpenConnect(explorer)}
                      aria-label={`${t('community.connectBtn')} with ${explorer.displayNameLocalized || explorer.display_name}`}
                    >
                      {isConnected ? (
                        t('community.connectedBtn')
                      ) : (
                        <>
                          <span aria-hidden="true">💬</span>
                          <span>{t('community.connectBtn')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Safe Connect Modal Dialog */}
        {connectModalUser && (
          <div
            className="connect-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-dialog-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <div className="connect-modal-card">
              <div className="connect-modal-header">
                <div>
                  <h3 id="connect-dialog-title" className="connect-modal-title">
                    {t('community.safeConnectTitle').replace(
                      '{name}',
                      connectModalUser.displayNameLocalized || connectModalUser.display_name
                    )}
                  </h3>
                  <p className="connect-modal-subtitle">{t('community.safeConnectSubtitle')}</p>
                </div>
                <button
                  type="button"
                  className="connect-modal-close"
                  onClick={handleCloseModal}
                  aria-label={t('community.closeModal')}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitConnect}>
                <div className="connect-modal-body">
                  {/* Connection Purpose Selection */}
                  <div className="connect-field-group">
                    <label className="connect-label">{t('community.connectionTypeLabel')}</label>
                    <div className="connect-purpose-options">
                      {[
                        { id: 'travel_buddy', label: t('community.connectionTypeTravelBuddy') },
                        { id: 'advice', label: t('community.connectionTypeAdvice') },
                        { id: 'cultural', label: t('community.connectionTypeCultural') },
                        { id: 'general', label: t('community.connectionTypeGeneral') },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`connect-purpose-chip ${connectPurpose === item.id ? 'active' : ''}`}
                          onClick={() => setConnectPurpose(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icebreaker Suggestions */}
                  <div className="connect-field-group">
                    <label className="connect-label">{t('community.icebreakerPrompt')}</label>
                    <div className="icebreakers-list">
                      {[
                        t('community.icebreaker1').replace(
                          '{interest}',
                          connectModalUser.sharedInterests?.[0] || connectModalUser.interests?.[0] || 'الآثار المصرية'
                        ),
                        t('community.icebreaker2'),
                        t('community.icebreaker3'),
                      ].map((ice, i) => (
                        <button
                          key={i}
                          type="button"
                          className="icebreaker-btn"
                          onClick={() => setConnectMessage(ice)}
                        >
                          💡 "{ice}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input Textarea */}
                  <div className="connect-field-group">
                    <label htmlFor="connect-msg" className="connect-label">
                      {t('community.messageLabel')}
                    </label>
                    <textarea
                      id="connect-msg"
                      className="connect-textarea"
                      placeholder={t('community.messagePlaceholder')}
                      value={connectMessage}
                      onChange={(e) => setConnectMessage(e.target.value)}
                      required
                    />
                  </div>

                  {/* Privacy Guarantee Note */}
                  <div className="connect-privacy-note">
                    <span aria-hidden="true">🔒</span>
                    <span>{t('community.privacyGuarantee')}</span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="connect-modal-footer">
                  <button
                    type="button"
                    className="connect-btn-cancel"
                    onClick={handleCloseModal}
                  >
                    {t('community.closeModal')}
                  </button>
                  <button
                    type="submit"
                    className="connect-btn-submit"
                    disabled={sendingConnect || !connectMessage.trim()}
                  >
                    {sendingConnect ? t('community.sendingRequest') : t('community.sendRequestBtn')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`profile-toast ${toast.type}`}
            style={{
              position: 'fixed',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1100,
              padding: '12px 24px',
              borderRadius: 10,
              background: toast.type === 'error' ? 'var(--error)' : 'var(--primary)',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              fontSize: 14,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {toast.message}
          </div>
        )}
      </div>
    </main>
  );
}
