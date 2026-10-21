import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useLanguage } from '../context/LanguageContext';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Footer() {
  const { t, isArabic } = useLanguage();
  const { isAdmin } = useAdminAuth();

  return (
    <footer
      style={{
        backgroundColor: 'var(--primary)',
        color: '#FFFFFF',
        paddingTop: '64px',
        paddingBottom: '96px',
        marginTop: '60px',
        borderTop: '3px solid var(--gold)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Col 1: Brand Info */}
          <div>
            <div style={{ filter: 'brightness(1.15)', marginBottom: '16px' }}>
              <BrandLogo size="medium" />
            </div>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--beige)',
                lineHeight: 1.8,
                maxWidth: '320px',
              }}
            >
              {t('footer.desc')}
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '18px',
                padding: '6px 14px',
                backgroundColor: 'rgba(212, 166, 74, 0.1)',
                border: '1px solid var(--gold)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--gold)',
                fontWeight: 600,
              }}
            >
              <span>☥</span>
              <span>{t('brand.tagline') || 'تاريخ يُروى، وتجارب تُكتشف'}</span>
            </div>
          </div>

          {/* Col 2: Top Destinations */}
          <div>
            <h4
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: 'var(--gold)',
                marginBottom: '18px',
              }}
            >
              {t('footer.topDestinationsTitle')}
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link
                  to="/places/giza-plateau"
                  style={{ color: '#E2E8F0', fontSize: '14px', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#E2E8F0')}
                >
                  {t('footer.destinationPyramids')}
                </Link>
              </li>
              <li>
                <Link
                  to="/places/karnak-temple-complex"
                  style={{ color: '#E2E8F0', fontSize: '14px', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#E2E8F0')}
                >
                  {t('footer.destinationKarnak')}
                </Link>
              </li>
              <li>
                <Link
                  to="/places/khan-el-khalili"
                  style={{ color: '#E2E8F0', fontSize: '14px', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#E2E8F0')}
                >
                  {t('footer.destinationKhan')}
                </Link>
              </li>
              <li>
                <Link
                  to="/places/philae-temple-complex"
                  style={{ color: '#E2E8F0', fontSize: '14px', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#E2E8F0')}
                >
                  {t('footer.destinationPhilae')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Services & Pillars */}
          <div>
            <h4
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: 'var(--gold)',
                marginBottom: '18px',
              }}
            >
              {t('footer.pillarsTitle')}
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E2E8F0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary-light)' }}>
                  explore
                </span>
                <span>{isArabic ? 'استكشاف أصيل' : 'Explore Authentically'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E2E8F0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary-light)' }}>
                  change_history
                </span>
                <span>{isArabic ? 'تراث ضارب في التاريخ' : 'Rooted in Heritage'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E2E8F0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary-light)' }}>
                  verified_user
                </span>
                <span>{isArabic ? 'إرشادات موثوقة' : 'Trusted & Reliable'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E2E8F0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary-light)' }}>
                  favorite
                </span>
                <span>{isArabic ? 'صُنع لعشاق مصر' : 'Made for Egypt Lovers'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div
          style={{
            paddingTop: '28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '13px',
            color: 'var(--beige-dark)',
          }}
        >
          <div>
            {t('footer.rights', { year: new Date().getFullYear() })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>{t('footer.subCredits')}</span>
            {isAdmin && (
              <>
                <span style={{ opacity: 0.4 }}>•</span>
                <Link
                  to="/admin"
                  style={{
                    color: 'var(--gold)',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    admin_panel_settings
                  </span>
                  <span>{isArabic ? 'لوحة التحكم' : 'Admin Panel'}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
