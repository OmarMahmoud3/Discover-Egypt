/**
 * UUID Utility functions for PostgreSQL/Supabase compatibility
 */

/**
 * Checks if a string is a valid UUID format (v1 through v5).
 * Prevents PostgreSQL 22P02 errors ("invalid input syntax for type uuid")
 * when querying or inserting into UUID primary key columns.
 *
 * @param {unknown} value - Value to test
 * @returns {boolean} True if string is a valid UUID
 */
export function isUuid(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
}
