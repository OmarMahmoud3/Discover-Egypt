/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import realPhotosMap from '../data/realPhotosMap.json';

const PlacesContext = createContext();

/**
 * Normalizes a place record fetched from Supabase
 * to ensure consistent properties and verified real-world photography across all views.
 */
export function normalizePlace(sp) {
  if (!sp) return null;
  const slug = sp.slug || sp.id;
  const realPhoto = realPhotosMap[slug] || realPhotosMap[sp.id];
  const activeImage = realPhoto || sp.image_url || '';

  const gallery = activeImage
    ? [{ url: activeImage, title: sp.name, alt: sp.name }]
    : Array.isArray(sp.gallery) && sp.gallery.length > 0
      ? sp.gallery.map((g) => (typeof g === 'string' ? { url: g, title: sp.name, alt: sp.name } : g))
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
    image: activeImage,
    image_url: activeImage,
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

// Instant fallback featured destination for frame-0 LCP discovery and rendering
const INITIAL_FEATURED_PLACE = {
  id: 'e4d9ddcf-9939-4f18-8cf7-1e81d1419a5f',
  slug: 'grand-egyptian-museum',
  name: 'المتحف المصري الكبير',
  nameEn: 'Grand Egyptian Museum',
  name_en: 'Grand Egyptian Museum',
  city: 'الجيزة',
  cityEn: 'Giza',
  city_en: 'Giza',
  cityKey: 'giza',
  category: 'متاحف',
  categoryEn: 'Museums',
  category_en: 'Museums',
  categoryKey: 'museum',
  description: 'أكبر متحف أثري في العالم مخصص لحضارة واحدة، يقع بالقرب من أهرامات الجيزة.',
  historicalText: 'أكبر متحف أثري في العالم مخصص لحضارة واحدة، يقع بالقرب من أهرامات الجيزة.',
  historicalTextEn: 'The largest archaeological museum complex in the world dedicated to a single civilization.',
  image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/The_Grand_Egyptian_Museum.jpg/1280px-The_Grand_Egyptian_Museum.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail',
  image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/The_Grand_Egyptian_Museum.jpg/1280px-The_Grand_Egyptian_Museum.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail',
  gallery: [{ url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/The_Grand_Egyptian_Museum.jpg/1280px-The_Grand_Egyptian_Museum.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail', title: 'المتحف المصري الكبير', alt: 'المتحف المصري الكبير' }],
  latitude: 29.9953,
  longitude: 31.1197,
  is_published: true,
  rating: 4.9,
  reviewCount: '2,800+',
  badges: ['معلم موثق', 'صرح عالمي'],
  badgesEn: ['Documented Landmark', 'Global Wonder'],
  quickInfo: { duration: '3 ساعات مقترحة', durationEn: '3 hours suggested' },
  metrics: [
    { label: 'التقييم', value: '4.9 ★' },
    { label: 'المراجعات', value: '2,800+' },
    { label: 'المدينة', value: 'الجيزة' },
  ],
  metricsEn: [
    { label: 'Rating', value: '4.9 ★' },
    { label: 'Reviews', value: '2,800+' },
    { label: 'City', value: 'Giza' },
  ],
  tips: [],
  nearby: [],
};

export function PlacesProvider({ children }) {
  const [places, setPlaces] = useState(() => [INITIAL_FEATURED_PLACE]);
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
