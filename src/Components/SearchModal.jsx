import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLACES_DATA } from '../data/placesData';
import { useLanguage } from '../context/LanguageContext';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t, getPlaceName, getPlaceCity, getPlaceCategory } = useLanguage();

  if (!isOpen) return null;

  const filtered = query.trim()
    ? PLACES_DATA.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          p.city.toLowerCase().includes(q) ||
          (p.cityEn && p.cityEn.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          (p.categoryEn && p.categoryEn.toLowerCase().includes(q))
        );
      })
    : PLACES_DATA;

  const handleSelect = (placeId) => {
    onClose();
    navigate(`/places/${placeId}`);
  };

  return (
    <div
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
            type="text"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--primary)',
            }}
          />
          <button
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
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 'calc(80vh - 90px)', overflowY: 'auto', padding: '12px' }}>
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
            filtered.map((place) => (
              <div
                key={place.id}
                onClick={() => handleSelect(place.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  marginBottom: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-low)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <img
                  src={place.image}
                  alt={getPlaceName(place)}
                  style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>
                    {getPlaceName(place)}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{getPlaceCity(place)}</span>
                    <span>•</span>
                    <span>{getPlaceCategory(place)}</span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--gold-surface)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    color: 'var(--gold-dark)',
                    fontWeight: '700',
                    fontSize: '12px',
                  }}
                >
                  <span className="material-symbols-outlined material-filled" style={{ fontSize: '14px' }}>
                    star
                  </span>
                  <span>{place.rating}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
