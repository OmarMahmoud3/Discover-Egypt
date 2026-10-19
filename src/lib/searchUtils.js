/**
 * Search Utilities for Discover Egypt
 * Provides high-accuracy Arabic text normalization and multi-lingual destination matching.
 */

/**
 * Normalizes text for search matching without mutating user-facing display.
 * - Strips Arabic diacritics (tashkeel & tatweel)
 * - Unifies Alef variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Alef Maqsura (ى -> ي)
 * - Lowercases and trims English text
 * - Collapses consecutive whitespace
 *
 * @param {string} text - Raw search query or field value
 * @returns {string} - Normalized string
 */
export function normalizeSearchText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    .toLowerCase()
    // 1. Remove Arabic diacritics (tashkeel: fathatan, dammatan, kasratan, fatha, damma, kasra, shadda, sukun, dagger alif) & tatweel
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    // 2. Normalize Alef variants (أ, إ, آ, ٱ) to bare Alef (ا)
    .replace(/[أإآٱ]/g, 'ا')
    // 3. Normalize Taa Marbuta (ة) to Haa (ه)
    .replace(/ة/g, 'ه')
    // 4. Normalize Alef Maqsura (ى) to Yaa (ي)
    .replace(/ى/g, 'ي')
    // 5. Collapse multiple whitespace into single space
    .replace(/\s+/g, ' ');
}

/**
 * Robust destination matcher that evaluates whether a place matches the search query.
 * Matches across Arabic names, English names, cities, categories, and descriptions.
 * Supports tokenized multi-word search (e.g. "معبد الكرنك" or "Karnak Temple").
 *
 * @param {object} place - Destination object (from Supabase or PLACES_DATA)
 * @param {string} rawQuery - Search term entered or recognized from voice
 * @returns {boolean} - Whether destination matches query
 */
export function matchesDestination(place, rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
    return true;
  }
  if (!place || typeof place !== 'object') {
    return false;
  }

  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) {
    return true;
  }

  // Aggregate searchable fields
  const searchableTexts = [
    place.name,
    place.name_ar,
    place.nameEn,
    place.name_en,
    place.alias,
    place.slug,
    place.city,
    place.city_ar,
    place.cityEn,
    place.city_en,
    place.category,
    place.category_ar,
    place.categoryEn,
    place.category_en,
    place.locationShort,
    place.locationShortEn,
    place.categoryKey,
    place.cityKey,
    Array.isArray(place.badges) ? place.badges.join(' ') : '',
    Array.isArray(place.badgesEn) ? place.badgesEn.join(' ') : '',
  ];

  // Join all searchable fields and normalize once
  const aggregated = searchableTexts
    .filter(Boolean)
    .map(normalizeSearchText)
    .join(' ');

  // Direct substring check
  if (aggregated.includes(normalizedQuery)) {
    return true;
  }

  // Multi-word token match (all query words must appear somewhere in aggregated text)
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.length > 1) {
    const allTokensMatch = queryTokens.every((token) => aggregated.includes(token));
    if (allTokensMatch) {
      return true;
    }
  }

  return false;
}
