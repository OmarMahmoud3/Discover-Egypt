/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePlaces } from './PlacesContext';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from './AdminAuthContext';

const FavoritesContext = createContext();

const INITIAL_FAVORITE_IDS = ['giza-pyramids', 'karnak-temple', 'khan-el-khalili'];

function getStorageKey(userId) {
  return userId ? `discover_egypt_favorites_${userId}` : 'discover_egypt_favorites_guest';
}

function readStoredFavorites(userId) {
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
    // Backward compatibility for existing guest favorites
    if (!userId) {
      const legacy = localStorage.getItem('discover_egypt_favorites');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read favorites from localStorage', e);
  }
  return userId ? [] : INITIAL_FAVORITE_IDS;
}

export function FavoritesProvider({ children }) {
  const { session } = useAdminAuth();
  const { places } = usePlaces();
  const userId = session?.user?.id || null;
  const previousUserId = useRef(userId);

  const [favoriteIds, setFavoriteIds] = useState(() => readStoredFavorites(userId));
  const [toastMessage, setToastMessage] = useState('');

  // Synchronize on user login / logout / account switch
  useEffect(() => {
    if (previousUserId.current !== userId) {
      previousUserId.current = userId;
      const initialUserFavs = readStoredFavorites(userId);
      setFavoriteIds(initialUserFavs);
    }

    if (!userId) return;

    let isMounted = true;

    // Fetch authenticated user favorites from Supabase cloud table if available
    async function syncCloudFavorites() {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('place_id')
          .eq('user_id', userId);

        if (!error && data && isMounted) {
          const cloudIds = data.map((row) => row.place_id).filter(Boolean);
          if (cloudIds.length > 0) {
            setFavoriteIds((prev) => {
              const merged = Array.from(new Set([...prev, ...cloudIds]));
              try {
                localStorage.setItem(getStorageKey(userId), JSON.stringify(merged));
              } catch {
                // Ignore storage quota warnings
              }
              return merged;
            });
          }
        }
      } catch (err) {
        // Table or RLS not yet configured in remote project; local user isolation continues to work safely
        console.info('[Favorites] Supabase sync deferred (using local user isolation):', err?.message || err);
      }
    }

    syncCloudFavorites();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Persist to user-scoped storage whenever favoriteIds change
  useEffect(() => {
    try {
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(favoriteIds));
      if (!userId) {
        localStorage.setItem('discover_egypt_favorites', JSON.stringify(favoriteIds));
      }
    } catch (e) {
      console.warn('Could not write favorites to localStorage', e);
    }
  }, [favoriteIds, userId]);

  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((text) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(text);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2800);
  }, []);

  const isFavorite = useCallback(
    (id) => Array.isArray(favoriteIds) && favoriteIds.includes(id),
    [favoriteIds]
  );

  // Safe async cloud persistence helper (never throws or crashes on missing .catch)
  const syncFavoriteToCloud = useCallback(async (currentUserId, placeId, willRemove) => {
    if (!currentUserId || !placeId) return;
    try {
      if (willRemove) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('place_id', placeId);
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: currentUserId, place_id: placeId });
      }
    } catch (err) {
      console.warn('[Favorites] Cloud sync deferred:', err?.message || err);
    }
  }, []);

  const clearCloudFavorites = useCallback(async (currentUserId) => {
    if (!currentUserId) return;
    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUserId);
    } catch (err) {
      console.warn('[Favorites] Cloud clear deferred:', err?.message || err);
    }
  }, []);

  const toggleFavorite = useCallback(
    (id, placeName = '', customMessage = '') => {
      if (!id) return;
      const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
      const willRemove = Array.isArray(favoriteIds) && favoriteIds.includes(id);

      const msg =
        customMessage ||
        (willRemove
          ? isEn
            ? `${placeName || 'Place'} removed from favorites`
            : `تمت إزالة ${placeName || 'المكان'} من المفضلة`
          : isEn
          ? `${placeName || 'Place'} added to favorites ❤️`
          : `تمت إضافة ${placeName || 'المكان'} إلى قائمة المفضلة ❤️`);

      setFavoriteIds((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return willRemove ? current.filter((item) => item !== id) : [...current, id];
      });

      showToast(msg);

      if (userId) {
        syncFavoriteToCloud(userId, id, willRemove);
      }
    },
    [favoriteIds, userId, showToast, syncFavoriteToCloud]
  );

  const removeFavorite = useCallback(
    (id, placeName = '', customMessage = '') => {
      if (!id) return;
      const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
      setFavoriteIds((prev) => (Array.isArray(prev) ? prev.filter((item) => item !== id) : []));

      const msg =
        customMessage ||
        (isEn ? `${placeName || 'Place'} removed from favorites` : `تمت إزالة ${placeName || 'المكان'} من المفضلة`);
      showToast(msg);

      if (userId) {
        syncFavoriteToCloud(userId, id, true);
      }
    },
    [userId, showToast, syncFavoriteToCloud]
  );

  const clearAllFavorites = useCallback(
    (customMessage = '') => {
      const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
      setFavoriteIds([]);
      const msg =
        customMessage ||
        (isEn ? 'Favorites list cleared successfully' : 'تم إفراغ قائمة المفضلة بنجاح');
      showToast(msg);

      if (userId) {
        clearCloudFavorites(userId);
      }
    },
    [userId, showToast, clearCloudFavorites]
  );

  const favoritePlaces = places.filter(
    (place) =>
      Array.isArray(favoriteIds) &&
      (favoriteIds.includes(place.id) || favoriteIds.includes(place.slug))
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoritePlaces,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        clearAllFavorites,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            padding: '10px 22px',
            borderRadius: '9999px',
            boxShadow: '0 8px 24px rgba(18, 48, 74, 0.35)',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid var(--gold)',
            animation: 'fadeIn 0.25s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          <span className="material-symbols-outlined material-filled" style={{ color: 'var(--gold)', fontSize: '18px' }}>
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

