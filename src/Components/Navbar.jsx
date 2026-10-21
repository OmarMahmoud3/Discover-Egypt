import { useState, useEffect, useRef, useCallback } from 'react';
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
  const { lang, dir, toggleLanguage, setLanguage, t, isArabic } = useLanguage();
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

  const menuTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);

  const handleOpenDrawer = (e) => {
    menuTriggerRef.current = e.currentTarget;
    setDrawerOpen(true);
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    if (menuTriggerRef.current && typeof menuTriggerRef.current.focus === 'function') {
      menuTriggerRef.current.focus();
    }
  }, []);

  const navLinks = [
    { path: '/', label: t('nav.home'), icon: 'home' },
    { path: '/explore', label: t('nav.explore'), icon: 'explore' },
    { path: '/map', label: t('nav.map'), icon: 'map' },
    { path: '/favorites', label: t('nav.favorites'), icon: 'bookmark', badge: Array.isArray(favoriteIds) ? favoriteIds.length : 0 },
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
      {/* Editorial Masthead Top Announcement Bar */}
      <div
        className="masthead-topbar"
        style={{
          backgroundColor: 'var(--primary-dark)',
          color: 'var(--beige)',
          fontSize: '12px',
          padding: '6px 0',
          borderBottom: '1px solid rgba(212, 166, 74, 0.35)',
        }}
      >
        <div
          className="container masthead-topbar-inner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            letterSpacing: '0.02em',
          }}
        >
          <div className="masthead-tagline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--gold)' }}>☥</span>
            <span style={{ fontWeight: 600 }}>{t('brand.tagline') || 'تاريخ يُروى، وتجارب تُكتشف'}</span>
          </div>
          <div
            className="masthead-curation-note"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '11px',
              color: 'var(--beige-dark)',
            }}
          >
            <span>{isArabic ? 'بوابة التراث والسياحة المصرية' : 'Egyptian Heritage & Travel Monograph'}</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
              {isArabic ? 'إصدار موثق' : 'Curated Edition'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="container header-inner"
          style={{
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Menu Toggle & Brand Logo */}
          <div className="brand-shell" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flexShrink: 1 }}>
            <button
              ref={menuTriggerRef}
              onClick={handleOpenDrawer}
              className="mobile-menu-btn"
              aria-label={t('nav.menu')}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              style={{
                width: '42px',
                height: '42px',
                minWidth: '42px',
                minHeight: '42px',
                borderRadius: 'var(--radius-md)',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface-low)',
                color: 'var(--primary)',
                border: '1px solid var(--border)',
                touchAction: 'manipulation',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                menu
              </span>
            </button>

            <Link to="/" style={{ display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
              <BrandLogo size="medium" />
            </Link>
          </div>

          {/* Center: Editorial Desktop Navigation Links */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    padding: '8px 14px',
                    fontSize: '14px',
                    fontWeight: active ? '700' : '600',
                    color: active ? 'var(--secondary)' : 'var(--primary)',
                    position: 'relative',
                    transition: 'color 0.2s ease',
                    borderBottom: active ? '2px solid var(--secondary)' : '2px solid transparent',
                  }}
                >
                  <span
                    className={`material-symbols-outlined ${active ? 'material-filled' : ''}`}
                    style={{ fontSize: '18px' }}
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
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        marginInlineStart: '2px',
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
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  backgroundColor: 'var(--gold-surface)',
                  border: '1px solid var(--gold)',
                  marginInlineStart: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: 'var(--gold-dark)' }}>
                  admin_panel_settings
                </span>
                <span>{lang === 'ar' ? 'لوحة التحرير' : 'Editorial Desk'}</span>
              </Link>
            )}
          </nav>

          {/* Controls: Search, Language Switcher & Profile */}
          <div className="nav-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Search Trigger */}
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t('nav.search')}
              className="nav-action-btn"
              style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface)',
                color: 'var(--primary)',
                border: '1px solid var(--border)',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-low)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                search
              </span>
            </button>

            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="nav-language-btn"
              style={{
                height: '38px',
                minHeight: '38px',
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
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
                e.currentTarget.style.backgroundColor = 'var(--surface-low)';
                e.currentTarget.style.borderColor = 'var(--secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title={t('nav.languageTitle')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>
                translate
              </span>
              <span>{t('nav.languageSwitchLabel')}</span>
            </button>

            {/* Auth / Account Profile Button */}
            {session ? (
              <Link
                to="/profile"
                className="nav-account-btn"
                title={t('nav.manageAccount')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: location.pathname.startsWith('/profile') || location.pathname.startsWith('/account') ? 'var(--secondary)' : 'var(--secondary-surface)',
                  color: location.pathname.startsWith('/profile') || location.pathname.startsWith('/account') ? '#FFFFFF' : 'var(--secondary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: location.pathname.startsWith('/profile') || location.pathname.startsWith('/account') ? '1px solid var(--secondary-dark)' : '1px solid rgba(15, 118, 110, 0.3)',
                  transition: 'all 0.2s',
                  touchAction: 'manipulation',
                  minWidth: 0,
                  flexShrink: 0,
                  textDecoration: 'none',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '18px',
                    color: location.pathname.startsWith('/profile') || location.pathname.startsWith('/account') ? '#FFFFFF' : 'var(--secondary)',
                  }}
                >
                  account_circle
                </span>
                <span
                  className="auth-label"
                  style={{
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('nav.greeting', { name: displayName })}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="nav-account-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: '1px solid var(--primary-dark)',
                  transition: 'all 0.2s',
                  touchAction: 'manipulation',
                  minWidth: 0,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--gold)' }}>
                  account_circle
                </span>
                <span className="auth-label">
                  {t('nav.login')}
                </span>
              </button>
            )}
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
            backgroundColor: 'rgba(18, 48, 74, 0.55)',
            backdropFilter: 'blur(3px)',
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
          bottom: 0,
          ...(dir === 'rtl' ? { right: 0 } : { left: 0 }),
          height: '100%',
          width: 'min(85vw, 320px)',
          maxWidth: '320px',
          backgroundColor: '#FFFFFF',
          zIndex: 1001,
          borderLeft: dir === 'rtl' ? 'none' : '1px solid var(--border)',
          borderRight: dir === 'rtl' ? '1px solid var(--border)' : 'none',
          boxShadow: dir === 'rtl' ? '-6px 0 24px rgba(18, 48, 74, 0.15)' : '6px 0 24px rgba(18, 48, 74, 0.15)',
          display: drawerOpen ? 'flex' : 'none',
          flexDirection: 'column',
          padding: '24px 20px',
          overflowY: 'auto',
          animation: drawerOpen
            ? dir === 'rtl'
              ? 'drawerSlideInRtl 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              : 'drawerSlideInLtr 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'none',
        }}
        aria-hidden={!drawerOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <BrandLogo size="small" />
          <button
            onClick={closeDrawer}
            aria-label={t('nav.closeDrawer')}
            title={t('nav.closeDrawer')}
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-low)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Brand Tagline in Drawer */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '2px' }}>
            {isArabic ? 'اكتشف مصر' : 'Discover Egypt'}
          </div>
          <div>{t('brand.tagline') || 'تاريخ يُروى، وتجارب تُكتشف'}</div>
        </div>

        {/* Language Tabs in Drawer */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: 'var(--surface-low)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => setLanguage('ar')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
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
              borderRadius: 'var(--radius-sm)',
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
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={closeDrawer}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '15px',
                color: isActive(link.path) ? 'var(--secondary)' : 'var(--primary)',
                backgroundColor: isActive(link.path) ? 'var(--secondary-surface)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </div>
              {typeof link.badge === 'number' && link.badge > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 7px',
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
                gap: '10px',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '15px',
                color: 'var(--primary)',
                backgroundColor: 'var(--gold-surface)',
                border: '1px solid var(--gold)',
                marginTop: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--gold-dark)' }}>
                admin_panel_settings
              </span>
              <span>{lang === 'ar' ? 'لوحة التحرير الإدارية' : 'Editorial Desk'}</span>
            </Link>
          )}
        </nav>

        {/* Drawer Footer Actions */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {session ? (
            <Link
              to="/profile"
              onClick={closeDrawer}
              className="btn-primary"
              style={{
                width: '100%',
                marginBottom: '10px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_circle</span>
              <span>{t('nav.manageAccount')}</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                closeDrawer();
                onOpenAuth();
              }}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '10px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
              <span>{t('nav.login')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          if (searchTriggerRef.current && typeof searchTriggerRef.current.focus === 'function') {
            searchTriggerRef.current.focus();
          }
        }}
      />
    </>
  );
}

