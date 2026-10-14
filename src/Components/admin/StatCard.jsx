/**
 * StatCard — Dashboard summary stat card with icon, value, and label.
 */
export default function StatCard({ icon, value, label, color, bgColor, loading = false }) {
  if (loading) {
    return (
      <div className="admin-stat-card">
        <div className="admin-skeleton admin-skeleton-stat" style={{ width: '100%', height: '72px' }} />
      </div>
    );
  }

  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: bgColor || 'var(--surface-low)' }}>
        <span className="material-symbols-outlined" style={{ color: color || 'var(--secondary)' }}>
          {icon}
        </span>
      </div>
      <div className="admin-stat-info">
        <div className="admin-stat-value">{value ?? '—'}</div>
        <div className="admin-stat-label">{label}</div>
      </div>
    </div>
  );
}
