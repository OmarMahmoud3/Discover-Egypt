import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * AdminHeader — Top navigation bar with breadcrumbs, profile, and mobile toggle.
 */
export default function AdminHeader({ title, breadcrumbs, onToggleSidebar }) {
  const { session, profile } = useAdminAuth();
  const { toggleLanguage, lang } = useLanguage();

  const displayName =
    profile?.display_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split('@')[0] ||
    '';

  const avatarUrl = profile?.avatar_url || session?.user?.user_metadata?.avatar_url;

  return (
    <header className="admin-header">
      <div className="admin-header-start">
        {/* Mobile sidebar toggle */}
        <button
          className="admin-mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
        </button>

        <div>
          <h1 className="admin-header-title">{title}</h1>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="admin-breadcrumb">
              {breadcrumbs.map((crumb, i) => {
                const target = crumb.to || crumb.path;
                return (
                  <span key={i}>
                    {target ? (
                      <Link to={target}>{crumb.label}</Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && (
                      <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="admin-header-end">
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="admin-btn-icon"
          title={lang === 'ar' ? 'English' : 'العربية'}
          style={{ border: '1px solid var(--border)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>translate</span>
        </button>

        {/* Admin profile */}
        <div className="admin-header-profile">
          <div className="admin-header-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
            )}
          </div>
          <span className="admin-profile-name">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
