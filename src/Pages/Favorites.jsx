import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';


  const knownCityLabels = {
          giza: { ar: 'الجيزة', en: 'Giza' },
          luxor: { ar: 'الأقصر', en: 'Luxor' },
          cairo: { ar: 'القاهرة', en: 'Cairo' },
          aswan: { ar: 'أسوان', en: 'Aswan' },
          alexandria: { ar: 'الإسكندرية', en: 'Alexandria' },
          sinai: { ar: 'سيناء', en: 'Sinai' },
          redsea: { ar: 'البحر الأحمر', en: 'Red Sea' },
        };


export default function Favorites() {
  const { favoritePlaces, removeFavorite, clearAllFavorites, showToast } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceDescription, getPlaceCategory } = useLanguage();
  const [activeCity, setActiveCity] = useState('all');

  // Cities count calculation
  const cityCounts = useMemo(() => {
    const counts = { all: favoritePlaces.length };
    favoritePlaces.forEach((p) => {
      counts[p.cityKey] = (counts[p.cityKey] || 0) + 1;
    });
    return counts;
  }, [favoritePlaces]);

  // Unique provinces/governorates represented
  const governorateCount = useMemo(() => {
    const unique = new Set(favoritePlaces.map((p) => p.city));
    return unique.size;
  }, [favoritePlaces]);

  // Filtered places
  const displayedPlaces = useMemo(() => {
    if (activeCity === 'all') return favoritePlaces;
    return favoritePlaces.filter((p) => p.cityKey === activeCity);
  }, [favoritePlaces, activeCity]);

  // Share action
  const handleShareList = () => {
    if (navigator.share) {
      navigator.share({
        title: isArabic ? 'دفتري الميداني لوجهات مصر — اكتشف مصر' : 'My Curated Egyptian Travel Journal — Discover Egypt',
        text: isArabic
          ? `شاهد قائمة وجهاتي المحفوظة في مصر (${favoritePlaces.length} معالم موثقة)!`
          : `Explore my saved heritage destinations in Egypt (${favoritePlaces.length} documented landmarks)!`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(window.location.href);
      showToast(t('favorites.shareCopiedToast'));
    }
  };
  




  // Clear action with prompt
  const handleClearAll = () => {
    if (favoritePlaces.length === 0) {
      showToast(t('favorites.clearEmptyToast'));
      return;
    }
    if (window.confirm(t('favorites.clearConfirm'))) {
      clearAllFavorites(t('favorites.clearSuccessToast'));

    }
  };


  const cityTabs = useMemo(() => {
    const presentKeys = new Set();
    const tabs = [];
    favoritePlaces.forEach((p) => {
      const key = p.cityKey || (p.cityEn || p.city || '').toLowerCase().trim();
      if (key && !presentKeys.has(key)) {
        presentKeys.add(key);
        const label = isArabic
          ? knownCityLabels[key]?.ar || p.city || key
          : knownCityLabels[key]?.en || p.cityEn || p.city || key;
        tabs.push({ key, label });
      }
    });
    return tabs;
  }, [favoritePlaces, isArabic]);

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', padding: '36px 16px 90px' }}>
      <div className="container-narrow">
        {/* Header Section */}
        <header style={{ marginBottom: '28px' }}>
          <div className="editorial-tag" style={{ marginBottom: '8px' }}>
            <span>{t('favorites.personalBadge')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <h1
              style={{
                fontSize: 'clamp(26px, 4vw, 36px)',
                fontWeight: 900,
                color: 'var(--primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {t('favorites.title')}
            </h1>

            <span
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-low)',
                border: '1px solid var(--border)',
                color: 'var(--primary)',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {favoritePlaces.length > 0
                ? t('favorites.savedCountSuffix', { count: favoritePlaces.length })
                : t('favorites.noPlaces')}
            </span>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 20px' }}>
            {t('favorites.desc')}
          </p>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={handleShareList}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                share
              </span>
              <span>{t('favorites.shareList')}</span>
            </button>

            {favoritePlaces.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--error)',
                  backgroundColor: 'transparent',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--error-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  delete_sweep
                </span>
                <span>{t('favorites.clearList')}</span>
              </button>
            )}
          </div>

          {/* Architectural City Filter Tabs */}
          {favoritePlaces.length > 0 && (
            <div
              className="no-scrollbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingTop: '16px',
              }}
            >
              <button
                onClick={() => setActiveCity('all')}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeCity === 'all' ? 'var(--primary)' : 'var(--surface)',
                  color: activeCity === 'all' ? '#FFFFFF' : 'var(--primary)',
                  border: activeCity === 'all' ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{t('favorites.allCities', { count: cityCounts.all || 0 })}</span>
              </button>

              {cityTabs.map((tab) => {
                const isSelected = activeCity === tab.key;
                const count = cityCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCity(tab.key)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--secondary)' : 'var(--surface)',
                      color: isSelected ? '#FFFFFF' : 'var(--primary)',
                      border: isSelected ? '1px solid var(--secondary-dark)' : '1px solid var(--border)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{tab.label} ({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Curated Journal Entries Feed */}
        {displayedPlaces.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {displayedPlaces.map((place) => {
              const placeName = getPlaceName(place);
              const cityName = getPlaceCity(place);
              const desc = getPlaceDescription(place);
              const category = getPlaceCategory(place);
              const duration = isArabic
                ? place.quickInfo?.duration || 'ساعتان مقترحة'
                : place.quickInfo?.durationEn || place.quickInfo?.duration || '2 hours suggested';

              return (
                <article
                  key={place.id}
                  className="journal-entry-card"
                >
                  {/* Journal Photo */}
                  <div style={{ position: 'relative', minHeight: '160px', aspectRatio: '16 / 10' }}>
                    <img
                      src={place.image}
                      alt={placeName}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineStart: '10px',
                      }}
                    >
                      <span className="badge badge-unesco" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {cityName}
                      </span>
                    </div>
                  </div>

                  {/* Journal Details */}
                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                        <div className="editorial-tag">
                          <span>{category}</span>
                        </div>
                        <button
                          onClick={() => removeFavorite(place.id, placeName)}
                          aria-label={isArabic ? `إزالة ${placeName}` : `Remove ${placeName}`}
                          style={{
                            color: 'var(--text-light)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={isArabic ? 'إزالة من الدفتر' : 'Remove from journal'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            bookmark_remove
                          </span>
                        </button>
                      </div>

                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 6px' }}>
                        {placeName}
                      </h2>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          margin: 0,
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
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--secondary)', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          schedule
                        </span>
                        <span>{duration}</span>
                      </div>

                      <Link
                        to={`/places/${place.id}`}
                        className="btn-outline"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        <span>{t('favorites.viewDetailsBtn')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '14px' }}>
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          /* Editorial Empty State View */
          <section
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              borderRadius: 'var(--radius-card)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--gold-dark)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                bookmark_border
              </span>
            </div>

            <div style={{ maxWidth: '420px', margin: '0 auto 20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 8px' }}>
                {t('favorites.emptyTitle')}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
                {t('favorites.emptyDesc')}
              </p>
            </div>

            <Link to="/explore" className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                travel_explore
              </span>
              <span>{t('favorites.startExploring')}</span>
            </Link>
          </section>
        )}

        {/* Itinerary Readiness Expedition Summary */}
        {favoritePlaces.length > 0 && (
          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              borderRadius: 'var(--radius-card)',
              backgroundColor: '#FFFFFF',
              marginTop: '28px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--secondary-surface)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                map
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>
                  {t('favorites.itineraryTitle')}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {t('favorites.provinces', { count: governorateCount })}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5, margin: 0 }}>
                {t('favorites.itineraryDesc')}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
