/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

const STORAGE_KEY = 'discover_egypt_lang';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage', e);
    }
    return 'ar';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isArabic = lang === 'ar';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not save language to localStorage', e);
    }

    // Update document level direction and language attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = isArabic
      ? 'اكتشف مصر | Discover Egypt'
      : 'Discover Egypt | Official Tourism & Heritage Portal';
  }, [lang, dir, isArabic]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const setLanguage = (newLang) => {
    if (newLang === 'ar' || newLang === 'en') {
      setLang(newLang);
    }
  };

  /**
   * Translate helper with nested key lookup & interpolation
   * e.g. t('nav.home'), t('favorites.savedCountSuffix', { count: 3 })
   */
  const t = (path, params = {}) => {
    const keys = path.split('.');
    let current = translations[lang];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Arabic if missing in English, or key itself
        let fallback = translations['ar'];
        for (const fKey of keys) {
          if (fallback && typeof fallback === 'object' && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            fallback = null;
            break;
          }
        }
        current = fallback || path;
        break;
      }
    }

    if (typeof current === 'string') {
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramVal);
      }, current);
    }

    return current;
  };

  // Place Localization Helpers
  const getPlaceName = (place) => {
    if (!place) return '';
    if (!isArabic) {
      return place.name_en || place.nameEn || place.name || '';
    }
    return place.name || place.name_ar || place.nameEn || '';
  };

  const getPlaceCity = (place) => {
    if (!place) return '';
    if (!isArabic) {
      return place.city_en || place.cityEn || place.city || '';
    }
    return place.city || place.city_ar || place.cityEn || '';
  };

  const getPlaceCategory = (place) => {
    if (!place) return '';
    if (!isArabic) {
      return place.category_en || place.categoryEn || place.category || '';
    }
    return place.category || place.category_ar || place.categoryEn || '';
  };

  const getPlaceDescription = (place) => {
    if (!place) return '';
    if (!isArabic) {
      return (
        place.historicalTextEn ||
        place.description_en ||
        place.descriptionEn ||
        place.historicalText ||
        place.description ||
        ''
      );
    }
    return place.historicalText || place.description || place.description_ar || '';
  };

  const getPlaceLocation = (place) => {
    if (!place) return '';
    if (!isArabic) {
      return place.locationShortEn || place.location_en || place.locationShort || '';
    }
    return place.locationShort || place.location || '';
  };

  const getPlaceGateInfo = (place) => {
    if (!place) return '';
    if (!isArabic) {
      return place.gateInfoEn || place.gateInfo || '';
    }
    return place.gateInfo || '';
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir,
        isArabic,
        toggleLanguage,
        setLanguage,
        t,
        getPlaceName,
        getPlaceCity,
        getPlaceCategory,
        getPlaceDescription,
        getPlaceLocation,
        getPlaceGateInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
