import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PLACES_DATA } from '../data/placesData';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function Explore() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCity = searchParams.get('city') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState('all');
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
        { key: 'الجيزة', label: 'الجيزة' },
        { key: 'الأقصر', label: 'الأقصر' },
        { key: 'القاهرة', label: 'القاهرة' },
        { key: 'أسوان', label: 'أسوان' },
        { key: 'الإسكندرية', label: 'الإسكندرية' },
      ]
    : [
        { key: 'all', label: 'All Cities' },
        { key: 'giza', label: 'Giza' },
        { key: 'luxor', label: 'Luxor' },
        { key: 'cairo', label: 'Cairo' },
        { key: 'aswan', label: 'Aswan' },
        { key: 'alexandria', label: 'Alexandria' },
      ];

  const categories = isArabic
    ? [
        { key: 'all', label: 'كل التصنيفات' },
        { key: 'آثار وتاريخ', label: 'آثار وتاريخ' },
        { key: 'أسواق وتراث', label: 'أسواق وتراث' },
        { key: 'متاحف', label: 'متاحف' },
      ]
    : [
        { key: 'all', label: 'All Categories' },
        { key: 'monuments', label: 'Monuments & History' },
        { key: 'markets', label: 'Markets & Heritage' },
        { key: 'museums', label: 'Museums' },
      ];

  // Combine local rich places with any dynamic supabase places (respecting name_en / city_en / etc.)
  const allPlaces = useMemo(() => {
    const combined = [...PLACES_DATA];
    supabasePlaces.forEach((sp) => {
      if (!combined.some((p) => p.id === sp.id || p.name === sp.name)) {
        combined.push({
          id: sp.id,
          name: sp.name,
          name_en: sp.name_en || sp.name,
          nameEn: sp.name_en || sp.name,
          city: sp.city || (isArabic ? 'مصر' : 'Egypt'),
          city_en: sp.city_en || sp.city || 'Egypt',
          cityEn: sp.city_en || sp.city || 'Egypt',
          cityKey: (sp.city_en || sp.city || '').toLowerCase(),
          category: sp.category || (isArabic ? 'معلم سياحي' : 'Attraction'),
          category_en: sp.category_en || sp.category || 'Attraction',
          categoryEn: sp.category_en || sp.category || 'Attraction',
          rating: 4.8,
          reviewCount: '1,200',
          image: sp.image_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCao0_zDTQ8frEJZNDu_1tm-2N4fczbSoYCt6ac4edUah5oV9SbFC7p7q8VacMNwgF7Pwxikq1qjB9GQ-_aCIDgMOu_F-_Xo26nxq2PxOn02XJSCNquHBHi49acxYauO6VY7PobKN0gABl36WJU_cU2iftmnc5jbBK6JmShVWWHnRaBl-WzR2mwRD6rxEWKuJYTCxRFT7GEQ1NGbmqfdhem5otkALIcQc56Kw6aaFiZ0JHF5YJAG1-oLg',
          quickInfo: {
            duration: 'ساعتان مقترحة',
            durationEn: '2 hours suggested',
          },
          historicalText: sp.description || 'معلم سياحي وتراثي متميز في جمهورية مصر العربية.',
          historicalTextEn: sp.description_en || sp.description || 'A prominent historical and tourism landmark in Egypt.',
        });
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
        pName.includes(q) ||
        pCity.includes(q) ||
        pCategory.includes(q) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q));

      const matchCity =
        selectedCity === 'all' ||
        p.cityKey === selectedCity.toLowerCase() ||
        p.city === selectedCity ||
        (p.cityEn && p.cityEn.toLowerCase() === selectedCity.toLowerCase());

      const matchCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        (selectedCategory === 'monuments' && (p.category === 'آثار وتاريخ' || p.categoryEn?.includes('Monuments'))) ||
        (selectedCategory === 'markets' && (p.category === 'أسواق وتراث' || p.categoryEn?.includes('Markets'))) ||
        (selectedCategory === 'museums' && (p.category === 'متاحف' || p.categoryEn?.includes('Museums')));

      return matchQuery && matchCity && matchCategory;
    });
  }, [allPlaces, query, selectedCity, selectedCategory, getPlaceName, getPlaceCity, getPlaceCategory]);

  return (
    <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', padding: '32px 16px 100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 36px' }}>
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
              marginBottom: '12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              explore
            </span>
            <span>{t('explore.badge')}</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--primary)', margin: '0 0 10px' }}>
            {t('explore.title')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {t('explore.desc')}
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface-low)',
              borderRadius: '14px',
              padding: '6px 14px',
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
                padding: '10px 12px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--primary)',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  close
                </span>
              </button>
            )}
          </div>

          {/* City Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }} className="no-scrollbar">
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', flexShrink: 0 }}>
              {t('explore.cityLabel')}
            </span>
            {cities.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCity(c.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: selectedCity === c.key ? 'var(--secondary)' : 'var(--surface-low)',
                  color: selectedCity === c.key ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '700',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }} className="no-scrollbar">
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', flexShrink: 0 }}>
              {t('explore.categoryLabel')}
            </span>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: selectedCategory === cat.key ? 'var(--primary)' : 'var(--surface-low)',
                  color: selectedCategory === cat.key ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '700',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>
            {t('explore.foundCount', { count: filtered.length })}
          </span>
          {(query || selectedCity !== 'all' || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedCity('all');
                setSelectedCategory('all');
              }}
              style={{ fontSize: '13px', color: 'var(--error)', fontWeight: '700' }}
            >
              {t('explore.resetFilters')}
            </button>
          )}
        </div>

        {/* Places Grid */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid var(--border)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--gold)' }}>
              travel_explore
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', marginTop: '12px' }}>
              {t('explore.noResultsTitle')}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {t('explore.noResultsDesc')}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
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
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
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
                  <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                    <img
                      src={place.image}
                      alt={name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(18, 48, 74, 0.8) 0%, transparent 60%)',
                      }}
                    />

                    {/* Top End Badges */}
                    <div style={{ position: 'absolute', top: '12px', insetInlineEnd: '12px', display: 'flex', gap: '6px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(255, 255, 255, 0.92)',
                          color: 'var(--primary)',
                          fontWeight: '800',
                          fontSize: '11px',
                        }}
                      >
                        {city}
                      </span>
                    </div>

                    {/* Favorite Button on Top Start */}
                    <button
                      onClick={() => toggleFavorite(place.id, name)}
                      aria-label={saved ? t('home.removeFavorite') : t('home.addFavorite')}
                      title={saved ? t('home.removeFavorite') : t('home.addFavorite')}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        insetInlineStart: '12px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.92)',
                        color: saved ? 'var(--error)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <span className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`} style={{ fontSize: '18px' }}>
                        {saved ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>

                    {/* Rating on Image */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        insetInlineEnd: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#FFFFFF',
                        fontWeight: '700',
                        fontSize: '12px',
                      }}
                    >
                      <span className="material-symbols-outlined material-filled" style={{ fontSize: '15px', color: 'var(--gold)' }}>
                        star
                      </span>
                      <span>{place.rating}</span>
                      <span style={{ opacity: 0.8 }}>({place.reviewCount})</span>
                    </div>
                  </div>

                  <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                        {name}
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
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '700' }}>
                        {category}
                      </span>

                      <Link
                        to={`/places/${place.id}`}
                        className="btn-primary"
                        style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '10px' }}
                      >
                        <span>{t('explore.viewDetailsBtn')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '15px' }}>
                          arrow_back
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
