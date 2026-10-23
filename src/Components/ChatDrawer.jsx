import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchMessages, sendMessage, subscribeToMessages, HERITAGE_AVATARS_MAP, isUserLocallyBanned } from '../lib/communityService';
import { supabase } from '../lib/supabase';
import ReportModal from './ReportModal';

// Deduplicate and reconcile messages (handles optimistic updates and realtime race conditions)
function reconcileMessage(prevMessages, incoming) {
  if (!incoming || !incoming.id) return prevMessages;

  // 1. If message already exists by real id, ignore duplicate
  const existingExactIndex = prevMessages.findIndex((m) => m.id === incoming.id);
  if (existingExactIndex !== -1) {
    return prevMessages;
  }

  // 2. If incoming is a confirmed server message, check for matching pending optimistic message
  if (!incoming.is_pending) {
    const pendingIndex = prevMessages.findIndex(
      (m) =>
        m.is_pending &&
        m.sender_id === incoming.sender_id &&
        m.content === incoming.content
    );

    if (pendingIndex !== -1) {
      const next = [...prevMessages];
      next[pendingIndex] = incoming;
      return next;
    }
  }

  // 3. Otherwise append
  return [...prevMessages, incoming];
}

export default function ChatDrawer({
  isOpen,
  onClose,
  currentUser,
  otherUser,
  conversationId,
}) {
  const { t, isArabic } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(() => isUserLocallyBanned(currentUser?.id));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check if current user is banned
  useEffect(() => {
    if (!currentUser?.id) return;
    let mounted = true;

    // Check local registry first
    if (isUserLocallyBanned(currentUser.id)) {
      setIsBanned(true);
    }

    // Check database if column exists
    supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', currentUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (mounted && !error && data?.is_banned) {
          setIsBanned(true);
        }
      })
      .catch(() => {});

    // Listen to real-time ban events
    const handleBanChanged = (e) => {
      if (e.detail?.targetUserId === currentUser.id && mounted) {
        setIsBanned(Boolean(e.detail.isBanned));
      }
    };

    window.addEventListener('community:ban_status_changed', handleBanChanged);

    return () => {
      mounted = false;
      window.removeEventListener('community:ban_status_changed', handleBanChanged);
    };
  }, [currentUser?.id]);

  // Load message history when drawer opens or conversation changes
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    let isMounted = true;
    setLoading(true);
    setSendError(null);

    fetchMessages(conversationId)
      .then((data) => {
        if (isMounted) {
          setMessages((prev) => {
            const fetched = Array.isArray(data) ? data : [];
            const fetchedIds = new Set(fetched.map((m) => m.id));
            const pendingOrNew = prev.filter(
              (m) =>
                m.is_pending ||
                (!fetchedIds.has(m.id) &&
                  !fetched.some((f) => f.content === m.content && f.sender_id === m.sender_id))
            );
            return [...fetched, ...pendingOrNew];
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading messages:', err);
        if (isMounted) setLoading(false);
      });

    // Subscribe to incoming realtime messages
    const unsubscribe = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => reconcileMessage(prev, newMsg));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, conversationId]);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen || !otherUser) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || sending || !conversationId || !currentUser?.id) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
      is_pending: true,
    };

    setSending(true);
    setSendError(null);
    setInputText('');

    // Immediately display the optimistic message in the UI
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendMessage({
        conversationId,
        senderId: currentUser.id,
        content: text,
      });

      if (res?.data) {
        // Reconcile optimistic message with server data atomically
        setMessages((prev) => reconcileMessage(prev, res.data));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message on error and restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      setSendError(t('community.sendMessageError') || 'Failed to send message');
    } finally {
      setSending(false);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };


  const renderAvatar = (avatarUrl) => {
    if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
      return <img src={avatarUrl} alt="" className="chat-header-avatar-img" />;
    }
    const emoji = HERITAGE_AVATARS_MAP[avatarUrl] || '🏛️';
    return <span aria-hidden="true">{emoji}</span>;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const otherName = otherUser.display_name || (isArabic ? 'مستكشف' : 'Explorer');

  return (
    <div className="chat-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="chat-drawer-container"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="chat-drawer-header">
          <div className="chat-drawer-user-info">
            <div className="chat-drawer-avatar">
              {renderAvatar(otherUser.avatar_url)}
            </div>
            <div className="chat-drawer-user-text">
              <h3 className="chat-drawer-user-name">{otherName}</h3>
              <span className="chat-drawer-status">
                <span className="chat-status-dot" aria-hidden="true" />
                <span>{t('community.inAppSafeLabel')}</span>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="chat-drawer-report-btn"
              onClick={() => setReportModalOpen(true)}
              title={t('community.reportUser')}
              aria-label={t('community.reportUser')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#DC2626' }}>
                flag
              </span>
              <span className="chat-report-label">{t('community.reportUser')}</span>
            </button>
            <button
              type="button"
              className="chat-drawer-close-btn"
              onClick={onClose}
              aria-label={t('community.closeModal')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="chat-drawer-body">
          {loading && messages.length === 0 ? (
            <div className="chat-drawer-loading">
              <span className="chat-spinner" />
              <span>{isArabic ? 'جارٍ تحميل الرسائل...' : 'Loading messages...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-drawer-empty">
              <div className="chat-empty-icon">💬</div>
              <h4>{isArabic ? 'بداية المحادثة' : 'Start of conversation'}</h4>
              <p>
                {isArabic
                  ? `أنت ومستكشفنا ${otherName} على تواصل الآن! رحّب به وشاركه خطط سفرك وشغفك بمعالم مصر.`
                  : `You and ${otherName} are now connected! Say hello and share your travel plans.`}
              </p>
            </div>
          ) : (
            <div className="chat-messages-list">
              {messages.map((msg) => {
                const isMine = msg.sender_id === currentUser?.id;
                return (
                  <div
                    key={msg.id || msg.created_at}
                    className={`chat-message-row ${isMine ? 'mine' : 'theirs'}${msg.is_pending ? ' is-pending' : ''}`}
                    style={msg.is_pending ? { opacity: 0.75 } : undefined}
                  >
                    <div className="chat-bubble">
                      <p className="chat-bubble-text">{msg.content}</p>
                      <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Send Error Notice */}
        {sendError && (
          <div className="chat-send-error-bar" role="alert" style={{
            background: '#FFEBEE',
            color: '#C62828',
            padding: '8px 16px',
            fontSize: '12px',
            borderTop: '1px solid #FFCDD2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>⚠️ {sendError}</span>
            <button
              type="button"
              onClick={() => setSendError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Bar or Banned Notice */}
        {isBanned ? (
          <div className="chat-banned-notice-bar" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#DC2626' }}>
              block
            </span>
            <span>{t('community.bannedNotice')}</span>
          </div>
        ) : (
          <form className="chat-drawer-footer" onSubmit={handleSend}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input-field"
              placeholder={t('community.typeMessage')}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (sendError) setSendError(null);
              }}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              disabled={sending}
              maxLength={1000}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!inputText.trim() || sending}
              aria-label={t('community.sendBtn')}
            >
              {sending ? (
                <span className="chat-send-spinner" />
              ) : (
                <span>{isArabic ? 'إرسال 🚀' : 'Send 🚀'}</span>
              )}
            </button>
          </form>
        )}

        {/* Report Modal */}
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          currentUser={currentUser}
          otherUser={otherUser}
          conversationId={conversationId}
          messages={messages}
        />
      </div>
    </div>
  );
}
