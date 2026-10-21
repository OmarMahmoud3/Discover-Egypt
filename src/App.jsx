import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PlacesProvider } from './context/PlacesContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

import SkipLink from './Components/SkipLink';
import ScrollToTop from './Components/ScrollToTop';
import ErrorBoundary from './Components/ErrorBoundary';
import Navbar from './Components/Navbar';
import Footer from './Components/Footer';
import MobileNav from './Components/MobileNav';

import Home from './Pages/Home';

// Lazy-loaded Public pages to optimize initial bundle size
const Explore = lazy(() => import('./Pages/Explore'));
const MapPage = lazy(() => import('./Pages/MapPage'));
const PlaceDetails = lazy(() => import('./Pages/PlaceDetails'));
const Favorites = lazy(() => import('./Pages/Favorites'));
const Profile = lazy(() => import('./Pages/Profile'));
const LogIn = lazy(() => import('./Pages/LogIn'));
const NotFound = lazy(() => import('./Pages/NotFound'));

import AdminRoute from './Components/admin/AdminRoute';
import AdminLayout from './Components/admin/AdminLayout';

// Lazy-loaded Admin pages to optimize initial bundle size
const AdminDashboard = lazy(() => import('./Pages/admin/AdminDashboard'));
const AdminPlaces = lazy(() => import('./Pages/admin/AdminPlaces'));
const AdminPlaceEdit = lazy(() => import('./Pages/admin/AdminPlaceEdit'));
const AdminUsers = lazy(() => import('./Pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('./Pages/admin/AdminSettings'));

function AdminSuspenseFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--secondary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AppContent() {
  const { session, isAdmin, isReady } = useAdminAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { dir, lang, t } = useLanguage();

  const handleOpenAuth = (e) => {
    if (e && e.currentTarget) {
      triggerRef.current = e.currentTarget;
    } else {
      triggerRef.current = document.activeElement;
    }
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      triggerRef.current.focus();
    }
  };

  // Close on Escape key & manage scroll lock
  useEffect(() => {
    if (!authModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseAuth();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [authModalOpen]);

  // Only hide public chrome when authenticated and verified as admin
  const isAdminRoute = location.pathname.startsWith('/admin') && isReady && isAdmin;
  const isPlaceDetails = location.pathname.startsWith('/places/') || location.pathname.startsWith('/place/');

  return (
    <div
      dir={dir}
      data-lang={lang}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface)',
      }}
    >
      {/* Automatically scroll to top on page navigation */}
      <ScrollToTop />

      {/* Skip to Main Content Link for Keyboard / Assistive Tech */}
      {!isAdminRoute && <SkipLink targetId="main-content" />}

      {/* Navigation Bar — hidden on admin routes */}
      {!isAdminRoute && (
        <Navbar
          session={session}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* Main Content Landmark */}
      <main id="main-content" style={{ flex: 1, outline: 'none' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Suspense fallback={<AdminSuspenseFallback />}><Explore /></Suspense>} />
          <Route path="/map" element={<Suspense fallback={<AdminSuspenseFallback />}><MapPage /></Suspense>} />
          <Route path="/places/:id" element={<Suspense fallback={<AdminSuspenseFallback />}><PlaceDetails /></Suspense>} />
          <Route path="/favorites" element={<Suspense fallback={<AdminSuspenseFallback />}><Favorites /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<AdminSuspenseFallback />}><Profile /></Suspense>} />
          <Route path="/account" element={<Suspense fallback={<AdminSuspenseFallback />}><Profile /></Suspense>} />
          <Route
            path="/login"
            element={
              <Suspense fallback={<AdminSuspenseFallback />}>
                <div style={{ padding: '60px 16px', display: 'flex', justifyContent: 'center' }}>
                  <LogIn session={session} onClose={() => navigate('/')} />
                </div>
              </Suspense>
            }
          />

          {/* Admin Dashboard Routes with Code Splitting */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Suspense fallback={<AdminSuspenseFallback />}><AdminDashboard /></Suspense>} />
            <Route path="places" element={<Suspense fallback={<AdminSuspenseFallback />}><AdminPlaces /></Suspense>} />
            <Route path="places/new" element={<Suspense fallback={<AdminSuspenseFallback />}><AdminPlaceEdit /></Suspense>} />
            <Route path="places/:id" element={<Suspense fallback={<AdminSuspenseFallback />}><AdminPlaceEdit /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<AdminSuspenseFallback />}><AdminUsers /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<AdminSuspenseFallback />}><AdminSettings /></Suspense>} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Suspense fallback={<AdminSuspenseFallback />}><NotFound /></Suspense>} />
        </Routes>
      </main>

      {/* Global Footer — hidden on admin routes */}
      {!isAdminRoute && <Footer />}

      {/* Bottom Navigation for Mobile — hidden on admin & place details routes */}
      {!isAdminRoute && !isPlaceDetails && <MobileNav onOpenAuth={handleOpenAuth} />}

      {/* Accessible Auth Modal */}
      {authModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.authModalLabel')}
          onClick={handleCloseAuth}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(18, 48, 74, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(12px, 3vw, 24px)',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '460px', margin: 'auto' }}>
            <LogIn session={session} onClose={handleCloseAuth} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AdminAuthProvider>
          <PlacesProvider>
            <FavoritesProvider>
              <AppContent />
            </FavoritesProvider>
          </PlacesProvider>
        </AdminAuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

