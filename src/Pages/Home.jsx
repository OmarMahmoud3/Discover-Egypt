import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PLACES_DATA, BRAND_PILLARS } from '../data/placesData';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceDescription, getPlaceCategory } = useLanguage();

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

  // Distribute places into varied editorial compositions
  const leadPlace = PLACES_DATA[0]; // Giza Pyramids
  const diptychPlaces = PLACES_DATA.slice(1, 3); // Karnak & Khan El Khalili
  const archivalPlaces = PLACES_DATA.slice(3, 6); // Remaining landmarks

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh' }}>
      {/* 1. Editorial Masthead Hero */}
      <section
        style={{
          position: 'relative',
          minHeight: 'min(580px, 72vh)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--primary-dark)',
          overflow: 'hidden',
          padding: 'clamp(48px, 9vh, 90px) clamp(16px, 4vw, 36px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Archival Photography Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('${leadPlace.image}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 42%',
            opacity: 0.32,
            transform: 'scale(1.03)',
            filter: 'contrast(1.1) saturate(0.9)',
          }}
        />

        {/* Deep Nile Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(18, 48, 74, 0.45) 0%, rgba(10, 28, 44, 0.94) 100%)',
          }}
        />

        {/* Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            maxWidth: '860px',
            width: '100%',
            color: '#FFFFFF',
          }}
        >
          {/* Editorial Tagline Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(212, 166, 74, 0.15)',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '20px',
            }}
          >
            <span>☥</span>
            <span>{t('brand.tagline') || 'تاريخ يُروى، وتجارب تُكتشف'}</span>
            <span>☥</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 5.5vw, 52px)',
              fontWeight: 900,
              lineHeight: 1.22,
              marginBottom: '16px',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            {t('brand.heroTitle')}
          </h1>

          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 17px)',
              lineHeight: 1.7,
              color: 'var(--beige)',
              maxWidth: '680px',
              margin: '0 auto 28px',
            }}
          >
            {t('brand.heroSubtitle')}
          </p>

          {/* Bespoke Editorial Search Bar */}
          <form onSubmit={handleSearchSubmit} className="editorial-search-bar" style={{ margin: '0 auto 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, width: '100%', minWidth: 0 }}>
              <span
                className="material-symbols-outlined"
                style={{ color: 'var(--secondary)', fontSize: '24px', flexShrink: 0 }}
              >
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
                  padding: '10px 4px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  background: 'transparent',
                  minWidth: 0,
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ flexShrink: 0, padding: '10px 22px' }}
            >
              <span>{t('brand.heroSearchBtn')}</span>
            </button>
          </form>

          {/* Quick Geographic Chapters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--beige-dark)', fontWeight: '600', marginInlineEnd: '4px' }}>
              {t('brand.quickDestinations')}
            </span>
            {quickCities.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(`/explore?city=${encodeURIComponent(item.query)}`)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--secondary)';
                  e.currentTarget.style.borderColor = 'var(--secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. The Cultural Manifesto (Replaces SaaS 5-box feature grid) */}
      <section style={{ padding: 'clamp(44px, 7vw, 72px) 0 36px', backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ maxWidth: '680px', marginBottom: 'clamp(28px, 5vw, 44px)' }}>
            <div className="editorial-tag" style={{ marginBottom: '8px' }}>
              <span>{t('pillars.sectionBadge') || 'هويتنا ورسالتنا'}</span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 32px)',
                fontWeight: 900,
                color: 'var(--primary)',
                lineHeight: 1.25,
                margin: '0 0 10px',
              }}
            >
              {t('pillars.sectionTitle')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
              {t('pillars.sectionDesc')}
            </p>
          </div>

          {/* Numbered Editorial Manifesto Columns */}
          <div className="manifesto-grid">
            {BRAND_PILLARS.map((pillar, idx) => {
              const primaryTitle = isArabic ? pillar.titleAr : pillar.title;
              const subTitle = isArabic ? pillar.title : pillar.titleAr;
              const description = isArabic ? pillar.desc : (pillar.descEn || pillar.desc);
              const numStr = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px 14px',
                    borderTop: '2px solid var(--gold)',
                    backgroundColor: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'transform 0.2s ease, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        fontSize: '18px',
                        color: 'var(--gold-dark)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {numStr}
                    </span>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color: 'var(--secondary)' }}
                    >
                      {pillar.icon}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      margin: '0 0 2px',
                    }}
                  >
                    {primaryTitle}
                  </h3>

                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--secondary)',
                      fontFamily: isArabic ? "'Inter', sans-serif" : "'Cairo', sans-serif",
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '8px',
                    }}
                  >
                    {subTitle}
                  </span>

                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Curated Heritage Stories (Varied Layout Composition) */}
      <section style={{ padding: 'clamp(44px, 7vw, 72px) 0', backgroundColor: 'var(--surface)' }}>
        <div className="container">
          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div>
              <div className="editorial-tag" style={{ marginBottom: '6px' }}>
                <span>{t('home.featuredBadge')}</span>
              </div>
              <h2
                style={{
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  margin: 0,
                }}
              >
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
                fontWeight: 700,
                fontSize: '14px',
                borderBottom: '1px solid var(--secondary)',
                paddingBottom: '2px',
              }}
            >
              <span>{t('home.viewAll')}</span>
              <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '18px' }}>
                arrow_forward
              </span>
            </Link>
          </div>

          {/* COMPOSITION 1: Lead Hero Feature Story (Giza Pyramids) */}
          {leadPlace && (
            <div className="editorial-lead-story">
              {/* Cinematic Imagery */}
              <div style={{ position: 'relative', minHeight: '340px' }}>
                <img
                  src={leadPlace.image}
                  alt={getPlaceName(leadPlace)}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    insetInlineStart: '16px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="badge badge-unesco">
                    {isArabic ? 'تراث عالمي (اليونسكو)' : 'UNESCO World Heritage'}
                  </span>
                  <span className="badge badge-wonder">
                    {isArabic ? 'عجائب الدنيا السبع' : 'Seven Wonders'}
                  </span>
                </div>

                {/* Bookmark Action */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(leadPlace.id, getPlaceName(leadPlace))}
                  aria-label={isFavorite(leadPlace.id) ? 'Remove favorite' : 'Add favorite'}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    insetInlineEnd: '16px',
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#FFFFFF',
                    color: isFavorite(leadPlace.id) ? 'var(--error)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    className={`material-symbols-outlined ${isFavorite(leadPlace.id) ? 'material-filled' : ''}`}
                    style={{ fontSize: '20px' }}
                  >
                    {isFavorite(leadPlace.id) ? 'bookmark' : 'bookmark_border'}
                  </span>
                </button>
              </div>

              {/* Editorial Narrative Column */}
              <div
                style={{
                  padding: 'clamp(24px, 4vw, 36px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: 'var(--secondary)',
                      fontWeight: 700,
                      marginBottom: '8px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      location_on
                    </span>
                    <span>{getPlaceCity(leadPlace)}</span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span>{getPlaceCategory(leadPlace)}</span>
                  </div>

                  <h3
                    style={{
                      fontSize: 'clamp(22px, 3vw, 28px)',
                      fontWeight: 900,
                      color: 'var(--primary)',
                      lineHeight: 1.25,
                      margin: '0 0 14px',
                    }}
                  >
                    {getPlaceName(leadPlace)}
                  </h3>

                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.7,
                      marginBottom: '20px',
                    }}
                  >
                    {leadPlace.historicalText && (isArabic ? leadPlace.historicalText : (leadPlace.historicalTextEn || leadPlace.historicalText))}
                  </p>

                  {/* Architectural Metrics */}
                  <div className="lead-metrics-grid">
                    {(isArabic ? leadPlace.metrics : (leadPlace.metricsEn || leadPlace.metrics) || []).map((m, i) => (
                      <div key={i} style={{ textAlign: 'center', minWidth: 0 }}>
                        <div className="metric-val" style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '15px' }}>{m.value}</div>
                        <div className="metric-lbl" style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px', wordBreak: 'break-word' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>
                      schedule
                    </span>
                    <span>{isArabic ? leadPlace.quickInfo?.duration : (leadPlace.quickInfo?.durationEn || leadPlace.quickInfo?.duration)}</span>
                  </div>

                  <Link to={`/places/${leadPlace.id}`} className="btn-primary" style={{ minHeight: '40px' }}>
                    <span>{isArabic ? 'قراءة التوثيق الميداني' : 'Read Monograph'}</span>
                    <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* COMPOSITION 2: The Editorial Diptych (2 Vertical Portrait Cards) */}
          <div className="diptych-grid">
            {diptychPlaces.map((place) => {
              const name = getPlaceName(place);
              const city = getPlaceCity(place);
              const desc = getPlaceDescription(place);
              const saved = isFavorite(place.id);

              return (
                <div
                  key={place.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-card)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden' }}>
                    <img
                      src={place.image}
                      alt={name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        insetInlineStart: '12px',
                        display: 'flex',
                        gap: '6px',
                      }}
                    >
                      <span className="badge badge-unesco" style={{ fontSize: '11px' }}>
                        {city}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(place.id, name)}
                      aria-label={saved ? 'Remove favorite' : 'Add favorite'}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        insetInlineEnd: '12px',
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#FFFFFF',
                        color: saved ? 'var(--error)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span
                        className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`}
                        style={{ fontSize: '18px' }}
                      >
                        {saved ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>
                  </div>

                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="editorial-tag" style={{ marginBottom: '4px' }}>
                        <span>{getPlaceCategory(place)}</span>
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 8px' }}>
                        {name}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                        {desc}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '20px',
                        paddingTop: '14px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>
                        {place.coordinates}
                      </span>
                      <Link to={`/places/${place.id}`} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>
                        <span>{t('home.detailsBtn')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* COMPOSITION 3: Archival Ledger / Catalog Entries */}
          <div className="archival-grid">
            {archivalPlaces.map((place) => {
              const name = getPlaceName(place);
              const city = getPlaceCity(place);
              const saved = isFavorite(place.id);

              return (
                <div
                  key={place.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <img
                      src={place.image}
                      alt={name}
                      loading="lazy"
                      style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: 'var(--radius-sm)',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 700 }}>
                        {city}
                      </div>
                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: 'var(--primary)',
                          margin: '2px 0 4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {name}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                        {getPlaceCategory(place)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '14px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFavorite(place.id, name)}
                      style={{
                        color: saved ? 'var(--secondary)' : 'var(--text-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`} style={{ fontSize: '18px' }}>
                        {saved ? 'bookmark' : 'bookmark_border'}
                      </span>
                      <span>{saved ? (isArabic ? 'محفوظ' : 'Saved') : (isArabic ? 'حفظ' : 'Save')}</span>
                    </button>

                    <Link
                      to={`/places/${place.id}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{t('home.detailsBtn')}</span>
                      <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Heritage Journey Banner (Offline Travel & Journal) */}
      <section style={{ padding: 'clamp(28px, 5vw, 48px) 0 60px', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="journey-banner">
            <div style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '22px' }}>
                  auto_awesome
                </span>
                <span style={{ color: 'var(--gold)', fontWeight: '800', fontSize: '13px', letterSpacing: '0.04em' }}>
                  {t('home.journeyBannerBadge')}
                </span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: '800', margin: '4px 0 10px', lineHeight: 1.3 }}>
                {t('home.journeyBannerTitle')}
              </h2>
              <p style={{ color: 'var(--beige)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                {t('home.journeyBannerDesc')}
              </p>
            </div>

            <div className="journey-banner-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/favorites" className="btn-gold">
                <span className="material-symbols-outlined material-filled" style={{ fontSize: '18px' }}>
                  bookmark
                </span>
                <span>{t('home.journeyBannerBtnSaved')}</span>
              </Link>
              <Link
                to="/explore"
                className="btn-outline"
                style={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  backgroundColor: 'transparent',
                }}
              >
                <span>{t('home.journeyBannerBtnAll')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
