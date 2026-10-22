import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that navigating between pages resets the viewport
 * to the top of the page, matching standard multi-page web behavior.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Only attempt scrolling if hash is a valid anchor identifier, not an OAuth redirect token (e.g., #access_token=...)
    if (hash && !hash.includes('=') && !hash.startsWith('#access_token') && !hash.startsWith('#error')) {
      try {
        const id = decodeURIComponent(hash.replace(/^#/, ''));
        const target = document.getElementById(id) || document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      } catch {
        // Silently ignore invalid selector syntax
      }
    }

    // Reset window scroll to the very top immediately
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname, hash]);

  return null;
}
