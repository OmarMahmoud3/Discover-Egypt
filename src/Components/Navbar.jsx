import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import SearchModal from './SearchModal';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Navbar({ session, onOpenAuth }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { favoriteIds } = useFavorites();
  const { lang, dir, toggleLanguage, setLanguage, t } = useLanguage();
  const { isAdmin } = useAdminAuth();

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const navLinks = [
    { path: '/', label: t('nav.home'), icon: 'home' },
    { path: '/explore', label: t('nav.explore'), icon: 'explore' },
    { path: '/places/giza-pyramids', label: t('nav.details'), icon: 'visibility' },
    { path: '/favorites', label: t('nav.favorites'), icon: 'favorite', badge: favoriteIds.length },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const displayName = session
    ? session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email?.split('@')[0] ||
      t('nav.guest')
    : t('nav.login');

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(18, 48, 74, 0.08)',
          boxShadow: '0 2px 14px rgba(18, 48, 74, 0.04)',
        }}
      >
        <div
          className="container header-inner"
          style={{
            height: '70px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Menu Toggle & Brand Logo */}
          <div className="brand-shell" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flexShrink: 1 }}>
            <button
              onClick={() => setDrawerOpen(true)}
              className="mobile-menu-btn"
              aria-label={t('nav.menu')}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '12px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface-low)',
                color: 'var(--primary)',
                touchAction: 'manipulation',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                menu
              </span>
            </button>

            <Link to="/" style={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
              <BrandLogo size="medium" />
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: active ? '700' : '600',
                    color: active ? 'var(--secondary)' : 'var(--primary)',
                    backgroundColor: active ? 'var(--secondary-surface)' : 'transparent',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <span
                    className={`material-symbols-outlined ${active ? 'material-filled' : ''}`}
                    style={{ fontSize: '20px' }}
                  >
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                  {typeof link.badge === 'number' && link.badge > 0 && (
                    <span
                      style={{
                        backgroundColor: 'var(--secondary)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: '700',
                        width: '20px',
                        height: '20px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginInlineStart: '4px',
                      }}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {session && isAdmin && (
              <Link
                to="/admin"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#B8860B',
                  backgroundColor: 'rgba(212, 166, 74, 0.12)',
                  border: '1px solid rgba(212, 166, 74, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  admin_panel_settings
                </span>
                <span>{lang === 'ar' ? 'لوحة التحكم' : 'Admin'}</span>
              </Link>
            )}
          </nav>

          {/* Controls: Search, Language Switcher & Profile */}
          <div className="nav-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t('nav.search')}
              className="nav-action-btn"
              style={{
                width: '42px',
                height: '42px',
                minWidth: '42px',
                minHeight: '42px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface-low)',
                color: 'var(--primary)',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-container)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-low)')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                search
              </span>
            </button>

            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="nav-language-btn"
              style={{
                height: '40px',
                minHeight: '40px',
                padding: '0 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--surface-low)',
                color: 'var(--primary)',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
                touchAction: 'manipulation',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-container)';
                e.currentTarget.style.borderColor = 'var(--secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-low)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title={t('nav.languageTitle')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>
                language
              </span>
              <span>{t('nav.languageSwitchLabel')}</span>
            </button>

            {/* Auth / Account Profile Button */}
            <button
              type="button"
              onClick={onOpenAuth}
              className="nav-account-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px 6px 10px',
                borderRadius: '14px',
                backgroundColor: session ? 'var(--secondary-surface)' : 'var(--primary)',
                color: session ? 'var(--secondary)' : '#FFFFFF',
                fontWeight: '700',
                fontSize: '14px',
                boxShadow: session ? 'none' : 'var(--shadow-sm)',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                minWidth: 0,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '9999px',
                  backgroundColor: session ? 'var(--secondary)' : 'var(--gold)',
                  color: session ? '#FFFFFF' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  person
                </span>
              </div>
              <span
                className="auth-label"
                style={{
                  maxWidth: '130px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session ? t('nav.greeting', { name: displayName }) : t('nav.login')}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(18, 48, 74, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        />
      )}

      {/* Mobile Drawer Aside */}
      <aside
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        aria-haspopup="dialog"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closeDrawer();
          }
        }}
        style={{
          position: 'fixed',
          top: 0,
          ...(dir === 'rtl' ? { right: 0 } : { left: 0 }),
          height: '100%',
          width: '85%',
          maxWidth: '320px',
          backgroundColor: '#FFFFFF',
          zIndex: 1001,
          boxShadow: dir === 'rtl' ? '-8px 0 32px rgba(18, 48, 74, 0.2)' : '8px 0 32px rgba(18, 48, 74, 0.2)',
          transform: drawerOpen ? 'translateX(0)' : dir === 'rtl' ? 'translateX(100%)' : 'translateX(-100%)',
          visibility: drawerOpen ? 'visible' : 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          overflowY: 'auto',
        }}
        aria-hidden={!drawerOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <BrandLogo size="small" />
          <button
            onClick={closeDrawer}
            aria-label={t('nav.closeDrawer')}
            title={t('nav.closeDrawer')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--surface-low)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Language Tabs in Drawer */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: 'var(--surface-low)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => setLanguage('ar')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: lang === 'ar' ? '#FFFFFF' : 'transparent',
              color: lang === 'ar' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: lang === 'ar' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            العربية
          </button>
          <button
            onClick={() => setLanguage('en')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: lang === 'en' ? '#FFFFFF' : 'transparent',
              color: lang === 'en' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: lang === 'en' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            English
          </button>
        </div>

        {/* Drawer Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={closeDrawer}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '16px',
                color: isActive(link.path) ? 'var(--secondary)' : 'var(--primary)',
                backgroundColor: isActive(link.path) ? 'var(--secondary-surface)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </div>
              {typeof link.badge === 'number' && link.badge > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
          {session && isAdmin && (
            <Link
              to="/admin"
              onClick={closeDrawer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '16px',
                color: '#B8860B',
                backgroundColor: 'rgba(212, 166, 74, 0.12)',
                marginTop: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#B8860B' }}>
                admin_panel_settings
              </span>
              <span>{lang === 'ar' ? 'لوحة التحكم الإدارية' : 'Admin Dashboard'}</span>
            </Link>
          )}
        </nav>

        {/* Drawer Footer Actions */}
        <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              closeDrawer();
              onOpenAuth();
            }}
            className="btn-primary"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            <span className="material-symbols-outlined">login</span>
            <span>{session ? t('nav.manageAccount') : t('nav.login')}</span>
          </button>
        </div>
      </aside>

      {/* Global Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
