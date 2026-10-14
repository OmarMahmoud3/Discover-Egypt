/**
 * ConfirmDialog — Reusable confirmation modal for destructive actions.
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
  if (!open) return null;

  const iconMap = {
    danger: { icon: 'delete_forever', bg: 'var(--error-bg)', color: 'var(--error)' },
    warning: { icon: 'warning', bg: '#FEF3C7', color: '#92400E' },
    info: { icon: 'info', bg: 'var(--secondary-surface)', color: 'var(--secondary)' },
  };

  const v = iconMap[variant] || iconMap.danger;

  return (
    <div className="admin-dialog-overlay" onClick={onCancel}>
      <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-dialog-icon" style={{ background: v.bg }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: v.color }}>
            {v.icon}
          </span>
        </div>
        <h3 className="admin-dialog-title">{title}</h3>
        <p className="admin-dialog-message">{message}</p>
        <div className="admin-dialog-actions">
          <button
            className="admin-btn admin-btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel || 'إلغاء'}
          </button>
          <button
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
