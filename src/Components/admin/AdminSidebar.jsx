import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import BrandLogo from '../BrandLogo';

/**
 * AdminSidebar — Persistent navigation sidebar for the admin dashboard.
 * - Highlights active section
 * - Responsive: drawer on mobile
 * - RTL-aware
 */
export default function AdminSidebar({ open, onClose }) {
  const location = useLocation();
  const { handleLogout } = useAdminAuth();
  const { ta } = useAdminTranslation();

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/admin', icon: 'dashboard', label: ta('admin.dashboard'), exact: true },
    { path: '/admin/places', icon: 'location_on', label: ta('admin.places') },
    { path: '/admin/places/new', icon: 'add_location_alt', label: ta('admin.addPlace') },
    { path: '/admin/users', icon: 'group', label: ta('admin.users') },
    { path: '/admin/settings', icon: 'settings', label: ta('admin.settings') },
  ];

  const onLogout = async () => {
    await handleLogout();
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`admin-sidebar-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        {/* Brand */}
        <div className="admin-sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/admin" onClick={onClose} style={{ textDecoration: 'none' }}>
              <BrandLogo size="small" />
            </Link>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="admin-mobile-toggle"
              style={{ display: open ? 'flex' : undefined }}
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
          </div>
          <div
            style={{
              marginTop: '10px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {ta('admin.adminPanel')}
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav">
          <div className="admin-sidebar-section-label">{ta('admin.management')}</div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`admin-sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-section-label">{ta('admin.system')}</div>
          <Link to="/" onClick={onClose} className="admin-sidebar-link">
            <span className="material-symbols-outlined">language</span>
            <span>{ta('admin.backToSite')}</span>
          </Link>
          <button onClick={onLogout} className="admin-sidebar-link danger">
            <span className="material-symbols-outlined">logout</span>
            <span>{ta('admin.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
