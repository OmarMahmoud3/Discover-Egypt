/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { PLACES_DATA } from '../data/placesData';

const FavoritesContext = createContext();

const INITIAL_FAVORITE_IDS = ['giza-pyramids', 'karnak-temple', 'khan-el-khalili'];

export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const stored = localStorage.getItem('discover_egypt_favorites');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read favorites from localStorage', e);
    }
    return INITIAL_FAVORITE_IDS;
  });

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('discover_egypt_favorites', JSON.stringify(favoriteIds));
    } catch (e) {
      console.warn('Could not write favorites to localStorage', e);
    }
  }, [favoriteIds]);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  const isFavorite = (id) => favoriteIds.includes(id);

  const toggleFavorite = (id, placeName = '', customMessage = '') => {
    const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
    setFavoriteIds((prev) => {
      if (prev.includes(id)) {
        const msg = customMessage || (isEn ? `${placeName || 'Place'} removed from favorites` : `تمت إزالة ${placeName || 'المكان'} من المفضلة`);
        showToast(msg);
        return prev.filter((item) => item !== id);
      } else {
        const msg = customMessage || (isEn ? `${placeName || 'Place'} added to favorites ❤️` : `تمت إضافة ${placeName || 'المكان'} إلى قائمة المفضلة ❤️`);
        showToast(msg);
        return [...prev, id];
      }
    });
  };

  const removeFavorite = (id, placeName = '', customMessage = '') => {
    const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
    setFavoriteIds((prev) => prev.filter((item) => item !== id));
    const msg = customMessage || (isEn ? `${placeName || 'Place'} removed from favorites` : `تمت إزالة ${placeName || 'المكان'} من المفضلة`);
    showToast(msg);
  };

  const clearAllFavorites = (customMessage = '') => {
    const isEn = localStorage.getItem('discover_egypt_lang') === 'en';
    setFavoriteIds([]);
    const msg = customMessage || (isEn ? 'Favorites list cleared successfully' : 'تم إفراغ قائمة المفضلة بنجاح');
    showToast(msg);
  };

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
