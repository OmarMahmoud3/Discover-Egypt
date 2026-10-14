import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

export default function Favorites() {
  const { favoritePlaces, removeFavorite, clearAllFavorites, showToast } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceDescription } = useLanguage();
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
        title: isArabic ? 'أماكني المفضلة في مصر — اكتشف مصر' : 'My Favorite Places in Egypt — Discover Egypt',
        text: isArabic
          ? `شاهد قائمة وجهاتي المفضلة في مصر (${favoritePlaces.length} أماكن محفوظة)!`
          : `Check out my favorite travel places in Egypt (${favoritePlaces.length} saved destinations)!`,
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

  const cityTabs = [
    { key: 'giza', label: isArabic ? 'الجيزة' : 'Giza' },
    { key: 'luxor', label: isArabic ? 'الأقصر' : 'Luxor' },
    { key: 'cairo', label: isArabic ? 'القاهرة' : 'Cairo' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', padding: '24px 16px 100px' }}>
      <div className="container-narrow">
        {/* Header Section */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {/* Badge */}
          <div style={{ alignSelf: 'flex-start' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '9999px',
                backgroundColor: 'var(--secondary-surface)',
                color: 'var(--secondary)',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              <span className="material-symbols-outlined material-filled" style={{ fontSize: '15px' }}>
                bookmark_heart
              </span>
              <span>{t('favorites.personalBadge')}</span>
            </div>
          </div>

          {/* Title & Live Counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: '800',
                color: 'var(--primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {t('favorites.title')}
            </h1>

            <span
              style={{
                padding: '4px 14px',
                borderRadius: '9999px',
                backgroundColor: 'var(--surface-container)',
                color: 'var(--primary)',
                fontSize: '13px',
                fontWeight: '700',
              }}
            >
              {favoritePlaces.length > 0
                ? t('favorites.savedCountSuffix', { count: favoritePlaces.length })
                : t('favorites.noPlaces')}
            </span>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {t('favorites.desc')}
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '8px' }}>
            <button
              onClick={handleShareList}
              className="btn-primary"
              style={{ height: '42px', padding: '0 18px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                share
              </span>
              <span>{t('favorites.shareList')}</span>
            </button>

            <button
              onClick={handleClearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '42px',
                padding: '0 14px',
                borderRadius: '12px',
                color: 'var(--error)',
                backgroundColor: 'transparent',
                fontWeight: '700',
                fontSize: '13px',
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
          </div>

          {/* City Filter Pills */}
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingTop: '6px',
              paddingBottom: '4px',
            }}
          >
            <button
              onClick={() => setActiveCity('all')}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: '9999px',
                backgroundColor: activeCity === 'all' ? 'var(--secondary)' : 'var(--surface-container)',
                color: activeCity === 'all' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                grid_view
              </span>
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
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    backgroundColor: isSelected ? 'var(--secondary)' : 'var(--surface-container)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{tab.label} ({count})</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Saved Places Cards Feed */}
        {displayedPlaces.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {displayedPlaces.map((place) => {
              const placeName = getPlaceName(place);
              const cityName = getPlaceCity(place);
              const desc = getPlaceDescription(place);
              const badge = isArabic ? place.badges?.[0] : (place.badgesEn?.[0] || place.badges?.[0]);
              const duration = isArabic
                ? place.quickInfo?.duration || 'ساعتان مقترحة'
                : place.quickInfo?.durationEn || place.quickInfo?.duration || '2 hours suggested';

              let featureTag = t('favorites.unescoRegistered');
              if (place.cityKey === 'luxor') featureTag = t('favorites.sunriseVisit');
              if (place.cityKey === 'cairo') featureTag = t('favorites.eveningVibe');

              return (
                <article
                  key={place.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Card Top Image & Badges */}
                  <div style={{ position: 'relative', width: '100%', height: '210px', overflow: 'hidden' }}>
                    <img
                      src={place.image}
                      alt={placeName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(18, 48, 74, 0.85) 0%, rgba(18, 48, 74, 0.2) 60%, transparent 100%)',
                      }}
                    />

                    {/* Badges on Top End */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        insetInlineEnd: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {badge && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(18, 48, 74, 0.85)',
                            backdropFilter: 'blur(8px)',
                            color: 'var(--gold)',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}
                        >
                          {badge}
                        </span>
                      )}
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(255, 255, 255, 0.92)',
                          backdropFilter: 'blur(8px)',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          fontWeight: '800',
                        }}
                      >
                        {cityName}
                      </span>
                    </div>

                    {/* Remove Button on Top Start */}
                    <button
                      onClick={() => removeFavorite(place.id, placeName)}
                      aria-label={isArabic ? `إزالة ${placeName} من المفضلة` : `Remove ${placeName} from favorites`}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        insetInlineStart: '12px',
                        width: '38px',
                        height: '38px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(8px)',
                        color: 'var(--error)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.15s',
                      }}
                      title={isArabic ? 'حذف من المفضلة' : 'Remove from favorites'}
                    >
                      <span className="material-symbols-outlined material-filled" style={{ fontSize: '20px' }}>
                        delete
                      </span>
                    </button>

                    {/* Rating & Suggested Time on Bottom */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        insetInlineEnd: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--gold)' }}>
                        <span className="material-symbols-outlined material-filled" style={{ fontSize: '15px' }}>
                          star
                        </span>
                        <span>{place.rating}</span>
                      </div>
                      <span>•</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          schedule
                        </span>
                        <span>{duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                        {placeName}
                      </h2>
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
                        flexWrap: 'wrap',
                        gap: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--surface-low)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--secondary)',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        <span className="material-symbols-outlined material-filled" style={{ fontSize: '16px' }}>
                          verified
                        </span>
                        <span>{featureTag}</span>
                      </div>

                      <Link
                        to={`/places/${place.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--surface-container)',
                          color: 'var(--primary)',
                          fontSize: '13px',
                          fontWeight: '700',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--secondary)';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--surface-container)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }}
                      >
                        <span>{t('favorites.viewDetailsBtn')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                          arrow_back
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          /* Empty State View */
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '56px 20px',
              borderRadius: '24px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)',
              gap: '16px',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '9999px',
                backgroundColor: 'var(--surface-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--gold-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined material-filled" style={{ fontSize: '32px', color: 'var(--gold)' }}>
                  favorite
                </span>
              </div>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  insetInlineStart: '-2px',
                  fontSize: '24px',
                  color: 'var(--secondary)',
                }}
              >
                explore
              </span>
            </div>

            <div style={{ maxWidth: '340px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                {t('favorites.emptyTitle')}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
                {t('favorites.emptyDesc')}
              </p>
            </div>

            <Link to="/explore" className="btn-primary" style={{ marginTop: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                travel_explore
              </span>
              <span>{t('favorites.startExploring')}</span>
            </Link>
          </section>
        )}

        {/* Itinerary Readiness Banner */}
        {favoritePlaces.length > 0 && (
          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '18px 20px',
              borderRadius: '20px',
              backgroundColor: 'var(--surface-low)',
              marginTop: '24px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: 'var(--secondary-surface)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                map
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>
                  {t('favorites.itineraryTitle')}
                </span>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--secondary)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}
                >
                  {t('favorites.provinces', { count: governorateCount })}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                {t('favorites.itineraryDesc')}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
