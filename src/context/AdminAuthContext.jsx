/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AdminAuthContext = createContext();

// Known administrator emails with permanent fallback privileges
const KNOWN_ADMIN_EMAILS = ['om7765355@gmail.com', 'omarmahmoud3@gmail.com'];

/**
 * AdminAuthProvider
 * Manages admin session verification and role checking.
 * Wraps Supabase session with profile role lookup and resilient fallbacks.
 */
export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  // Fetch user profile (role) from public.profiles
  const fetchProfile = useCallback(async (userId, userEmail = '') => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const emailClean = (userEmail || '').toLowerCase().trim();
    const isKnownAdmin = KNOWN_ADMIN_EMAILS.includes(emailClean);

    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_language, role, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Failed to fetch admin profile:', error.message);
        if (isKnownAdmin) {
          const fallbackProfile = {
            id: userId,
            role: 'admin',
            display_name: emailClean.split('@')[0],
            preferred_language: 'ar',
          };
          setProfile(fallbackProfile);
          return fallbackProfile;
        }
        setProfile(null);
        return null;
      }

      // If database profile has no role yet but is a known admin
      if (isKnownAdmin && data.role !== 'admin') {
        data.role = 'admin';
        // Auto-heal database role asynchronously
        supabase.from('profiles').update({ role: 'admin' }).eq('id', userId).then(() => {});
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Profile fetch error:', err);
      if (isKnownAdmin) {
        const fallbackProfile = {
          id: userId,
          role: 'admin',
          display_name: emailClean.split('@')[0],
          preferred_language: 'ar',
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
      setProfile(null);
      return null;
    } finally {
      setRoleLoading(false);
    }
  }, []);

  // Initialize: get session and listen for auth changes without duplicate profile queries
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (newSession?.user?.id) {
        await fetchProfile(newSession.user.id, newSession.user.email);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
      initialized = true;
    });

    // Resilient fallback in case onAuthStateChange is delayed
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted || initialized) return;
      setSession(currentSession);
      if (currentSession?.user?.id) {
        await fetchProfile(currentSession.user.id, currentSession.user.email);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  // Re-check profile (e.g. after refresh)
  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      return await fetchProfile(session.user.id, session.user.email);
    }
    return null;
  }, [session, fetchProfile]);

  const userEmail = (session?.user?.email || '').toLowerCase().trim();
  const isKnownAdmin = KNOWN_ADMIN_EMAILS.includes(userEmail);
  const isMetadataAdmin = session?.user?.app_metadata?.role === 'admin' || session?.user?.user_metadata?.role === 'admin';

  const isAuthenticated = !!session;
  const isAdmin = profile?.role === 'admin' || isKnownAdmin || isMetadataAdmin;
  const isReady = !loading && !roleLoading;

  const value = {
    session,
    profile,
    loading,
    roleLoading,
    isAuthenticated,
    isAdmin,
    isReady,
    handleLogout,
    refreshProfile,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
