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
      let data = null;
      let error = null;

      const fullRes = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_language, role, bio, interests, is_public, city, contact_preference, social_handle, created_at')
        .eq('id', userId)
        .single();

      if (!fullRes.error) {
        data = fullRes.data;
      } else {
        // Fallback to basic columns if extended columns are not present
        const basicRes = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, preferred_language, role, created_at')
          .eq('id', userId)
          .single();
        data = basicRes.data;
        error = basicRes.error;
      }

      // If user is authenticated in Supabase but profile row doesn't exist yet, auto-create real profile
      if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows'))) {
        const { data: authData } = await supabase.auth.getUser();
        const userMeta = authData?.user?.user_metadata || {};
        const realProfile = {
          id: userId,
          display_name: userMeta.full_name || userMeta.name || emailClean.split('@')[0] || 'مستكشف',
          avatar_url: userMeta.avatar_url || 'pharaoh',
          preferred_language: userMeta.preferred_language || 'ar',
          role: isKnownAdmin ? 'admin' : 'user',
          is_public: userMeta.is_public !== undefined ? userMeta.is_public : true,
          bio: userMeta.bio || '',
          interests: Array.isArray(userMeta.interests) ? userMeta.interests : [],
          city: userMeta.default_city || userMeta.city || '',
          contact_preference: userMeta.contact_preference || 'in_app',
          social_handle: userMeta.social_handle || '',
        };

        const { data: upserted } = await supabase
          .from('profiles')
          .upsert(realProfile, { onConflict: 'id' })
          .select()
          .single();

        if (upserted) {
          setProfile(upserted);
          return upserted;
        }
      }

      if (error && !data) {
        console.warn('Failed to fetch admin profile:', error.message);
        if (isKnownAdmin) {
          const fallbackProfile = {
            id: userId,
            role: 'admin',
            display_name: emailClean.split('@')[0],
            preferred_language: 'ar',
            is_public: true,
            interests: [],
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

    const getTestSession = () => {
      try {
        const testSessionStr = typeof localStorage !== 'undefined' ? localStorage.getItem('discover_egypt_test_session') : null;
        if (testSessionStr) {
          const testSession = JSON.parse(testSessionStr);
          if (testSession?.user?.id) return testSession;
        }
      } catch {
        // ignore
      }
      return null;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      const effectiveSession = newSession || getTestSession();
      setSession(effectiveSession);

      if (effectiveSession?.user?.id) {
        await fetchProfile(effectiveSession.user.id, effectiveSession.user.email);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
      initialized = true;
    });

    // Resilient fallback in case onAuthStateChange is delayed
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted || initialized) return;
      const effectiveSession = currentSession || getTestSession();
      setSession(effectiveSession);
      if (effectiveSession?.user?.id) {
        await fetchProfile(effectiveSession.user.id, effectiveSession.user.email);
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
