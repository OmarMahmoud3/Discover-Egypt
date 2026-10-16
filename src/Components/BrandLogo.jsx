import { useLanguage } from '../context/LanguageContext';

export default function BrandLogo({ size = 'medium', showText = true, layout = 'horizontal' }) {
  const { isArabic } = useLanguage();

  const iconSizes = {
    small: 36,
    medium: 44,
    large: 58,
  };
  const iconPx = iconSizes[size] || 44;

  return (
    <div
      className={`brand-logo-root ${size}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        textDecoration: 'none',
        userSelect: 'none',
        minWidth: 0,
      }}
    >
      {/* Visual Identity Logo Mark */}
      <div
        className="brand-logo-icon"
        style={{
          width: `${iconPx}px`,
          height: `${iconPx}px`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Subtle Outer Glow / Disc */}
          <circle cx="50" cy="50" r="48" fill="#F3E9D2" opacity="0.4" />
          
          {/* Pyramid Base Steps Shadow */}
          <path d="M50 44 L22 84 L28 84 L50 52 Z" fill="#0C2033" />
          <path d="M50 48 L28 80 L34 80 L50 56 Z" fill="#0F766E" opacity="0.7" />

          {/* Left Pyramid Face (Midnight Indigo) */}
          <polygon points="50,38 20,84 50,84" fill="#12304A" />

          {/* Right Pyramid Face (Teal Reflection) */}
          <polygon points="50,38 50,84 80,84" fill="#0F766E" />

          {/* Central Ascending Light Highway / Road (Gold & Beige) */}
          <polygon points="50,42 45,84 55,84" fill="#D4A64A" />
          <polygon points="50,46 48,84 52,84" fill="#F3E9D2" />

          {/* Location Pin Head (Turquoise with Golden Core) */}
          <circle cx="50" cy="24" r="14" fill="#0F766E" stroke="#12304A" strokeWidth="2.5" />
          <circle cx="50" cy="24" r="6.5" fill="#D4A64A" />
          <path d="M43 32 L50 44 L57 32 Z" fill="#0F766E" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div
          className="brand-logo-text"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: layout === 'vertical' ? 'center' : 'flex-start',
            textAlign: layout === 'vertical' ? 'center' : isArabic ? 'right' : 'left',
            lineHeight: 1.15,
            minWidth: 0,
          }}
        >
          <div
            className="brand-logo-title"
            style={{
              fontFamily: isArabic ? "'Cairo', sans-serif" : "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: size === 'large' ? '28px' : size === 'small' ? '18px' : '22px',
              color: 'var(--primary)',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{isArabic ? 'اكتشف مصر' : 'Discover Egypt'}</span>
            <span
              className="brand-logo-symbol"
              style={{
                color: 'var(--gold)',
                fontSize: size === 'large' ? '22px' : '17px',
                fontWeight: 900,
                transform: 'translateY(-1px)',
              }}
              title={isArabic ? 'مفتاح الحياة (عنخ)' : 'Ankh Symbol'}
            >
              ☥
            </span>
          </div>
          <span
            className="brand-logo-subtitle"
            style={{
              fontFamily: isArabic ? "'Inter', sans-serif" : "'Cairo', sans-serif",
              fontWeight: 700,
              fontSize: size === 'large' ? '13px' : size === 'small' ? '10px' : '11px',
              color: 'var(--secondary)',
              letterSpacing: isArabic ? '0.12em' : '0.04em',
              textTransform: 'uppercase',
              marginTop: '1px',
              whiteSpace: 'nowrap',
            }}
          >
            {isArabic ? 'DISCOVER EGYPT' : 'اكتشف مصر'}
          </span>
        </div>
      )}
    </div>
  );
}
