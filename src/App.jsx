import { useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FavoritesProvider } from './context/FavoritesContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

import Navbar from './Components/Navbar';
import Footer from './Components/Footer';
import MobileNav from './Components/MobileNav';

import Home from './Pages/Home';
import Explore from './Pages/Explore';
import PlaceDetails from './Pages/PlaceDetails';
import Favorites from './Pages/Favorites';
import LogIn from './Pages/LogIn';
import NotFound from './Pages/NotFound';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { dir, lang } = useLanguage();

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
      {/* Navigation Bar — hidden on admin routes */}
      {!isAdminRoute && (
        <Navbar
          session={session}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      )}

      {/* Main Content Router */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/places/:id" element={<PlaceDetails />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route
            path="/login"
            element={
              <div style={{ padding: '60px 16px', display: 'flex', justifyContent: 'center' }}>
                <LogIn session={session} onClose={() => navigate('/')} />
              </div>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Global Footer — hidden on admin routes */}
      {!isAdminRoute && <Footer />}

      {/* Bottom Navigation for Mobile — hidden on admin & place details routes */}
      {!isAdminRoute && !isPlaceDetails && <MobileNav onOpenAuth={() => setAuthModalOpen(true)} />}

      {/* Auth Modal Backdrop */}
      {authModalOpen && (
        <div
          onClick={() => setAuthModalOpen(false)}
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
            <LogIn session={session} onClose={() => setAuthModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AdminAuthProvider>
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </AdminAuthProvider>
    </LanguageProvider>
  );
}

