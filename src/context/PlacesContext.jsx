/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const PlacesContext = createContext();

/**
 * Normalizes a place record fetched from Supabase
 * to ensure consistent properties across all views and components.
 */
export function normalizePlace(sp) {
  if (!sp) return null;
  const gallery = Array.isArray(sp.gallery) && sp.gallery.length > 0
    ? sp.gallery.map((g) => (typeof g === 'string' ? { url: g, title: sp.name, alt: sp.name } : g))
    : sp.image_url
      ? [{ url: sp.image_url, title: sp.name, alt: sp.name }]
      : [];

  return {
    ...sp,
    id: sp.id,
    slug: sp.slug || sp.id,
    name: sp.name || '',
    nameEn: sp.name_en || sp.name || '',
    name_en: sp.name_en || sp.name || '',
    city: sp.city || 'مصر',
    cityEn: sp.city_en || sp.city || 'Egypt',
    city_en: sp.city_en || sp.city || 'Egypt',
    cityKey: (sp.city_en || sp.city || '').toLowerCase(),
    category: sp.category || 'معلم سياحي',
    categoryEn: sp.category_en || sp.category || 'Attraction',
    category_en: sp.category_en || sp.category || 'Attraction',
    categoryKey: (sp.category_en || sp.category || '').toLowerCase(),
    description: sp.description || '',
    historicalText: sp.description || '',
    historicalTextEn: sp.description_en || sp.description || '',
    image: sp.image_url || '',
    image_url: sp.image_url || '',
    gallery,
    latitude: typeof sp.latitude === 'number' && !isNaN(sp.latitude) ? sp.latitude : null,
    longitude: typeof sp.longitude === 'number' && !isNaN(sp.longitude) ? sp.longitude : null,
    is_published: sp.is_published ?? true,
    mapsUrl: sp.latitude && sp.longitude ? `https://maps.google.com/?q=${sp.latitude},${sp.longitude}` : null,
    rating: sp.rating ?? 4.8,
    reviewCount: sp.review_count ?? '1,200',
    badges: sp.badges || [sp.category || 'معلم سياحي'],
    badgesEn: sp.badges_en || [sp.category_en || sp.category || 'Attraction'],
    quickInfo: sp.quickInfo || {
      duration: 'ساعتان مقترحة',
      durationEn: '2 hours suggested',
    },
    metrics: sp.metrics || [
      { label: 'التقييم', value: `${sp.rating ?? 4.9} ★` },
      { label: 'المراجعات', value: sp.review_count ?? '1,200+' },
      { label: 'المدينة', value: sp.city || 'مصر' },
    ],
    metricsEn: sp.metrics_en || sp.metricsEn || [
      { label: 'Rating', value: `${sp.rating ?? 4.9} ★` },
      { label: 'Reviews', value: sp.review_count ?? '1,200+' },
      { label: 'City', value: sp.city_en || sp.city || 'Egypt' },
    ],
    tips: Array.isArray(sp.tips) ? sp.tips : [],
    nearby: Array.isArray(sp.nearby) ? sp.nearby : [],
  };
}

export function PlacesProvider({ children }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('places')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (fetchErr) throw fetchErr;

      const normalized = (data || []).map(normalizePlace);
      setPlaces(normalized);
    } catch (err) {
      console.error('PlacesContext: Error fetching places from Supabase:', err);
      setError(err?.message || 'Failed to load places');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const getPlaceByIdOrSlug = useCallback(
    (idOrSlug) => {
      if (!idOrSlug) return null;
      return places.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
    },
    [places]
  );

  return (
    <PlacesContext.Provider
      value={{
        places,
        loading,
        error,
        refreshPlaces: fetchPlaces,
        getPlaceByIdOrSlug,
      }}
    >
      {children}
    </PlacesContext.Provider>
  );
}

export function usePlaces() {
  const context = useContext(PlacesContext);
  if (!context) {
    throw new Error('usePlaces must be used within a PlacesProvider');
  }
  return context;
}
