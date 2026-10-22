import { Link, useLocation } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function MobileNav({ onOpenAuth }) {
  const location = useLocation();
  const { favoriteIds } = useFavorites();
  const { t } = useLanguage();
  const { session } = useAdminAuth();

  const items = [
    { path: '/', label: t('mobile.home'), icon: 'home' },
    { path: '/explore', label: t('mobile.explore'), icon: 'explore' },
    { path: '/community', label: t('mobile.community'), icon: 'groups' },
    { path: '/map', label: t('mobile.map'), icon: 'map' },
    { path: '/favorites', label: t('mobile.favorites'), icon: 'favorite', hasBadge: favoriteIds.length > 0 },
    session
      ? { path: '/profile', label: t('mobile.profile'), icon: 'person' }
      : { action: onOpenAuth, label: t('mobile.profile'), icon: 'person' },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        insetInline: 0,
        zIndex: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(18, 48, 74, 0.08)',
        boxShadow: '0 -4px 20px rgba(18, 48, 74, 0.06)',
        display: 'none',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '62px',
          maxWidth: '520px',
          margin: '0 auto',
          paddingInline: '4px',
        }}
      >
        {items.map((item, index) => {
          const active = item.path
            ? (item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path) || (item.path === '/profile' && location.pathname.startsWith('/account')))
            : false;

          const content = (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '56px',
                width: '100%',
                minHeight: '44px',
                color: active ? 'var(--secondary)' : 'var(--text-muted)',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
              }}
            >
              <div style={{ position: 'relative' }}>
                <span
                  className={`material-symbols-outlined ${active ? 'material-filled' : ''}`}
                  style={{ fontSize: '24px' }}
                >
                  {item.icon}
                </span>
                {item.hasBadge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      insetInlineEnd: '-2px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: 'var(--secondary)',
                      borderRadius: '9999px',
                      border: '2px solid #FFFFFF',
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: active ? '800' : '600',
                  marginTop: '2px',
                }}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.action) {
            return (
              <button
                key={index}
                type="button"
                onClick={item.action}
                aria-label={item.label}
                style={{
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={index}
              to={item.path}
              aria-label={item.label}
              style={{
                flex: 1,
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
