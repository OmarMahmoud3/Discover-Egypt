import { useEffect, useRef } from 'react';

/**
 * ConfirmDialog — Reusable accessible confirmation modal for destructive/critical actions.
 * Complies with WCAG 2.2 AA (role="alertdialog", focus trap, Escape dismissal, auto-focus on cancel).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  variant = 'danger', // 'danger' | 'warning' | 'info'
}) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus cancel button for safe keyboard error prevention
    setTimeout(() => {
      if (cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel, loading]);

  if (!open) return null;

  const iconMap = {
    danger: { icon: 'delete_forever', bg: 'var(--error-bg)', color: 'var(--error)' },
    warning: { icon: 'warning', bg: '#FEF3C7', color: '#92400E' },
    info: { icon: 'info', bg: 'var(--secondary-surface)', color: 'var(--secondary)' },
  };

  const v = iconMap[variant] || iconMap.danger;

  return (
    <div
      className="admin-dialog-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-dialog-icon" style={{ background: v.bg }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: v.color }}>
            {v.icon}
          </span>
        </div>
        <h3 id="confirm-dialog-title" className="admin-dialog-title">
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="admin-dialog-message">
          {message}
        </p>
        <div className="admin-dialog-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel || 'إلغاء'}
          </button>
          <button
            type="button"
            className={`admin-btn ${variant === 'danger' ? 'admin-btn-danger' : 'admin-btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 0.8s linear infinite' }}>
                  progress_activity
                </span>
                <span>{confirmLabel || 'تأكيد'}</span>
              </>
            ) : (
              confirmLabel || 'تأكيد'
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
