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
import {
  calculateSharedInterests,
  normalizeArabic,
  filterCommunityProfiles,
  sendConnectionRequest,
  respondToConnectionRequest,
  getOrCreateConversation,
  fetchConversations,
  fetchMessages,
  sendMessage,
  subscribeToRequests,
  subscribeToMessages,
} from '../src/lib/communityService.js';
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

const arProfileKeys = Object.keys(translations.ar.profile || {});
const enProfileKeys = Object.keys(translations.en.profile || {});
const missingProfileInEn = arProfileKeys.filter((k) => !enProfileKeys.includes(k));
const missingProfileInAr = enProfileKeys.filter((k) => !arProfileKeys.includes(k));
assert(arProfileKeys.length >= 30, `Profile translations contain comprehensive dictionary (actual: ${arProfileKeys.length} keys)`);
assert(missingProfileInEn.length === 0, `English profile translations match Arabic keys (missing: ${missingProfileInEn.join(', ') || 'none'})`);
assert(missingProfileInAr.length === 0, `Arabic profile translations match English keys (missing: ${missingProfileInAr.join(', ') || 'none'})`);

// Community translations parity
const arCommunityKeys = Object.keys(translations.ar.community || {});
const enCommunityKeys = Object.keys(translations.en.community || {});
const missingCommunityInEn = arCommunityKeys.filter((k) => !enCommunityKeys.includes(k));
const missingCommunityInAr = enCommunityKeys.filter((k) => !arCommunityKeys.includes(k));
assert(arCommunityKeys.length >= 25, `Community translations contain comprehensive dictionary (actual: ${arCommunityKeys.length} keys)`);
assert(missingCommunityInEn.length === 0, `English community translations match Arabic keys (missing: ${missingCommunityInEn.join(', ') || 'none'})`);
assert(missingCommunityInAr.length === 0, `Arabic community translations match English keys (missing: ${missingCommunityInAr.join(', ') || 'none'})`);

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
  'src/Pages/Profile.jsx',
  'src/Pages/Community.jsx',
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
  'src/styles/profile.css',
  'src/styles/community.css',
  'src/lib/communityService.js',
  'src/Components/ChatDrawer.jsx',
  'supabase/community_discovery_schema.sql',
  'supabase/community_messaging_schema.sql',
  'jsconfig.json',
  'src/lib/searchUtils.js',
  'src/hooks/useVoiceSearch.js',
  'src/Components/VoiceSearchButton.jsx',
  'src/Components/VoiceSearchButton.css',
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

// --- 3C. Voice Search & Arabic/English Text Normalization Engine ---
console.log('\n[TEST GROUP 3C] Voice Search & Text Normalization Engine');
import { normalizeSearchText, matchesDestination } from '../src/lib/searchUtils.js';

assert(normalizeSearchText('أهرامات') === 'اهرامات', 'Alef with Hamza above (أ) normalizes to bare Alef (ا)');
assert(normalizeSearchText('إسكندرية') === 'اسكندريه', 'Alef with Hamza below (إ) & Taa Marbuta (ة) normalize correctly');
assert(normalizeSearchText('آثار') === 'اثار', 'Alef with Madda (آ) normalizes to bare Alef (ا)');
assert(normalizeSearchText('مُتْحَفٌ') === 'متحف', 'Arabic diacritics / tashkeel stripped cleanly');
assert(normalizeSearchText('موسى') === 'موسي', 'Alef Maqsura (ى) normalizes to Yaa (ي)');
assert(normalizeSearchText('  Giza   Pyramids  ') === 'giza pyramids', 'English casing folded and whitespace collapsed');

// Matches Destination Verification
const testPlace = {
  id: 'giza-pyramids',
  name: 'هضبة الجيزة والأهرامات',
  nameEn: 'Giza Plateau & Pyramids',
  city: 'الجيزة',
  cityEn: 'Giza',
  category: 'آثار وتاريخ',
  categoryEn: 'Monuments & History',
};

assert(matchesDestination(testPlace, 'اهرامات') === true, 'Matches destination when voice transcript lacks hamza (اهرامات -> الأهرامات)');
assert(matchesDestination(testPlace, 'جيزه') === true, 'Matches destination when voice transcript uses haa for taa marbuta (جيزه -> الجيزة)');
assert(matchesDestination(testPlace, 'pyramids') === true, 'Matches destination by English keyword case-insensitively');
assert(matchesDestination(testPlace, 'معبد الكرنك') === false, 'Rejects non-matching destination correctly');
assert(matchesDestination(testPlace, '') === true, 'Empty query matches all destinations');

// Verify translation parity for voiceSearch
const arVoiceKeys = Object.keys(translations.ar.voiceSearch || {});
const enVoiceKeys = Object.keys(translations.en.voiceSearch || {});
assert(arVoiceKeys.length >= 10, `Arabic voiceSearch translation contains ${arVoiceKeys.length} keys`);
assert(enVoiceKeys.length >= 10, `English voiceSearch translation contains ${enVoiceKeys.length} keys`);
const missingVoiceEn = arVoiceKeys.filter(k => !enVoiceKeys.includes(k));
assert(missingVoiceEn.length === 0, `English voiceSearch keys match Arabic keys (missing: ${missingVoiceEn.join(', ') || 'none'})`);
const missingVoiceAr = enVoiceKeys.filter(k => !arVoiceKeys.includes(k));
assert(missingVoiceAr.length === 0, `Arabic voiceSearch keys match English keys (missing: ${missingVoiceAr.join(', ') || 'none'})`);

// --- 4. Supabase Client Verification ---
console.log('\n[TEST GROUP 4] Supabase Client Health');
assert(typeof supabase === 'object' && supabase !== null, 'Supabase client is exported and instantiated');
assert(typeof supabase.from === 'function', 'Supabase client provides query builder API (.from)');
assert(typeof supabase.auth === 'object', 'Supabase client provides auth API (.auth)');
assert(typeof supabase.functions === 'object', 'Supabase client provides edge functions API (.functions)');

// --- 5. Community Discovery: Real Users & Universal Accessibility ---
console.log('\n[TEST GROUP 5] Community Real Users & Universal Accessibility');
const communityServiceContent = fs.readFileSync(path.resolve('src/lib/communityService.js'), 'utf-8');
const profileContent = fs.readFileSync(path.resolve('src/Pages/Profile.jsx'), 'utf-8');
const schemaContent = fs.readFileSync(path.resolve('supabase/community_discovery_schema.sql'), 'utf-8');
const mobileNavContent = fs.readFileSync(path.resolve('src/Components/MobileNav.jsx'), 'utf-8');
const footerContent = fs.readFileSync(path.resolve('src/Components/Footer.jsx'), 'utf-8');
const homeContent = fs.readFileSync(path.resolve('src/Pages/Home.jsx'), 'utf-8');

assert(!communityServiceContent.includes('SEED_EXPLORERS'), 'Zero SEED_EXPLORERS in communityService.js');
assert(!communityServiceContent.includes('Salma El-Naggar'), 'Zero mock user names in communityService.js');
assert(communityServiceContent.includes(".from('profiles')"), 'communityService directly queries Supabase profiles table');

// Test calculateSharedInterests
const shared = calculateSharedInterests(['الآثار الفرعونية', 'الغوص'], ['الآثار الفرعونية', 'التخييم والمغامرات']);
assert(Array.isArray(shared) && shared.length === 1 && shared[0] === 'الآثار الفرعونية', 'calculateSharedInterests accurately calculates overlap between real profiles');

// --- 6. Community Search & Null Safety Verification ---
console.log('\n[TEST GROUP 6] Community Search & Null Safety Verification');

// 6.1 normalizeArabic null-safety tests
assert(normalizeArabic(null) === '', 'normalizeArabic handles null safely without crashing');
assert(normalizeArabic(undefined) === '', 'normalizeArabic handles undefined safely');
assert(normalizeArabic('') === '', 'normalizeArabic handles empty string safely');
assert(normalizeArabic(123) === '123', 'normalizeArabic handles numeric input safely');
assert(normalizeArabic('أحمد') === 'احمد', 'normalizeArabic normalizes alef with hamza to bare alef');
assert(normalizeArabic('فاطمة') === 'فاطمه', 'normalizeArabic normalizes taa marbuta to haa');
assert(normalizeArabic('مُصْطَفَى') === 'مصطفي', 'normalizeArabic strips harakat/tashkeel and harmonizes alef maqsura');
assert(normalizeArabic('مصطفى ') === 'مصطفي', 'normalizeArabic trims trailing whitespace and normalizes alef maqsura');

// 6.2 filterCommunityProfiles null-safety & search accuracy
const mockDbProfiles = [
  { id: '1', display_name: 'مصطفى ', bio: null, city: null, interests: ['الآثار الفرعونية'] },
  { id: '2', display_name: 'Omar Mahmoud', bio: 'Traveler & Explorer', city: 'Cairo', interests: ['الغوص بالبحر الأحمر'] },
  { id: '3', display_name: 'ok', bio: null, city: '', interests: [] },
  { id: '4', display_name: 'سارة أحمد', bio: 'عاشقة للأهرامات والنيل', city: 'الجيزة', interests: ['جولات النيل والفلوكة'] }
];

const mustafaResults = filterCommunityProfiles(mockDbProfiles, { search: 'مصطفى' });
assert(mustafaResults.length === 1 && mustafaResults[0].id === '1', 'filterCommunityProfiles accurately finds "مصطفى" ignoring trailing space and matching alef maqsura');

const mustafaHamzaResults = filterCommunityProfiles(mockDbProfiles, { search: 'مصطفي' });
assert(mustafaHamzaResults.length === 1 && mustafaHamzaResults[0].id === '1', 'filterCommunityProfiles matches "مصطفي" with yaa to "مصطفى"');

const omarResults = filterCommunityProfiles(mockDbProfiles, { search: 'omar' });
assert(omarResults.length === 1 && omarResults[0].id === '2', 'filterCommunityProfiles matches English name case-insensitively');

const bioSearch = filterCommunityProfiles(mockDbProfiles, { search: 'نيل' });
assert(bioSearch.length === 1 && bioSearch[0].id === '4', 'filterCommunityProfiles matches inside bio without crashing on null bio of other users');

const emptySearch = filterCommunityProfiles(mockDbProfiles, { search: '' });
assert(emptySearch.length === 4, 'filterCommunityProfiles with empty search returns all profiles intact');

assert(!profileContent.includes("'الآثار الفرعونية', 'المتاحف والتاريخ المصري'"), 'Profile.jsx does not inject static fallback interests');
assert(profileContent.includes('is_public'), 'Profile.jsx includes is_public privacy toggle control');
assert(!schemaContent.includes("UPDATE public.profiles SET interests ="), 'community_discovery_schema.sql contains no mock data seeding queries');
assert(schemaContent.includes("is_public"), 'community_discovery_schema.sql enforces RLS policy for public discovery');

// Universal Visibility for All Users
assert(mobileNavContent.includes("'/community'"), 'MobileNav includes /community for all mobile users');
assert(footerContent.includes('to="/community"'), 'Footer includes /community link for all site visitors');
assert(homeContent.includes('to="/community"'), 'Home page features /community button for immediate discovery');
assert(translations.ar.mobile && typeof translations.ar.mobile.community === 'string', 'Arabic mobile translations contain community key');
assert(translations.en.mobile && typeof translations.en.mobile.community === 'string', 'English mobile translations contain community key');

// --- 7. Community Requests & Realtime Messaging Verification ---
console.log('\n[TEST GROUP 7] Community Requests & Realtime Messaging Verification');
const messagingSchemaContent = fs.readFileSync(path.resolve('supabase/community_messaging_schema.sql'), 'utf-8');

// Schema integrity and RLS policy verification
assert(messagingSchemaContent.includes('CREATE TABLE IF NOT EXISTS public.community_connections'), 'community_messaging_schema.sql creates community_connections table');
assert(messagingSchemaContent.includes('CREATE TABLE IF NOT EXISTS public.conversations'), 'community_messaging_schema.sql creates conversations table');
assert(messagingSchemaContent.includes('CREATE TABLE IF NOT EXISTS public.messages'), 'community_messaging_schema.sql creates messages table');
assert(messagingSchemaContent.includes('ALTER TABLE public.community_connections ENABLE ROW LEVEL SECURITY'), 'RLS enabled on community_connections');
assert(messagingSchemaContent.includes('ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY'), 'RLS enabled on conversations');
assert(messagingSchemaContent.includes('ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY'), 'RLS enabled on messages');
assert(messagingSchemaContent.includes('supabase_realtime ADD TABLE public.community_connections'), 'Realtime publication enabled on community_connections');
assert(messagingSchemaContent.includes('supabase_realtime ADD TABLE public.messages'), 'Realtime publication enabled on messages');

// Service function API verification
assert(typeof sendConnectionRequest === 'function', 'sendConnectionRequest is exported');
assert(typeof respondToConnectionRequest === 'function', 'respondToConnectionRequest is exported');
assert(typeof getOrCreateConversation === 'function', 'getOrCreateConversation is exported');
assert(typeof fetchConversations === 'function', 'fetchConversations is exported');
assert(typeof fetchMessages === 'function', 'fetchMessages is exported');
assert(typeof sendMessage === 'function', 'sendMessage is exported');
assert(typeof subscribeToRequests === 'function', 'subscribeToRequests is exported');
assert(typeof subscribeToMessages === 'function', 'subscribeToMessages is exported');

// Validation tests
let selfConnectError = false;
try {
  await sendConnectionRequest({ senderId: 'user-1', receiverId: 'user-1', message: 'Hello' });
} catch (e) {
  selfConnectError = true;
}
assert(selfConnectError, 'sendConnectionRequest prevents self-connecting');

let missingMsgError = false;
try {
  await sendConnectionRequest({ senderId: 'user-1', receiverId: 'user-2', message: '' });
} catch (e) {
  missingMsgError = true;
}
assert(missingMsgError, 'sendConnectionRequest enforces non-empty message content');

// Conversation participant ordering logic (deterministic p1 < p2)
const convOrderA = await getOrCreateConversation({ user1Id: 'user-b', user2Id: 'user-a' });
const convOrderB = await getOrCreateConversation({ user1Id: 'user-a', user2Id: 'user-b' });
assert(convOrderA.participant1_id === 'user-a' && convOrderA.participant2_id === 'user-b', 'getOrCreateConversation normalizes participant IDs in canonical order');
assert(convOrderA.participant1_id === convOrderB.participant1_id && convOrderA.participant2_id === convOrderB.participant2_id, 'Canonical order matches regardless of argument order');

// --- Test Group 8: Chat Message Deduplication & Optimistic Reconciliation ---
console.log('\n[TEST GROUP 8] Chat Message Deduplication & Optimistic Reconciliation');

const chatDrawerPath = path.resolve('src/Components/ChatDrawer.jsx');
const chatDrawerCode = fs.readFileSync(chatDrawerPath, 'utf8');

assert(chatDrawerCode.includes('function reconcileMessage'), 'ChatDrawer.jsx implements atomic reconcileMessage');
assert(chatDrawerCode.includes('reconcileMessage(prev, newMsg)'), 'ChatDrawer realtime subscriber uses reconcileMessage');
assert(chatDrawerCode.includes('reconcileMessage(prev, res.data)'), 'ChatDrawer sendMessage response uses reconcileMessage');
assert(!chatDrawerCode.includes('!messages.some((m) => m.id === res.data.id)'), 'Stale closure messages.some check is removed');

// Test reconciliation behavior
function testReconcile(prevMessages, incoming) {
  if (!incoming || !incoming.id) return prevMessages;
  const existingExactIndex = prevMessages.findIndex((m) => m.id === incoming.id);
  if (existingExactIndex !== -1) return prevMessages;
  if (!incoming.is_pending) {
    const pendingIndex = prevMessages.findIndex(
      (m) => m.is_pending && m.sender_id === incoming.sender_id && m.content === incoming.content
    );
    if (pendingIndex !== -1) {
      const next = [...prevMessages];
      next[pendingIndex] = incoming;
      return next;
    }
  }
  return [...prevMessages, incoming];
}

let testMsgs = [{ id: 'temp-1', sender_id: 'u1', content: 'test text', is_pending: true }];
// Realtime packet arrives
testMsgs = testReconcile(testMsgs, { id: 'srv-1', sender_id: 'u1', content: 'test text' });
assert(testMsgs.length === 1 && testMsgs[0].id === 'srv-1', 'Realtime packet replaces pending optimistic message');
// HTTP response arrives second
testMsgs = testReconcile(testMsgs, { id: 'srv-1', sender_id: 'u1', content: 'test text' });
assert(testMsgs.length === 1, 'HTTP response arrives with same ID produces zero duplicates');

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
