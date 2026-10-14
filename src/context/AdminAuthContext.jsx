/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AdminAuthContext = createContext();

/**
 * AdminAuthProvider
 * Manages admin session verification and role checking.
 * Does NOT replace the existing auth — wraps Supabase session with profile role lookup.
 */
export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  // Fetch user profile (role) from public.profiles
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_language, role, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Failed to fetch admin profile:', error.message);
        setProfile(null);
        return null;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
      return null;
    } finally {
      setRoleLoading(false);
    }
  }, []);

  // Initialize: get session and listen for auth changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(currentSession);

      if (currentSession?.user?.id) {
        await fetchProfile(currentSession.user.id);
      }

      if (mounted) setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (newSession?.user?.id) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
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
      return await fetchProfile(session.user.id);
    }
    return null;
  }, [session, fetchProfile]);

  const isAuthenticated = !!session;
  const isAdmin = profile?.role === 'admin';
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
