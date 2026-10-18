/**
 * Geographic Coordinate Validation & Utilities for Discover Egypt
 *
 * Strict validation:
 * - Latitude is a valid number between -90 and 90
 * - Longitude is a valid number between -180 and 180
 * - Rejects null, undefined, empty strings, non-numeric strings, NaN, Infinity
 * - Preserves valid 0 coordinates
 */

export function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lat === '') return false;
  if (lng === null || lng === undefined || lng === '') return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat < -90 || nLat > 90) return false;
  if (nLng < -180 || nLng > 180) return false;
  return true;
}

/**
 * Filter an array of places to only those with valid geographic coordinates
 */
export function filterValidPlaces(places = []) {
  if (!Array.isArray(places)) return [];
  return places.filter((p) => p && isValidCoordinate(p.latitude, p.longitude));
}

/**
 * Approximate bounding box for Egypt
 */
export const EGYPT_BOUNDS = {
  center: [26.8206, 30.8025],
  minLat: 22.0,
  maxLat: 31.8,
  minLng: 24.7,
  maxLng: 36.9,
};
