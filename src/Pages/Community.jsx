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
  fetchIncomingRequests,
  fetchOutgoingRequests,
  respondToConnectionRequest,
  fetchConversations,
  getOrCreateConversation,
  subscribeToRequests,
} from '../lib/communityService';
import ChatDrawer from '../Components/ChatDrawer';
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

  // Primary Community Tab: 'explorers' | 'requests' | 'conversations'
  const [activeTab, setActiveTab] = useState('explorers');
  const [requestsSubTab, setRequestsSubTab] = useState('incoming'); // 'incoming' | 'outgoing'

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [onlyShared, setOnlyShared] = useState(false);

  // Data states
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [respondingId, setRespondingId] = useState(null);

  // Safe Connect Modal states
  const [connectModalUser, setConnectModalUser] = useState(null);
  const [connectPurpose, setConnectPurpose] = useState('travel_buddy');
  const [connectMessage, setConnectMessage] = useState('');
  const [sendingConnect, setSendingConnect] = useState(false);
  const [toast, setToast] = useState(null);

  // Active Chat states
  const [activeChat, setActiveChat] = useState(null); // { otherUser, conversationId }
  const [chatOpen, setChatOpen] = useState(false);

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

  // Load requests and conversations
  const loadRequestsAndConversations = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const [incoming, outgoing, convs] = await Promise.all([
        fetchIncomingRequests(session.user.id),
        fetchOutgoingRequests(session.user.id),
        fetchConversations(session.user.id),
      ]);
      setIncomingRequests(incoming || []);
      setOutgoingRequests(outgoing || []);
      setConversations(convs || []);
    } catch (err) {
      console.warn('Error loading requests/conversations:', err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    loadRequestsAndConversations();
    if (session?.user?.id) {
      const unsub = subscribeToRequests(session.user.id, () => {
        loadRequestsAndConversations();
        loadProfiles();
      });
      return unsub;
    }
  }, [session?.user?.id, loadRequestsAndConversations, loadProfiles]);

  // Instant in-memory real-time filtering as user types or toggles chips
  const profiles = useMemo(() => {
    return filterCommunityProfiles(allProfiles, {
      search,
      selectedInterest,
      selectedCity,
      onlyShared,
    });
  }, [allProfiles, search, selectedInterest, selectedCity, onlyShared]);

  // Maps of connection states for fast card status lookup
  const outgoingRequestsMap = useMemo(() => {
    const map = new Map();
    outgoingRequests.forEach((r) => map.set(r.receiver_id, r));
    return map;
  }, [outgoingRequests]);

  const acceptedConversationsMap = useMemo(() => {
    const map = new Map();
    conversations.forEach((c) => {
      const otherId = c.participant1_id === session?.user?.id ? c.participant2_id : c.participant1_id;
      map.set(otherId, c);
    });
    return map;
  }, [conversations, session?.user?.id]);

  const pendingIncomingCount = useMemo(() => {
    return incomingRequests.filter((r) => r.status === 'pending').length;
  }, [incomingRequests]);

  // Open Safe Connect Modal
  const handleOpenConnect = (explorer) => {
    if (!session) {
      showToast(t('community.guestNotice'), 'info');
      return;
    }

    setConnectModalUser(explorer);
    setConnectPurpose('travel_buddy');

    const primaryInterest = explorer.sharedInterests?.[0] || explorer.interests?.[0] || (isArabic ? 'معالم مصر' : 'Egyptian heritage');
    const defaultMsg = isArabic
      ? `مرحباً ${explorer.displayNameLocalized || explorer.display_name}، لاحظت اهتمامك المشترك بـ ${primaryInterest} وأود التواصل لتبادل المعرفة والتخطيط للزيارات.`
      : `Hello ${explorer.displayNameLocalized || explorer.display_name}, I noticed your interest in ${primaryInterest} and would love to connect to exchange travel insights.`;
    setConnectMessage(defaultMsg);
  };

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
        purpose: connectPurpose,
        message: connectMessage.trim(),
        sharedInterests: connectModalUser.sharedInterests || [],
      });

      if (res.success) {
        showToast(t('community.requestSentSuccess'), 'success');
        handleCloseModal();
        loadRequestsAndConversations();
      } else if (res.alreadyPending) {
        showToast(t('community.requestAlreadyPending'), 'info');
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

  // Accept Connection Request
  const handleAcceptRequest = async (request) => {
    if (!session?.user?.id || respondingId) return;
    setRespondingId(request.id);

    try {
      const res = await respondToConnectionRequest({
        requestId: request.id,
        status: 'accepted',
        currentUserId: session.user.id,
      });

      if (res.success) {
        showToast(t('community.requestAccepted'), 'success');
        await loadRequestsAndConversations();

        // Open chat immediately with the sender
        if (res.conversation) {
          setActiveChat({
            otherUser: request.sender,
            conversationId: res.conversation.id,
          });
          setChatOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setRespondingId(null);
    }
  };

  // Reject Connection Request
  const handleRejectRequest = async (request) => {
    if (!session?.user?.id || respondingId) return;
    setRespondingId(request.id);

    try {
      const res = await respondToConnectionRequest({
        requestId: request.id,
        status: 'rejected',
        currentUserId: session.user.id,
      });

      if (res.success) {
        showToast(t('community.requestRejected'), 'info');
        loadRequestsAndConversations();
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
    } finally {
      setRespondingId(null);
    }
  };

  // Open Chat Drawer with a user
  const handleOpenChat = async (otherUser, conversationId = null) => {
    if (!session?.user?.id || !otherUser) return;

    if (conversationId) {
      setActiveChat({ otherUser, conversationId });
      setChatOpen(true);
      return;
    }

    try {
      const conv = await getOrCreateConversation({
        user1Id: session.user.id,
        user2Id: otherUser.id,
      });
      if (conv?.id) {
        setActiveChat({ otherUser, conversationId: conv.id });
        setChatOpen(true);
      }
    } catch (e) {
      console.error('Could not get/create conversation:', e);
    }
  };

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

  const getPurposeLabel = (purpose) => {
    switch (purpose) {
      case 'travel_buddy':
        return t('community.connectionTypeTravelBuddy');
      case 'advice':
        return t('community.connectionTypeAdvice');
      case 'cultural':
        return t('community.connectionTypeCultural');
      case 'general':
      default:
        return t('community.connectionTypeGeneral');
    }
  };

  return (
    <main className="community-page-container" id="community-page">
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

        {/* Primary Community Tabs: Explorers / Requests / Conversations */}
        <nav className="community-nav-tabs" aria-label="Community Sections">
          <button
            type="button"
            className={`community-tab-btn ${activeTab === 'explorers' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorers')}
          >
            <span aria-hidden="true">🧭</span>
            <span>{t('community.tabExplorers')}</span>
          </button>

          {session && (
            <>
              <button
                type="button"
                className={`community-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('requests');
                  loadRequestsAndConversations();
                }}
              >
                <span aria-hidden="true">📬</span>
                <span>{t('community.tabRequests')}</span>
                {pendingIncomingCount > 0 && (
                  <span className="community-tab-badge">{pendingIncomingCount}</span>
                )}
              </button>

              <button
                type="button"
                className={`community-tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('conversations');
                  loadRequestsAndConversations();
                }}
              >
                <span aria-hidden="true">💬</span>
                <span>{t('community.tabConversations')}</span>
                {conversations.length > 0 && (
                  <span className="community-tab-badge">{conversations.length}</span>
                )}
              </button>
            </>
          )}
        </nav>

        {/* --- TAB 1: EXPLORERS DIRECTORY --- */}
        {activeTab === 'explorers' && (
          <>
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
                    className={`community-chip-btn ${onlyShared ? 'active' : ''}`}
                    onClick={() => {
                      setOnlyShared(!onlyShared);
                      setSelectedInterest('all');
                    }}
                  >
                    ⭐ {t('community.filterSharedOnly')}
                  </button>
                )}

                {CURATED_INTERESTS.map((interest) => {
                  const label = isArabic ? interest.labelAr : interest.labelEn;
                  const isActive = selectedInterest === label;

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
                  const outgoingReq = outgoingRequestsMap.get(explorer.id);
                  const isAccepted = outgoingReq?.status === 'accepted' || acceptedConversationsMap.has(explorer.id);
                  const isPending = outgoingReq?.status === 'pending';
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

                        {isAccepted ? (
                          <button
                            type="button"
                            className="explorer-connect-btn connected"
                            onClick={() => handleOpenChat(explorer, acceptedConversationsMap.get(explorer.id)?.id)}
                          >
                            <span aria-hidden="true">💬</span>
                            <span>{t('community.openChat')}</span>
                          </button>
                        ) : isPending ? (
                          <button
                            type="button"
                            className="explorer-connect-btn connected"
                            disabled
                          >
                            <span aria-hidden="true">⏳</span>
                            <span>{t('community.statusPending')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="explorer-connect-btn"
                            onClick={() => handleOpenConnect(explorer)}
                            aria-label={`${t('community.connectBtn')} with ${explorer.displayNameLocalized || explorer.display_name}`}
                          >
                            <span aria-hidden="true">💬</span>
                            <span>{t('community.connectBtn')}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* --- TAB 2: CONNECTION REQUESTS --- */}
        {activeTab === 'requests' && session && (
          <section className="community-requests-view">
            <div className="community-sub-tabs">
              <button
                type="button"
                className={`community-sub-tab-btn ${requestsSubTab === 'incoming' ? 'active' : ''}`}
                onClick={() => setRequestsSubTab('incoming')}
              >
                📬 {t('community.incomingRequests')} ({pendingIncomingCount})
              </button>
              <button
                type="button"
                className={`community-sub-tab-btn ${requestsSubTab === 'outgoing' ? 'active' : ''}`}
                onClick={() => setRequestsSubTab('outgoing')}
              >
                📤 {t('community.outgoingRequests')} ({outgoingRequests.length})
              </button>
            </div>

            {requestsSubTab === 'incoming' ? (
              incomingRequests.length === 0 ? (
                <div className="community-empty-card">
                  <div className="community-empty-icon">📬</div>
                  <h2>{t('community.noIncomingRequests')}</h2>
                </div>
              ) : (
                <div className="requests-grid">
                  {incomingRequests.map((req) => (
                    <article key={req.id} className="request-card">
                      <div className="request-card-header">
                        <div className="request-avatar">
                          {renderAvatar(req.sender?.avatar_url)}
                        </div>
                        <div className="request-user-info">
                          <h3 className="request-user-name">
                            {req.sender?.display_name || 'مستكشف'}
                          </h3>
                          <p className="request-user-subtitle">
                            {req.sender?.city || req.sender?.bio || 'عاشق لتاريخ مصر'}
                          </p>
                        </div>
                      </div>

                      <div className="request-purpose-badge">
                        <span>🎯 {getPurposeLabel(req.purpose)}</span>
                      </div>

                      <div className="request-message-box">
                        "{req.message}"
                      </div>

                      {req.status === 'pending' ? (
                        <div className="request-actions">
                          <button
                            type="button"
                            className="accept-btn"
                            disabled={respondingId === req.id}
                            onClick={() => handleAcceptRequest(req)}
                          >
                            ✓ {t('community.acceptRequest')}
                          </button>
                          <button
                            type="button"
                            className="reject-btn"
                            disabled={respondingId === req.id}
                            onClick={() => handleRejectRequest(req)}
                          >
                            ✕ {t('community.rejectRequest')}
                          </button>
                        </div>
                      ) : (
                        <div className="request-actions">
                          <span className={`status-pill ${req.status}`}>
                            {req.status === 'accepted' ? `✓ ${t('community.statusAccepted')}` : `✕ ${t('community.statusRejected')}`}
                          </span>
                          {req.status === 'accepted' && (
                            <button
                              type="button"
                              className="community-action-btn primary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleOpenChat(req.sender)}
                            >
                              💬 {t('community.openChat')}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            ) : (
              outgoingRequests.length === 0 ? (
                <div className="community-empty-card">
                  <div className="community-empty-icon">📤</div>
                  <h2>{t('community.noOutgoingRequests')}</h2>
                </div>
              ) : (
                <div className="requests-grid">
                  {outgoingRequests.map((req) => (
                    <article key={req.id} className="request-card">
                      <div className="request-card-header">
                        <div className="request-avatar">
                          {renderAvatar(req.receiver?.avatar_url)}
                        </div>
                        <div className="request-user-info">
                          <h3 className="request-user-name">
                            {req.receiver?.display_name || 'مستكشف'}
                          </h3>
                          <p className="request-user-subtitle">
                            {req.receiver?.city || 'مستكشف معتمد'}
                          </p>
                        </div>
                        <span className={`status-pill ${req.status}`}>
                          {req.status === 'accepted' && `✓ ${t('community.statusAccepted')}`}
                          {req.status === 'pending' && `⏳ ${t('community.statusPending')}`}
                          {req.status === 'rejected' && `✕ ${t('community.statusRejected')}`}
                        </span>
                      </div>

                      <div className="request-purpose-badge">
                        <span>🎯 {getPurposeLabel(req.purpose)}</span>
                      </div>

                      <div className="request-message-box">
                        "{req.message}"
                      </div>

                      {req.status === 'accepted' && (
                        <div className="request-actions">
                          <button
                            type="button"
                            className="accept-btn"
                            onClick={() => handleOpenChat(req.receiver)}
                          >
                            💬 {t('community.openChat')}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            )}
          </section>
        )}

        {/* --- TAB 3: CONVERSATIONS & CHATS --- */}
        {activeTab === 'conversations' && session && (
          <section className="community-conversations-view">
            {conversations.length === 0 ? (
              <div className="community-empty-card">
                <div className="community-empty-icon">💬</div>
                <h2>{t('community.noConversations')}</h2>
              </div>
            ) : (
              <div className="conversations-grid">
                {conversations.map((c) => (
                  <article key={c.id} className="conversation-card">
                    <div className="conversation-card-header">
                      <div className="conversation-avatar">
                        {renderAvatar(c.otherUser?.avatar_url)}
                      </div>
                      <div className="conversation-user-info">
                        <h3 className="conversation-user-name">
                          {c.otherUser?.display_name || 'مستكشف مصري'}
                        </h3>
                        <p className="conversation-user-subtitle">
                          {c.otherUser?.city || 'نشط في مجتمع اكتشف مصر'}
                        </p>
                      </div>
                    </div>

                    <div className="request-message-box">
                      {c.last_message_text || (isArabic ? 'بدء المحادثة...' : 'Conversation started...')}
                    </div>

                    <button
                      type="button"
                      className="accept-btn"
                      onClick={() => handleOpenChat(c.otherUser, c.id)}
                    >
                      💬 {t('community.openChat')}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
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

              <form onSubmit={handleSubmitConnect} className="connect-modal-form">
                {/* Connection Purpose */}
                <div className="connect-form-group">
                  <label className="connect-label">{t('community.connectionTypeLabel')}</label>
                  <div className="connect-purpose-options">
                    {[
                      { id: 'travel_buddy', icon: '🧭', label: t('community.connectionTypeTravelBuddy') },
                      { id: 'advice', icon: '💡', label: t('community.connectionTypeAdvice') },
                      { id: 'cultural', icon: '🏛️', label: t('community.connectionTypeCultural') },
                      { id: 'general', icon: '🤝', label: t('community.connectionTypeGeneral') },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`connect-purpose-btn ${connectPurpose === opt.id ? 'active' : ''}`}
                        onClick={() => setConnectPurpose(opt.id)}
                      >
                        <span aria-hidden="true">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icebreaker Suggestions */}
                <div className="connect-form-group">
                  <label className="connect-label">{t('community.icebreakerPrompt')}</label>
                  <div className="icebreakers-row">
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
                        className="icebreaker-chip"
                        onClick={() => setConnectMessage(ice)}
                      >
                        "{ice}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message input */}
                <div className="connect-form-group">
                  <label htmlFor="connect-msg" className="connect-label">
                    {t('community.messageLabel')}
                  </label>
                  <textarea
                    id="connect-msg"
                    rows={4}
                    className="connect-textarea"
                    value={connectMessage}
                    onChange={(e) => setConnectMessage(e.target.value)}
                    placeholder={t('community.messagePlaceholder')}
                    required
                  />
                </div>

                {/* Privacy Guarantee Banner */}
                <div className="connect-privacy-note">
                  <span>{t('community.privacyGuarantee')}</span>
                </div>

                {/* Modal Footer Actions */}
                <div className="connect-modal-actions">
                  <button
                    type="button"
                    className="community-action-btn secondary"
                    onClick={handleCloseModal}
                  >
                    {t('community.closeModal')}
                  </button>
                  <button
                    type="submit"
                    className="community-action-btn primary"
                    disabled={sendingConnect || !connectMessage.trim()}
                  >
                    {sendingConnect ? t('community.sendingRequest') : t('community.sendRequestBtn')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Real-time Interactive Chat Drawer */}
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          currentUser={{
            id: session?.user?.id,
            name: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'مستكشف',
          }}
          otherUser={activeChat?.otherUser}
          conversationId={activeChat?.conversationId}
        />

        {/* Global Toast Notification */}
        {toast && (
          <div className={`community-toast ${toast.type}`} role="status">
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </main>
  );
}
