import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PlacesMap from '../Components/PlacesMap';
import { usePlaces } from '../context/PlacesContext';
import { useLanguage } from '../context/LanguageContext';
import VoiceSearchButton from '../Components/VoiceSearchButton';
import { matchesDestination } from '../lib/searchUtils';

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCity = searchParams.get('city') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  const { places: allPlaces, loading, error: fetchError, refreshPlaces: handleRetry } = usePlaces();
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceCategory } = useLanguage();

  // Cities List for Filter
  const cities = isArabic
    ? [
        { key: 'all', label: 'جميع المدن' },
        { key: 'القاهرة', label: 'القاهرة' },
        { key: 'الجيزة', label: 'الجيزة' },
        { key: 'الإسكندرية', label: 'الإسكندرية' },
        { key: 'الأقصر', label: 'الأقصر' },
        { key: 'أسوان', label: 'أسوان' },
        { key: 'جنوب سيناء', label: 'جنوب سيناء' },
        { key: 'البحر الأحمر', label: 'البحر الأحمر' },
        { key: 'الفيوم', label: 'الفيوم' },
        { key: 'مطروح', label: 'مطروح وسيوة' },
        { key: 'الوادي الجديد', label: 'الوادي الجديد' },
        { key: 'البحيرة', label: 'البحيرة ورشيد' },
        { key: 'الشرقية', label: 'الشرقية' },
        { key: 'قنا', label: 'قنا' },
        { key: 'سوهاج', label: 'سوهاج' },
      ]
    : [
        { key: 'all', label: 'All Cities' },
        { key: 'cairo', label: 'Cairo' },
        { key: 'giza', label: 'Giza' },
        { key: 'alexandria', label: 'Alexandria' },
        { key: 'luxor', label: 'Luxor' },
        { key: 'aswan', label: 'Aswan' },
        { key: 'south-sinai', label: 'South Sinai' },
        { key: 'red-sea', label: 'Red Sea' },
        { key: 'fayoum', label: 'Fayoum' },
        { key: 'matrouh', label: 'Matrouh & Siwa' },
        { key: 'new-valley', label: 'New Valley' },
        { key: 'beheira', label: 'Beheira & Rosetta' },
        { key: 'sharqia', label: 'Sharqia' },
        { key: 'qena', label: 'Qena' },
        { key: 'sohag', label: 'Sohag' },
      ];

  const categories = isArabic
    ? [
        { key: 'all', label: 'كل التصنيفات' },
        { key: 'historical', label: 'آثار وتاريخ' },
        { key: 'museum', label: 'متاحف' },
        { key: 'religious', label: 'معالم دينية' },
        { key: 'heritage', label: 'تراث وأسواق' },
        { key: 'nature', label: 'محميات وطبيعة' },
        { key: 'beach', label: 'شواطئ ومنتجعات' },
        { key: 'landmark', label: 'معالم بارزة' },
      ]
    : [
        { key: 'all', label: 'All Categories' },
        { key: 'historical', label: 'Monuments & History' },
        { key: 'museum', label: 'Museums' },
        { key: 'religious', label: 'Religious' },
        { key: 'heritage', label: 'Heritage & Markets' },
        { key: 'nature', label: 'Nature & Reserves' },
        { key: 'beach', label: 'Beaches & Resorts' },
        { key: 'landmark', label: 'Iconic Landmarks' },
      ];

  // Filter places
  const filtered = useMemo(() => {
    return allPlaces.filter((p) => {
      const pName = getPlaceName(p).toLowerCase();
      const pCity = getPlaceCity(p).toLowerCase();
      const pCategory = getPlaceCategory(p).toLowerCase();
      const q = query.trim().toLowerCase();

      const matchQuery =
        !q ||
        matchesDestination(p, query) ||
        pName.includes(q) ||
        pCity.includes(q) ||
        pCategory.includes(q) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q));

      const matchCity =
        selectedCity === 'all' ||
        p.cityKey === selectedCity.toLowerCase() ||
        p.city === selectedCity ||
        (p.city && p.city.includes(selectedCity)) ||
        (p.cityEn && p.cityEn.toLowerCase().includes(selectedCity.toLowerCase())) ||
        (p.locationShort && p.locationShort.includes(selectedCity));

      const matchCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.categoryKey === selectedCategory ||
        (selectedCategory === 'historical' && (p.category === 'آثار وتاريخ' || p.categoryKey === 'historical' || p.categoryEn?.includes('Monuments'))) ||
        (selectedCategory === 'museum' && (p.category === 'متاحف' || p.categoryKey === 'museum' || p.categoryEn?.includes('Museum'))) ||
        (selectedCategory === 'religious' && (p.category === 'معالم دينية' || p.categoryKey === 'religious' || p.categoryEn?.includes('Religious'))) ||
        (selectedCategory === 'heritage' && (p.category === 'تراث وأسواق' || p.category === 'أسواق وتراث' || p.categoryKey === 'heritage' || p.categoryEn?.includes('Heritage'))) ||
        (selectedCategory === 'nature' && (p.category === 'محميات وطبيعة' || p.categoryKey === 'nature' || p.categoryEn?.includes('Nature'))) ||
        (selectedCategory === 'beach' && (p.category === 'شواطئ ومنتجعات' || p.categoryKey === 'beach' || p.categoryEn?.includes('Beach'))) ||
        (selectedCategory === 'landmark' && (p.category === 'معالم بارزة' || p.categoryKey === 'landmark' || p.categoryEn?.includes('Landmark')));

      return matchQuery && matchCity && matchCategory;
    });
  }, [allPlaces, query, selectedCity, selectedCategory, getPlaceName, getPlaceCity, getPlaceCategory]);

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', padding: '32px 16px 90px' }}>
      <div className="container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header Atlas Banner */}
        <div style={{ maxWidth: '820px', margin: '0 auto 28px', textAlign: 'center' }}>
          <div className="editorial-tag" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span>{t('map.badge')}</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 38px)',
              fontWeight: 900,
              color: 'var(--primary)',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            {t('map.title')}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            {t('map.subtitle')}
          </p>
        </div>

        {/* Filter and Search Console */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-card)',
            padding: 'clamp(14px, 3vw, 20px)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '6px 14px',
              minHeight: '44px',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>
              search
            </span>
            <input
              type="text"
              placeholder={t('map.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                padding: '8px 12px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--primary)',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  color: 'var(--text-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '32px',
                  minHeight: '32px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                }}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  close
                </span>
              </button>
            )}
            <VoiceSearchButton
              onTranscript={(transcript) => setQuery(transcript)}
            />
          </div>

          {/* City Segmented Filters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '4px',
            }}
            className="no-scrollbar"
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
              {t('map.city')}:
            </span>
            {cities.map((c) => {
              const active = selectedCity === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCity(c.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                    color: active ? '#FFFFFF' : 'var(--primary)',
                    border: active ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                    minHeight: '34px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Category Segmented Filters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '4px',
            }}
            className="no-scrollbar"
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
              {t('map.category')}:
            </span>
            {categories.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: active ? 'var(--secondary)' : 'var(--surface)',
                    color: active ? '#FFFFFF' : 'var(--primary)',
                    border: active ? '1px solid var(--secondary-dark)' : '1px solid var(--border)',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                    minHeight: '34px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Supabase Fetch Error Notification with Retry */}
        {fetchError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                warning
              </span>
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--error)',
                fontWeight: 700,
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {isArabic ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* Counter & Mode Nav Link to /explore */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t('map.placesCount', { count: filtered.length })}
            </span>
            {loading && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--secondary)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="material-symbols-outlined spinning" style={{ fontSize: '15px' }}>
                  sync
                </span>
                <span>جارٍ التحديث...</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(query || selectedCity !== 'all' || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedCity('all');
                  setSelectedCategory('all');
                  setSelectedPlaceId(null);
                }}
                style={{
                  fontSize: '13px',
                  color: 'var(--error)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  restart_alt
                </span>
                <span>{t('explore.resetFilters')}</span>
              </button>
            )}

            <Link
              to="/explore"
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                grid_view
              </span>
              <span>{t('map.viewList')}</span>
            </Link>
          </div>
        </div>

        {/* Main Map + Side Panel Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) clamp(280px, 30vw, 360px)',
            gap: '20px',
            alignItems: 'start',
          }}
          className="map-page-layout-grid"
        >
          {/* Interactive Map Viewport */}
          <div style={{ width: '100%', minWidth: 0 }}>
            <PlacesMap
              places={filtered}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(place) => setSelectedPlaceId(place ? (place.id || place.slug) : null)}
              className="map-page-atlas-map"
            />
          </div>

          {/* Accessible Side Destinations Explorer */}
          <aside
            className="map-page-sidebar"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                {isArabic ? 'دليل المعالم المعروضة' : 'Visible Destinations'}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--surface)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                {filtered.length}
              </span>
            </div>

            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingInlineEnd: '4px',
              }}
              tabIndex={0}
              aria-label={isArabic ? 'قائمة المعالم السياحية' : 'Destinations list'}
            >
              {filtered.map((place) => {
                const name = getPlaceName(place);
                const city = getPlaceCity(place);
                const isSelected = selectedPlaceId && (String(place.id) === String(selectedPlaceId) || place.slug === selectedPlaceId);

                return (
                  <div
                    key={place.id || place.slug}
                    onClick={() => setSelectedPlaceId(place.id || place.slug)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--gold-surface)' : 'var(--surface)',
                      border: isSelected ? '1px solid var(--gold)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {place.image && (
                      <img
                        src={place.image}
                        alt={name}
                        loading="lazy"
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {city}
                      </div>
                    </div>
                    <Link
                      to={`/places/${place.slug || place.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title={t('map.viewDetails')}
                      style={{
                        padding: '6px',
                        color: 'var(--secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '18px' }}>
                        open_in_new
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .map-page-atlas-map {
          height: clamp(480px, 68vh, 740px);
        }
        .map-page-sidebar {
          max-height: clamp(480px, 68vh, 740px);
        }
        @media (max-width: 960px) {
          .map-page-layout-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .map-page-atlas-map {
            height: clamp(340px, 50vh, 460px) !important;
          }
          .map-page-sidebar {
            max-height: 400px !important;
          }
        }
        @media (max-width: 480px) {
          .map-page-atlas-map {
            height: clamp(320px, 48vh, 400px) !important;
          }
        }
      `}</style>
    </div>
  );
}
