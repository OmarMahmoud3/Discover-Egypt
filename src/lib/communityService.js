/**
 * Discover Egypt — Community Discovery & Safe Connect Service
 * Handles explorer profiles, interest matching, privacy filtering, and safe connection requests.
 */

import { supabase } from './supabase.js';

export const CURATED_INTERESTS = [
  { id: 'pharaonic', labelAr: 'الآثار الفرعونية', labelEn: 'Pharaonic Antiquities', icon: '🏛️' },
  { id: 'photography', labelAr: 'التصوير والتوثيق', labelEn: 'Travel Photography', icon: '📸' },
  { id: 'diving', labelAr: 'الغوص بالبحر الأحمر', labelEn: 'Red Sea Diving', icon: '🤿' },
  { id: 'safari', labelAr: 'سفاري الصحراء والواحات', labelEn: 'Desert Safari & Oases', icon: '🏜️' },
  { id: 'nile_cruises', labelAr: 'جولات النيل والفلوكة', labelEn: 'Nile Cruises & Felucca', icon: '⛵' },
  { id: 'museums', labelAr: 'المتاحف والتاريخ المصري', labelEn: 'Museums & Egyptian History', icon: '🏺' },
  { id: 'culinary', labelAr: 'المأكولات والتراث الشعبي', labelEn: 'Culinary & Culture', icon: '🍲' },
  { id: 'camping', labelAr: 'التخييم والمغامرات', labelEn: 'Camping & Adventure', icon: '⛺' },
  { id: 'islamic_coptic', labelAr: 'العمارة التاريخية والتراث', labelEn: 'Historical Architecture', icon: '🕌' },
  { id: 'souqs', labelAr: 'الأسواق والحرف التقليدية', labelEn: 'Traditional Souqs & Crafts', icon: '🛍️' },
];

export const CITIES_LIST = [
  { id: 'cairo', nameAr: 'القاهرة والجيزة', nameEn: 'Cairo & Giza' },
  { id: 'luxor', nameAr: 'الأقصر', nameEn: 'Luxor' },
  { id: 'aswan', nameAr: 'أسوان والنوبة', nameEn: 'Aswan & Nubia' },
  { id: 'red_sea', nameAr: 'الغردقة والبحر الأحمر', nameEn: 'Hurghada & Red Sea' },
  { id: 'sinai', nameAr: 'شرم الشيخ وجنوب سيناء', nameEn: 'Sharm El-Sheikh & Sinai' },
  { id: 'alexandria', nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
  { id: 'oases', nameAr: 'سيوة والواحات', nameEn: 'Siwa & Oases' },
];

/**
 * Normalizes Arabic text for flexible matching (removes tashkeel, harmonizes alef & taa marbuta)
 */
function normalizeArabic(str = '') {
  return str
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Calculates common interests between current user and an explorer
 */
export function calculateSharedInterests(userInterests = [], explorerInterests = []) {
  if (!Array.isArray(userInterests) || !Array.isArray(explorerInterests)) return [];
  const set = new Set(userInterests.map((i) => i.trim().toLowerCase()));
  return explorerInterests.filter((item) => set.has(item.trim().toLowerCase()));
}

/**
 * Fetches all public community profiles strictly from real Supabase database records,
 * applying search filters, interest filters, and shared interest calculations.
 * Zero mock or seed users are returned.
 */
export async function fetchCommunityProfiles({
  search = '',
  selectedInterest = 'all',
  selectedCity = 'all',
  onlyShared = false,
  currentUserInterests = [],
  currentUserId = null,
  lang = 'ar',
}) {
  let dbProfiles = [];

  try {
    // 1. Query Supabase profiles table for all discoverable users
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, bio, interests, is_public, city, contact_preference, social_handle, created_at');

    if (!error && Array.isArray(data)) {
      // Include all profiles that have opted to be discoverable (is_public is true or null/unset)
      // Exclude only those who explicitly opted out (is_public === false)
      dbProfiles = data.filter((p) => p.is_public !== false);
    } else {
      console.warn('Community profile fetch notice (attempting basic query):', error?.message);
      // Fallback query if optional community columns are not yet applied on remote DB
      const { data: basicData, error: basicError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role, created_at');

      if (!basicError && Array.isArray(basicData)) {
        // Only map actual real database records with safe defaults, zero fake users
        dbProfiles = basicData.map((p) => ({
          ...p,
          bio: '',
          interests: [],
          is_public: true,
          city: '',
          contact_preference: 'in_app',
          social_handle: '',
        }));
      }
    }
  } catch (err) {
    console.error('Community profile fetch error:', err);
  }

  // 2. Filter out ONLY the currently signed-in user so they do not connect with themselves
  const allProfiles = dbProfiles.filter((p) => !currentUserId || p.id !== currentUserId);

  // 3. Compute shared interests and attach metrics to each real profile
  const profilesWithShared = allProfiles.map((p) => {
    const rawInterests = Array.isArray(p.interests) ? p.interests : [];
    const shared = calculateSharedInterests(currentUserInterests, rawInterests);
    return {
      ...p,
      interests: rawInterests,
      sharedInterests: shared,
      sharedCount: shared.length,
      displayNameLocalized: p.display_name || (lang === 'ar' ? 'مستكشف' : 'Explorer'),
      bioLocalized: p.bio || '',
      cityLocalized: p.city || '',
    };
  });

  // 6. Apply Search Query Filter (name, bio, interests, city)
  const queryNorm = normalizeArabic(search);
  let results = profilesWithShared;

  if (queryNorm) {
    results = results.filter((p) => {
      const nameMatch = normalizeArabic(p.displayNameLocalized || p.display_name).includes(queryNorm);
      const bioMatch = normalizeArabic(p.bioLocalized || p.bio).includes(queryNorm);
      const cityMatch = normalizeArabic(p.cityLocalized || p.city).includes(queryNorm);
      const interestMatch = p.interests.some((i) => normalizeArabic(i).includes(queryNorm));
      return nameMatch || bioMatch || cityMatch || interestMatch;
    });
  }

  // 7. Apply Specific Interest Category Filter
  if (selectedInterest && selectedInterest !== 'all') {
    results = results.filter((p) =>
      p.interests.some((i) => i.trim().toLowerCase() === selectedInterest.trim().toLowerCase())
    );
  }

  // 8. Apply City Filter
  if (selectedCity && selectedCity !== 'all') {
    const cityNorm = normalizeArabic(selectedCity);
    results = results.filter((p) => normalizeArabic(p.city || p.cityLocalized).includes(cityNorm));
  }

  // 9. Apply "Shared Only" Filter
  if (onlyShared) {
    results = results.filter((p) => p.sharedCount > 0);
  }

  // 10. Sort: highest shared interests first, then newest
  results.sort((a, b) => {
    if (b.sharedCount !== a.sharedCount) {
      return b.sharedCount - a.sharedCount;
    }
    return new Date(b.created_at || b.member_since || 0) - new Date(a.created_at || a.member_since || 0);
  });

  return results;
}

/**
 * Sends a safe, in-app connection request from one explorer to another
 */
export async function sendConnectionRequest({
  senderId,
  receiverId,
  message,
  sharedInterests = [],
}) {
  if (!senderId || !receiverId || !message?.trim()) {
    throw new Error('Sender, receiver, and message content are required.');
  }

  const payload = {
    sender_id: senderId,
    receiver_id: receiverId,
    message: message.trim(),
    shared_interests: Array.isArray(sharedInterests) ? sharedInterests : [],
    status: 'pending',
  };

  try {
    const { data, error } = await supabase
      .from('community_connections')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Database insert into community_connections:', error.message);
      // Resilient fallback storage in localStorage
      saveLocalConnectionRequest(payload);
      return { success: true, localOnly: true };
    }

    return { success: true, data };
  } catch (err) {
    console.warn('Network exception while sending connection request:', err);
    saveLocalConnectionRequest(payload);
    return { success: true, localOnly: true };
  }
}

/**
 * Fallback connection request storage
 */
function saveLocalConnectionRequest(request) {
  try {
    const existing = JSON.parse(localStorage.getItem('discover_egypt_community_requests') || '[]');
    existing.push({
      ...request,
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('discover_egypt_community_requests', JSON.stringify(existing));
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }
}
