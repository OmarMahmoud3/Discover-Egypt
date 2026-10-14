import { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { adminTranslations } from '../i18n/adminTranslations';

/**
 * Hook for admin-specific translations.
 * Uses the existing language context for lang detection.
 * Falls back to Arabic if key is missing.
 */
export function useAdminTranslation() {
  const { lang, dir, isArabic } = useLanguage();

  const ta = useCallback(
    (path, params = {}) => {
      const keys = path.split('.');
      let current = adminTranslations[lang];

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Fallback to Arabic
          let fallback = adminTranslations['ar'];
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

      return current || path;
    },
    [lang]
  );

  return { ta, lang, dir, isArabic };
}

