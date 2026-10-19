import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLACES_DATA } from '../data/placesData';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import VoiceSearchButton from './VoiceSearchButton';
import { matchesDestination } from '../lib/searchUtils';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [supabasePlaces, setSupabasePlaces] = useState([]);
  const navigate = useNavigate();
  const { t, getPlaceName, getPlaceCity, getPlaceCategory, isArabic } = useLanguage();
  const inputRef = useRef(null);

  // Fetch published places from Supabase when modal opens
  useEffect(() => {
    if (!isOpen) return;

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
        console.warn('Supabase fetch notice in SearchModal:', err);
      }
    }
    loadPlaces();
  }, [isOpen]);

  // Combine Supabase places and curated static places
  const allPlaces = useMemo(() => {
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
        image: sp.image_url || staticMatch?.image || 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=400&q=80',
        historicalText: sp.description || staticMatch?.historicalText || '',
        historicalTextEn: sp.description_en || sp.description || staticMatch?.historicalTextEn || '',
      };
    });

    const combined = [...dynamicList];
    PLACES_DATA.forEach((staticP) => {
      if (!combined.some((p) => p.id === staticP.id || p.id === staticP.slug)) {
        combined.push(staticP);
      }
    });

    return combined;
  }, [supabasePlaces, isArabic]);

  // Close on Escape key & trap scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    // Auto focus search field
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? allPlaces.filter((p) => {
        const q = query.toLowerCase();
        return (
          matchesDestination(p, query) ||
          p.name?.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          p.city?.toLowerCase().includes(q) ||
          (p.cityEn && p.cityEn.toLowerCase().includes(q)) ||
          p.category?.toLowerCase().includes(q) ||
          (p.categoryEn && p.categoryEn.toLowerCase().includes(q))
        );
      })
    : allPlaces;

  const handleSelect = (placeId) => {
    onClose();
    navigate(`/places/${placeId}`);
  };

  return (
    <div
      id="global-search-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.searchModalLabel')}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 48, 74, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(20px, 5vh, 80px) clamp(12px, 3vw, 20px) 20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 20px 40px rgba(18, 48, 74, 0.25)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            aria-label={t('search.inputLabel')}
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--primary)',
              outline: 'none',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={isArabic ? 'مسح البحث' : 'Clear search'}
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                minHeight: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-low)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                close
              </span>
            </button>
          )}
          <VoiceSearchButton
            onTranscript={(transcript) => setQuery(transcript)}
            inputRef={inputRef}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeModal')}
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-low)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Results List */}
        <div
          role="region"
          aria-label={isArabic ? 'نتائج البحث' : 'Search Results'}
          tabIndex={0}
          style={{ maxHeight: 'calc(80vh - 90px)', overflowY: 'auto', padding: '12px' }}
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--gold)' }}>
                travel_explore
              </span>
              <p style={{ marginTop: '8px', fontWeight: '600' }}>
                {t('search.noResults', { query })}
              </p>
            </div>
          ) : (
            filtered.map((place) => {
              const placeName = getPlaceName(place);
              const placeCity = getPlaceCity(place);
              const placeCategory = getPlaceCategory(place);

              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelect(place.id)}
                  aria-label={`${placeName} — ${placeCity} — ${placeCategory}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: isArabic ? 'right' : 'left',
                    transition: 'background-color 0.15s, border-color 0.15s',
                    marginBottom: '4px',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <img
                    src={place.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=400&q=80';
                    }}
                    style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', lineHeight: 1.3 }}>
                      {placeName}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginTop: '3px',
                      }}
                    >
                      <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{placeCity}</span>
                      <span>•</span>
                      <span>{placeCategory}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--gold-surface)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--gold-dark)',
                      fontWeight: '700',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined material-filled" style={{ fontSize: '14px' }}>
                      star
                    </span>
                    <span>{place.rating}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
