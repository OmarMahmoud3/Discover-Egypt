/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PLACES_DATA } from '../data/placesData';
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
      return JSON.parse(stored);
    }
    // Backward compatibility for existing guest favorites
    if (!userId) {
      const legacy = localStorage.getItem('discover_egypt_favorites');
      if (legacy) return JSON.parse(legacy);
    }
  } catch (e) {
    console.warn('Could not read favorites from localStorage', e);
  }
  return userId ? [] : INITIAL_FAVORITE_IDS;
}

export function FavoritesProvider({ children }) {
  const { session } = useAdminAuth();
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

  const showToast = useCallback((text) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  }, []);

  const isFavorite = useCallback((id) => favoriteIds.includes(id), [favoriteIds]);

  const toggleFavorite = useCallback(
    (id, placeName = '', customMessage = '') => {
      const isEn = localStorage.getItem('discover_egypt_lang') === 'en';

      setFavoriteIds((prev) => {
        const willRemove = prev.includes(id);
        const next = willRemove ? prev.filter((item) => item !== id) : [...prev, id];

        const msg =
          customMessage ||
          (willRemove
            ? isEn
              ? `${placeName || 'Place'} removed from favorites`
              : `تمت إزالة ${placeName || 'المكان'} من المفضلة`
            : isEn
            ? `${placeName || 'Place'} added to favorites ❤️`
            : `تمت إضافة ${placeName || 'المكان'} إلى قائمة المفضلة ❤️`);

        showToast(msg);

        // Optimistically update cloud database if logged in
        if (userId) {
          if (willRemove) {
            supabase
              .from('favorites')
              .delete()
              .eq('user_id', userId)
              .eq('place_id', id)
              .catch(() => {});
          } else {
            supabase
              .from('favorites')
              .insert({ user_id: userId, place_id: id })
              .catch(() => {});
          }
        }

        return next;
      });
    },
    [userId, showToast]
  );

  const removeFavorite = useCallback(
    (id, placeName = '', customMessage = '') => {
      const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
      setFavoriteIds((prev) => prev.filter((item) => item !== id));
      const msg =
        customMessage ||
        (isEn ? `${placeName || 'Place'} removed from favorites` : `تمت إزالة ${placeName || 'المكان'} من المفضلة`);
      showToast(msg);

      if (userId) {
        supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('place_id', id)
          .catch(() => {});
      }
    },
    [userId, showToast]
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
        supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .catch(() => {});
      }
    },
    [userId, showToast]
  );

  const favoritePlaces = PLACES_DATA.filter((place) => favoriteIds.includes(place.id));

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

