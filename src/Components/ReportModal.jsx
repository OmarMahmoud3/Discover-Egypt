import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { submitChatReport, REPORT_REASONS } from '../lib/communityService';

/**
 * ReportModal — Secure, privacy-conscious dialog for reporting chat violations.
 * Allows selecting specific offending messages as immutable evidence.
 */
export default function ReportModal({
  isOpen,
  onClose,
  currentUser,
  otherUser,
  conversationId,
  messages = [],
}) {
  const { t, isArabic } = useLanguage();

  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const modalRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('harassment');
      setDetails('');
      setSelectedMessageIds(new Set());
      setSubmitting(false);
      setSubmitted(false);
      setError('');
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !otherUser) return null;

  const otherName = otherUser.display_name || otherUser.name || (isArabic ? 'مستكشف' : 'Explorer');

  // Toggle selection of a message as evidence
  const handleToggleMessage = (msgId) => {
    if (!msgId || msgId.startsWith('temp-')) return;
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !currentUser?.id || !otherUser?.id || !conversationId) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await submitChatReport({
        reporterId: currentUser.id,
        reportedUserId: otherUser.id,
        conversationId,
        reason,
        details: details.trim(),
        messageIds: Array.from(selectedMessageIds),
      });

      if (res?.success) {
        setSubmitted(true);
      } else {
        setError(res?.error || t('community.reportError'));
      }
    } catch (err) {
      console.error('Report submission error:', err);
      setError(err?.message || t('community.reportError'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatMessageTime = (isoString) => {
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

  // Only show confirmed messages with valid IDs
  const validMessages = (messages || []).filter((m) => m && m.id && !m.is_pending);

  return (
    <div
      className="report-modal-overlay"
      onClick={() => {
        if (!submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        ref={modalRef}
        className="report-modal-container"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="report-modal-header">
          <div className="report-modal-header-icon" aria-hidden="true">
            🚩
          </div>
          <div className="report-modal-header-text">
            <h3 id="report-modal-title" className="report-modal-title">
              {t('community.reportUserTitle')}
            </h3>
            <span className="report-modal-subtitle">
              {t('community.reportUserSubtitle').replace('{name}', otherName)}
            </span>
          </div>
          <button
            type="button"
            className="report-modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('community.closeModal')}
          >
            ✕
          </button>
        </div>

        {/* Body: Form or Success Confirmation */}
        <div className="report-modal-body">
          {submitted ? (
            /* Confirmation View (Privacy-Safe & Assuring) */
            <div className="report-success-state">
              <div className="report-success-icon" aria-hidden="true">
                🛡️
              </div>
              <h4 className="report-success-title">{t('community.reportSuccessTitle')}</h4>
              <p className="report-success-desc">{t('community.reportSuccessDesc')}</p>
              <button
                type="button"
                className="report-success-btn"
                onClick={onClose}
              >
                {t('community.reportSuccessBtn')}
              </button>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="report-form">
              {error && (
                <div className="report-error-banner" role="alert">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Reason Selector */}
              <div className="report-form-group">
                <label htmlFor="report-reason-select" className="report-form-label">
                  {t('community.reportReasonLabel')} <span className="required-star">*</span>
                </label>
                <div className="report-reasons-grid">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`report-reason-card ${reason === r.id ? 'active' : ''}`}
                      onClick={() => setReason(r.id)}
                    >
                      <span className="report-reason-icon" aria-hidden="true">
                        {r.icon}
                      </span>
                      <span className="report-reason-text">
                        {isArabic ? r.labelAr : r.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Evidence Messages Selection */}
              <div className="report-form-group">
                <label className="report-form-label">
                  {t('community.reportEvidenceLabel')}
                </label>
                <p className="report-form-help">{t('community.reportEvidenceDesc')}</p>

                {validMessages.length === 0 ? (
                  <div className="report-evidence-empty">
                    <span>💬 {t('community.reportNoMessages')}</span>
                  </div>
                ) : (
                  <div className="report-evidence-list">
                    {validMessages.slice(-12).map((msg) => {
                      const isSelected = selectedMessageIds.has(msg.id);
                      const isSenderOther = msg.sender_id === otherUser.id;

                      return (
                        <div
                          key={msg.id}
                          className={`report-evidence-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleMessage(msg.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMessage(msg.id)}
                            className="report-evidence-checkbox"
                            aria-label={`Select message: ${msg.content.slice(0, 30)}`}
                          />
                          <div className="report-evidence-content">
                            <div className="report-evidence-meta">
                              <span className="report-evidence-author">
                                {isSenderOther ? otherName : (isArabic ? 'أنت' : 'You')}
                              </span>
                              <span className="report-evidence-time">
                                {formatMessageTime(msg.created_at)}
                              </span>
                            </div>
                            <p className="report-evidence-text">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Details */}
              <div className="report-form-group">
                <label htmlFor="report-details-input" className="report-form-label">
                  {t('community.reportDetailsLabel')}
                </label>
                <textarea
                  id="report-details-input"
                  rows={3}
                  className="report-textarea"
                  placeholder={t('community.reportDetailsPlaceholder')}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Privacy Notice */}
              <div className="report-privacy-banner">
                <span className="report-privacy-text">
                  {t('community.reportPrivacyNotice')}
                </span>
              </div>

              {/* Actions */}
              <div className="report-form-actions">
                <button
                  type="button"
                  className="report-btn report-btn-ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  {t('community.closeModal')}
                </button>
                <button
                  type="submit"
                  className="report-btn report-btn-danger"
                  disabled={submitting || !reason}
                >
                  {submitting ? (
                    <>
                      <span className="chat-send-spinner" />
                      <span>{t('community.submittingReport')}</span>
                    </>
                  ) : (
                    <>
                      <span>🚩</span>
                      <span>{t('community.submitReportBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
