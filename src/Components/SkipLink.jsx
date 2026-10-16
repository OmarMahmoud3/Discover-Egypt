import { useLanguage } from '../context/LanguageContext';

/**
 * SkipLink — Provides an accessible skip-to-content mechanism for keyboard
 * and screen-reader users, meeting WCAG 2.4.1 (Bypass Blocks).
 */
export default function SkipLink({ targetId = 'main-content' }) {
  const { t } = useLanguage();

  const handleSkip = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleSkip}
      className="skip-link"
    >
      {t('nav.skipToContent')}
    </a>
  );
}
