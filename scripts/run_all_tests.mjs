/**
 * Discover Egypt — Comprehensive Automated Test Suite
 * Validates:
 * 1. Places database records (integrity, uniqueness, required fields)
 * 2. Translation dictionaries (Arabic & English key parity)
 * 3. Component and asset file existence
 * 4. Supabase client initialization
 */

import { PLACES_DATA } from '../src/data/placesData.js';
import { translations } from '../src/i18n/translations.js';
import { adminTranslations } from '../src/i18n/adminTranslations.js';
import { supabase } from '../src/lib/supabase.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n======================================================');
console.log('  RUNNING DISCOVER EGYPT AUTOMATED TEST SUITE');
console.log('======================================================\n');

// --- 1. Places Data Integrity ---
console.log('[TEST GROUP 1] Places Data Integrity & Content Schema');
assert(Array.isArray(PLACES_DATA) && PLACES_DATA.length >= 90, `Places dataset contains at least 90 places (actual: ${PLACES_DATA.length})`);

const ids = new Set();
const slugs = new Set();
let placeErrors = 0;

PLACES_DATA.forEach((place, index) => {
  if (!place.id || ids.has(place.id)) {
    placeErrors++;
    console.error(`    - Duplicate or missing ID at index ${index}: ${place.id}`);
  }
  if (!place.slug || slugs.has(place.slug)) {
    placeErrors++;
    console.error(`    - Duplicate or missing slug at index ${index}: ${place.slug}`);
  }
  if (!place.name || typeof place.name !== 'string') placeErrors++;
  if (!place.city || typeof place.city !== 'string') placeErrors++;
  if (!place.category || typeof place.category !== 'string') placeErrors++;
  if (!place.image || typeof place.image !== 'string') placeErrors++;

  ids.add(place.id);
  slugs.add(place.slug);
});

assert(placeErrors === 0, `All ${PLACES_DATA.length} places have valid, non-empty, and unique IDs, slugs, names, cities, and images`);

// --- 2. Translations Parity ---
console.log('\n[TEST GROUP 2] Internationalization & Translation Parity');
assert(translations && translations.ar && translations.en, 'Website translations dictionary contains both "ar" and "en"');
assert(adminTranslations && adminTranslations.ar && adminTranslations.en, 'Admin translations dictionary contains both "ar" and "en"');

const arAdminKeys = Object.keys(adminTranslations.ar.admin || {});
const enAdminKeys = Object.keys(adminTranslations.en.admin || {});
const missingInEn = arAdminKeys.filter((k) => !enAdminKeys.includes(k));
const missingInAr = enAdminKeys.filter((k) => !arAdminKeys.includes(k));

assert(missingInEn.length === 0, `English admin translations match Arabic keys (missing: ${missingInEn.join(', ') || 'none'})`);
assert(missingInAr.length === 0, `Arabic admin translations match English keys (missing: ${missingInAr.join(', ') || 'none'})`);

// --- 3. Critical Component & Asset Files ---
console.log('\n[TEST GROUP 3] Component Files & Architecture Assets');
const criticalFiles = [
  'src/App.jsx',
  'src/index.css',
  'src/main.jsx',
  'src/Components/BrandLogo.jsx',
  'src/Components/Navbar.jsx',
  'src/Components/Footer.jsx',
  'src/Components/admin/AdminSidebar.jsx',
  'src/Components/admin/AdminHeader.jsx',
  'src/Components/admin/AdminLayout.jsx',
  'src/Components/admin/AdminRoute.jsx',
  'src/Pages/Explore.jsx',
  'src/Pages/Home.jsx',
  'src/Pages/LogIn.jsx',
  'src/Pages/PlaceDetails.jsx',
  'src/Pages/MapPage.jsx',
  'src/Components/PlacesMap.jsx',
  'src/Components/PlacesMap.css',
  'src/Pages/admin/AdminDashboard.jsx',
  'src/Pages/admin/AdminPlaces.jsx',
  'src/Pages/admin/AdminPlaceEdit.jsx',
  'src/Pages/admin/AdminUsers.jsx',
  'src/Pages/admin/AdminSettings.jsx',
  'src/styles/admin.css',
  'jsconfig.json',
];

criticalFiles.forEach((relPath) => {
  const fullPath = path.resolve(relPath);
  assert(fs.existsSync(fullPath), `Critical file exists: ${relPath}`);
});

// --- 3B. Interactive Map & Coordinate Validation Engine ---
console.log('\n[TEST GROUP 3B] Interactive Map & Coordinate Engine');
import { isValidCoordinate } from '../src/lib/geoUtils.js';

assert(isValidCoordinate(29.9792, 31.1342) === true, 'Giza coordinates (29.9792, 31.1342) are valid');
assert(isValidCoordinate('25.7188', '32.6573') === true, 'Numeric coordinate strings (Luxor) are valid');
assert(isValidCoordinate(0, 0) === true, 'Zero coordinates (0, 0) are correctly accepted');
assert(isValidCoordinate(null, 31.1342) === false, 'Null latitude is rejected');
assert(isValidCoordinate(29.9792, undefined) === false, 'Undefined longitude is rejected');
assert(isValidCoordinate('', 31.1342) === false, 'Empty string latitude is rejected');
assert(isValidCoordinate(95, 31.1342) === false, 'Out of range latitude (>90) is rejected');
assert(isValidCoordinate(29.9792, -190) === false, 'Out of range longitude (<-180) is rejected');
assert(isValidCoordinate('abc', 31.1342) === false, 'Non-numeric string coordinate is rejected');
assert(isValidCoordinate(NaN, 31.1342) === false, 'NaN coordinate is rejected');
assert(isValidCoordinate(Infinity, 31.1342) === false, 'Infinity coordinate is rejected');

// Verify translation parity for map
const arMapKeys = Object.keys(translations.ar.map || {});
const enMapKeys = Object.keys(translations.en.map || {});
assert(arMapKeys.length > 5, `Arabic map translation contains ${arMapKeys.length} keys`);
assert(enMapKeys.length > 5, `English map translation contains ${enMapKeys.length} keys`);
const missingMapEn = arMapKeys.filter(k => !enMapKeys.includes(k));
assert(missingMapEn.length === 0, `English map keys match Arabic keys (missing: ${missingMapEn.join(', ') || 'none'})`);

// --- 4. Supabase Client Verification ---
console.log('\n[TEST GROUP 4] Supabase Client Health');
assert(typeof supabase === 'object' && supabase !== null, 'Supabase client is exported and instantiated');
assert(typeof supabase.from === 'function', 'Supabase client provides query builder API (.from)');
assert(typeof supabase.auth === 'object', 'Supabase client provides auth API (.auth)');
assert(typeof supabase.functions === 'object', 'Supabase client provides edge functions API (.functions)');

// --- Summary ---
console.log('\n======================================================');
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All project automated verification checks PASSED successfully!\n');
  process.exit(0);
}
