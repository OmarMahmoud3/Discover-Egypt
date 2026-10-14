import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
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
import AdminDashboard from './Pages/admin/AdminDashboard';
import AdminPlaces from './Pages/admin/AdminPlaces';
import AdminPlaceEdit from './Pages/admin/AdminPlaceEdit';
import AdminUsers from './Pages/admin/AdminUsers';
import AdminSettings from './Pages/admin/AdminSettings';

function AppContent() {
  const [session, setSession] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { dir, lang } = useLanguage();
  const { isAdmin, isReady } = useAdminAuth();

  // Only hide public chrome when authenticated and verified as admin
  const isAdminRoute = location.pathname.startsWith('/admin') && isReady && isAdmin;

  // Track Supabase Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

          {/* Admin Dashboard Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="places" element={<AdminPlaces />} />
            <Route path="places/new" element={<AdminPlaceEdit />} />
            <Route path="places/:id" element={<AdminPlaceEdit />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Global Footer — hidden on admin routes */}
      {!isAdminRoute && <Footer />}

      {/* Bottom Navigation for Mobile — hidden on admin routes */}
      {!isAdminRoute && <MobileNav onOpenAuth={() => setAuthModalOpen(true)} />}

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
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '460px' }}>
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

