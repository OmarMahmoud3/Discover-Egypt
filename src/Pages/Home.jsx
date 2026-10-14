import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PLACES_DATA, BRAND_PILLARS } from '../data/placesData';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceDescription } = useLanguage();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/explore');
    }
  };

  const quickCities = isArabic
    ? [
        { label: 'الجيزة', query: 'الجيزة' },
        { label: 'الأقصر', query: 'الأقصر' },
        { label: 'القاهرة', query: 'القاهرة' },
        { label: 'أسوان', query: 'أسوان' },
        { label: 'الإسكندرية', query: 'الإسكندرية' },
      ]
    : [
        { label: 'Giza', query: 'Giza' },
        { label: 'Luxor', query: 'Luxor' },
        { label: 'Cairo', query: 'Cairo' },
        { label: 'Aswan', query: 'Aswan' },
        { label: 'Alexandria', query: 'Alexandria' },
      ];

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section
        className="hero-section"
        style={{
          position: 'relative',
          minHeight: 'min(560px, 70vh)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--primary-dark)',
          overflow: 'hidden',
          padding: 'clamp(40px, 8vh, 80px) clamp(16px, 4vw, 32px)',
        }}
      >
        {/* Background Hero Image with Layered Gradients */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCao0_zDTQ8frEJZNDu_1tm-2N4fczbSoYCt6ac4edUah5oV9SbFC7p7q8VacMNwgF7Pwxikq1qjB9GQ-_aCIDgMOu_F-_Xo26nxq2PxOn02XJSCNquHBHi49acxYauO6VY7PobKN0gABl36WJU_cU2iftmnc5jbBK6JmShVWWHnRaBl-WzR2mwRD6rxEWKuJYTCxRFT7GEQ1NGbmqfdhem5otkALIcQc56Kw6aaFiZ0JHF5YJAG1-oLg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            opacity: 0.38,
            transform: 'scale(1.05)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(18, 48, 74, 0.4) 0%, rgba(10, 28, 44, 0.95) 100%)',
          }}
        />

        {/* Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            maxWidth: '820px',
            width: '100%',
            color: '#FFFFFF',
          }}
        >
          {/* Top Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(212, 166, 74, 0.2)',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              fontWeight: '700',
              marginBottom: 'clamp(14px, 3vw, 20px)',
            }}
          >
            <span>☥</span>
            <span>{t('brand.badge')}</span>
            <span>☥</span>
          </div>

          <h1 className="hero-title" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
            {t('brand.heroTitle')}
          </h1>

          <p className="hero-subtitle" style={{ color: 'var(--beige)' }}>
            {t('brand.heroSubtitle')}
          </p>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="hero-search-form">
            <div className="hero-search-input-wrap">
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px', flexShrink: 0 }}>
                search
              </span>
              <input
                type="text"
                placeholder={t('brand.heroSearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '12px 8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  width: '100%',
                  background: 'transparent',
                }}
              />
            </div>
            <button type="submit" className="btn-primary hero-search-btn" style={{ height: '44px', padding: '0 22px', flexShrink: 0 }}>
              <span>{t('brand.heroSearchBtn')}</span>
            </button>
          </form>

          {/* Quick City Tags */}
          <div className="hero-cities-wrap">
            <span style={{ color: 'var(--beige-dark)', fontWeight: '600' }}>
              {t('brand.quickDestinations')}
            </span>
            {quickCities.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(`/explore?city=${encodeURIComponent(item.query)}`)}
                className="hero-city-pill"
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Pillars Section (From Identity Guide Page 1) */}
      <section className="pillars-section" style={{ padding: 'clamp(40px, 6vw, 64px) 0 32px', backgroundColor: '#FFFFFF' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto clamp(28px, 5vw, 42px)' }}>
            <span
              style={{
                color: 'var(--secondary)',
                fontWeight: '800',
                fontSize: '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {t('pillars.sectionBadge')}
            </span>
            <h2
              style={{
                fontSize: 'clamp(22px, 4vw, 28px)',
                fontWeight: '900',
                color: 'var(--primary)',
                marginTop: '6px',
              }}
            >
              {t('pillars.sectionTitle')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(13px, 2vw, 14px)', marginTop: '8px' }}>
              {t('pillars.sectionDesc')}
            </p>
          </div>

          <div className="pillars-grid">
            {BRAND_PILLARS.map((pillar, idx) => {
              const primaryTitle = isArabic ? pillar.titleAr : pillar.title;
              const subTitle = isArabic ? pillar.title : pillar.titleAr;
              const description = isArabic ? pillar.desc : (pillar.descEn || pillar.desc);

              return (
                <div
                  key={idx}
                  style={{
                    padding: '24px 20px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: 'clamp(44px, 8vw, 54px)',
                      height: 'clamp(44px, 8vw, 54px)',
                      borderRadius: '16px',
                      backgroundColor: idx % 2 === 0 ? 'var(--secondary-surface)' : 'var(--gold-surface)',
                      color: idx % 2 === 0 ? 'var(--secondary)' : 'var(--gold-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 'clamp(10px, 2vw, 16px)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}>
                      {pillar.icon}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                    {primaryTitle}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--secondary)',
                      fontFamily: isArabic ? "'Inter', sans-serif" : "'Cairo', sans-serif",
                      fontWeight: '600',
                      marginTop: '2px',
                      marginBottom: '8px',
                    }}
                  >
                    {subTitle}
                  </span>
                  <p style={{ fontSize: 'clamp(12px, 2vw, 13px)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Destinations Section */}
      <section style={{ padding: 'clamp(40px, 6vw, 60px) 0', backgroundColor: 'var(--surface)' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: 'clamp(24px, 4vw, 36px)',
            }}
          >
            <div>
              <span style={{ color: 'var(--secondary)', fontWeight: '800', fontSize: '13px' }}>
                {t('home.featuredBadge')}
              </span>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: '900', color: 'var(--primary)', margin: '4px 0 0' }}>
                {t('home.featuredTitle')}
              </h2>
            </div>
            <Link
              to="/explore"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--secondary)',
                fontWeight: '700',
                fontSize: '14px',
              }}
            >
              <span>{t('home.viewAll')}</span>
              <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '18px' }}>
                arrow_back
              </span>
            </Link>
          </div>

          <div className="places-grid">
            {PLACES_DATA.map((place) => {
              const saved = isFavorite(place.id);
              const name = getPlaceName(place);
              const city = getPlaceCity(place);
              const desc = getPlaceDescription(place);
              const duration = isArabic
                ? place.quickInfo?.duration
                : place.quickInfo?.durationEn || place.quickInfo?.duration;

              return (
                <div
                  key={place.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.25s, box-shadow 0.25s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  {/* Image header */}
                  <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden' }}>
                    <img
                      src={place.image}
                      alt={name}
                      loading="lazy"
                      width="400"
                      height="250"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(18, 48, 74, 0.8) 0%, transparent 60%)',
                      }}
                    />

                    {/* Badge */}
                    <div style={{ position: 'absolute', top: '12px', insetInlineEnd: '12px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          color: 'var(--primary)',
                          fontWeight: '800',
                          fontSize: '11px',
                        }}
                      >
                        {city}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(place.id, name)}
                      aria-label={saved ? t('home.removeFavorite') || 'Remove favorite' : t('home.addFavorite') || 'Add favorite'}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        insetInlineStart: '12px',
                        width: '38px',
                        height: '38px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: saved ? 'var(--error)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <span className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`} style={{ fontSize: '20px' }}>
                        {saved ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>

                    {/* Rating */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        insetInlineEnd: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#FFFFFF',
                        fontWeight: '700',
                        fontSize: '13px',
                      }}
                    >
                      <span className="material-symbols-outlined material-filled" style={{ fontSize: '16px', color: 'var(--gold)' }}>
                        star
                      </span>
                      <span>{place.rating}</span>
                      <span style={{ opacity: 0.8, fontSize: '11px' }}>({place.reviewCount})</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: 'clamp(14px, 3vw, 20px)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: 'clamp(16px, 2.5vw, 18px)', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                        {name}
                      </h3>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          marginTop: '6px',
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {desc}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--secondary)', fontWeight: '600' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          schedule
                        </span>
                        <span>{duration}</span>
                      </div>

                      <Link
                        to={`/places/${place.id}`}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
                      >
                        <span>{t('home.detailsBtn')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                          arrow_back
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Heritage Journey Banner */}
      <section style={{ padding: 'clamp(24px, 5vw, 40px) 0', backgroundColor: '#FFFFFF' }}>
        <div className="container">
          <div className="journey-banner">
            <div style={{ maxWidth: '560px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '24px' }}>
                  auto_awesome
                </span>
                <span style={{ color: 'var(--gold)', fontWeight: '800', fontSize: '14px' }}>
                  {t('home.journeyBannerBadge')}
                </span>
              </div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: '800', margin: '4px 0 10px' }}>
                {t('home.journeyBannerTitle')}
              </h2>
              <p style={{ color: 'var(--beige)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                {t('home.journeyBannerDesc')}
              </p>
            </div>

            <div className="journey-banner-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/favorites" className="btn-gold" style={{ fontSize: '14px' }}>
                <span className="material-symbols-outlined material-filled" style={{ fontSize: '18px' }}>
                  bookmark
                </span>
                <span>{t('home.journeyBannerBtnSaved')}</span>
              </Link>
              <Link to="/explore" className="btn-outline" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' }}>
                <span>{t('home.journeyBannerBtnAll')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
