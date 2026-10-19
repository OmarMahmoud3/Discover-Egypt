import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PLACES_DATA } from '../data/placesData';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import PlacesMap from '../Components/PlacesMap';
import VoiceSearchButton from '../Components/VoiceSearchButton';
import { matchesDestination } from '../lib/searchUtils';

export default function Explore() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCity = searchParams.get('city') || 'all';
  const initialView = searchParams.get('view') === 'map' ? 'map' : 'grid';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState(initialView);
  const [supabasePlaces, setSupabasePlaces] = useState([]);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceCategory, getPlaceDescription } = useLanguage();

  // Load any published places from user's Supabase database
  useEffect(() => {
    async function loadPlaces() {
      try {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .eq('is_published', true);
        if (!error && data && data.length > 0) {
          setSupabasePlaces(data);
        }
      } catch (err) {
        console.warn('Supabase fetch notice:', err);
      }
    }
    loadPlaces();
  }, []);

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
        { key: 'garden', label: 'حدائق ومتنزهات' },
        { key: 'cultural', label: 'مراكز ثقافية' },
        { key: 'engineering', label: 'معالم هندسية' },
      ]
    : [
        { key: 'all', label: 'All Categories' },
        { key: 'historical', label: 'Monuments & History' },
        { key: 'museum', label: 'Museums' },
        { key: 'religious', label: 'Religious Landmarks' },
        { key: 'heritage', label: 'Heritage & Markets' },
        { key: 'nature', label: 'Nature & Reserves' },
        { key: 'beach', label: 'Beaches & Resorts' },
        { key: 'landmark', label: 'Iconic Landmarks' },
        { key: 'garden', label: 'Gardens & Parks' },
        { key: 'cultural', label: 'Cultural Centers' },
        { key: 'engineering', label: 'Engineering Marvels' },
      ];

  // Combine local rich places with any dynamic supabase places (Supabase edits take priority)
  const allPlaces = useMemo(() => {
    // 1. Map Supabase places
    const dynamicList = supabasePlaces.map((sp) => {
      const staticMatch = PLACES_DATA.find((p) => p.id === sp.id || p.id === sp.slug);
      return {
        id: sp.id,
        name: sp.name,
        name_en: sp.name_en || sp.name,
        nameEn: sp.name_en || sp.name,
        city: sp.city || staticMatch?.city || (isArabic ? 'مصر' : 'Egypt'),
        city_en: sp.city_en || sp.city || staticMatch?.cityEn || 'Egypt',
        cityEn: sp.city_en || sp.city || staticMatch?.cityEn || 'Egypt',
        cityKey: (sp.city_en || sp.city || staticMatch?.cityKey || '').toLowerCase(),
        category: sp.category || staticMatch?.category || (isArabic ? 'معلم سياحي' : 'Attraction'),
        category_en: sp.category_en || sp.category || staticMatch?.categoryEn || 'Attraction',
        categoryEn: sp.category_en || sp.category || staticMatch?.categoryEn || 'Attraction',
        categoryKey: staticMatch?.categoryKey || 'historical',
        latitude: sp.latitude !== undefined && sp.latitude !== null ? sp.latitude : staticMatch?.latitude,
        longitude: sp.longitude !== undefined && sp.longitude !== null ? sp.longitude : staticMatch?.longitude,
        rating: staticMatch?.rating || 4.8,
        reviewCount: staticMatch?.reviewCount || '1,200',
        image: sp.image_url || staticMatch?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCao0_zDTQ8frEJZNDu_1tm-2N4fczbSoYCt6ac4edUah5oV9SbFC7p7q8VacMNwgF7Pwxikq1qjB9GQ-_aCIDgMOu_F-_Xo26nxq2PxOn02XJSCNquHBHi49acxYauO6VY7PobKN0gABl36WJU_cU2iftmnc5jbBK6JmShVWWHnRaBl-WzR2mwRD6rxEWKuJYTCxRFT7GEQ1NGbmqfdhem5otkALIcQc56Kw6aaFiZ0JHF5YJAG1-oLg',
        quickInfo: staticMatch?.quickInfo || {
          duration: 'ساعتان مقترحة',
          durationEn: '2 hours suggested',
        },
        historicalText: sp.description || staticMatch?.historicalText || 'معلم سياحي وتراثي متميز في جمهورية مصر العربية.',
        historicalTextEn: sp.description_en || sp.description || staticMatch?.historicalTextEn || 'A prominent historical and tourism landmark in Egypt.',
      };
    });

    // 2. Add static places that haven't been edited or overridden in Supabase
    const combined = [...dynamicList];
    PLACES_DATA.forEach((staticP) => {
      if (!combined.some((p) => p.id === staticP.id || p.id === staticP.slug)) {
        combined.push(staticP);
      }
    });

    return combined;
  }, [supabasePlaces, isArabic]);

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
        (selectedCategory === 'heritage' && (p.category === 'تراث وأسواق' || p.category === 'أسواق وتراث' || p.categoryKey === 'heritage' || p.categoryEn?.includes('Heritage') || p.categoryEn?.includes('Markets'))) ||
        (selectedCategory === 'nature' && (p.category === 'محميات وطبيعة' || p.categoryKey === 'nature' || p.categoryEn?.includes('Nature'))) ||
        (selectedCategory === 'beach' && (p.category === 'شواطئ ومنتجعات' || p.categoryKey === 'beach' || p.categoryKey === 'island' || p.categoryEn?.includes('Beach'))) ||
        (selectedCategory === 'landmark' && (p.category === 'معالم بارزة' || p.categoryKey === 'landmark' || p.categoryEn?.includes('Landmark'))) ||
        (selectedCategory === 'garden' && (p.category === 'حدائق ومتنزهات' || p.categoryKey === 'garden' || p.categoryEn?.includes('Garden'))) ||
        (selectedCategory === 'cultural' && (p.category === 'مراكز ثقافية' || p.categoryKey === 'cultural' || p.categoryEn?.includes('Cultural'))) ||
        (selectedCategory === 'engineering' && (p.category === 'معالم هندسية' || p.categoryKey === 'engineering' || p.categoryEn?.includes('Engineering')));

      return matchQuery && matchCity && matchCategory;
    });
  }, [allPlaces, query, selectedCity, selectedCategory, getPlaceName, getPlaceCity, getPlaceCategory]);

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', padding: '36px 16px 90px' }}>
      <div className="container">
        {/* Editorial Atlas Header */}
        <div style={{ maxWidth: '780px', margin: '0 auto 36px', textAlign: 'center' }}>
          <div className="editorial-tag" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span>{t('explore.badge')}</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 40px)',
              fontWeight: 900,
              color: 'var(--primary)',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            {t('explore.title')}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            {t('explore.desc')}
          </p>
        </div>

        {/* Architectural Filter & Search Console */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-card)',
            padding: 'clamp(14px, 3.5vw, 24px)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Search Input Field */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '6px 14px',
              minHeight: '44px',
              transition: 'border-color 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>
              search
            </span>
            <input
              type="text"
              placeholder={t('explore.searchPlaceholder')}
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
                  minWidth: '36px',
                  minHeight: '36px',
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
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('explore.cityLabel')}
            </span>
            {cities.map((c) => {
              const active = selectedCity === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCity(c.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                    color: active ? '#FFFFFF' : 'var(--primary)',
                    border: active ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                    minHeight: '38px',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
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
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('explore.categoryLabel')}
            </span>
            {categories.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: active ? 'var(--secondary)' : 'var(--surface)',
                    color: active ? '#FFFFFF' : 'var(--primary)',
                    border: active ? '1px solid var(--secondary-dark)' : '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                    minHeight: '38px',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter & View Switcher Console */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '22px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t('explore.foundCount', { count: filtered.length })}
            </span>

            {(query || selectedCity !== 'all' || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedCity('all');
                  setSelectedCategory('all');
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
          </div>

          {/* Segmented View Mode Switcher: Grid vs Map */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              id="explore-view-grid-btn"
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label={t('map.viewList')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                grid_view
              </span>
              <span>{t('map.viewList')}</span>
            </button>

            <button
              id="explore-view-map-btn"
              type="button"
              onClick={() => setViewMode('map')}
              aria-label={t('map.viewMap')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'map' ? 'var(--secondary)' : 'transparent',
                color: viewMode === 'map' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                map
              </span>
              <span>{t('map.viewMap')}</span>
            </button>
          </div>
        </div>

        {/* View Mode Switching: Interactive Map or Editorial Grid */}
        {viewMode === 'map' ? (
          <div id="explore-map-container" style={{ marginBottom: '20px' }}>
            <PlacesMap places={filtered} />
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--gold)' }}>
              travel_explore
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '12px' }}>
              {t('explore.noResultsTitle')}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {t('explore.noResultsDesc')}
            </p>
          </div>
        ) : (
          <div className="explore-grid">
            {filtered.map((place) => {
              const saved = isFavorite(place.id);
              const name = getPlaceName(place);
              const city = getPlaceCity(place);
              const desc = getPlaceDescription(place);
              const category = getPlaceCategory(place);

              return (
                <article
                  key={place.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-card)',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
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
                      aria-label={saved ? t('home.removeFavorite') : t('home.addFavorite')}
                      title={saved ? t('home.removeFavorite') : t('home.addFavorite')}
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

                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="editorial-tag" style={{ marginBottom: '4px' }}>
                        <span>{category}</span>
                      </div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 8px' }}>
                        {name}
                      </h2>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          lineHeight: 1.65,
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
                        marginTop: '18px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>
                        {place.coordinates || (place.quickInfo && (isArabic ? place.quickInfo.duration : place.quickInfo.durationEn))}
                      </span>

                      <Link
                        to={`/places/${place.id}`}
                        className="btn-outline"
                        style={{ padding: '7px 14px', fontSize: '12px' }}
                      >
                        <span>{t('explore.viewDetailsBtn')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '15px' }}>
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
