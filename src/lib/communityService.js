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

export const HERITAGE_AVATARS_MAP = {
  pharaoh: '👑',
  sphinx: '🦁',
  pyramid: '🏛️',
  horus_eye: '👁️',
  sun_ra: '☀️',
  lotus: '🪷',
  felucca: '⛵',
  falcon: '🦅',
};

/**
 * Normalizes Arabic text for flexible matching (removes tashkeel, harmonizes alef & taa marbuta).
 * 100% null-safe and handles non-string inputs gracefully.
 */
export function normalizeArabic(str = '') {
  if (typeof str !== 'string') {
    if (str == null) return '';
    str = String(str);
  }
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
  const set = new Set(userInterests.filter(Boolean).map((i) => String(i).trim().toLowerCase()));
  return explorerInterests.filter(Boolean).filter((item) => set.has(String(item).trim().toLowerCase()));
}

/**
 * Filters a list of prepared community profiles based on search text, selected interest, city, and shared toggle.
 * Runs instantly in memory with zero network latency.
 */
export function filterCommunityProfiles(profiles = [], {
  search = '',
  selectedInterest = 'all',
  selectedCity = 'all',
  onlyShared = false,
} = {}) {
  if (!Array.isArray(profiles)) return [];
  let results = [...profiles];

  // 1. Apply Search Query Filter (name, bio, interests, city)
  const queryNorm = normalizeArabic(search);
  if (queryNorm) {
    results = results.filter((p) => {
      const nameMatch = normalizeArabic(p.displayNameLocalized || p.display_name || '').includes(queryNorm);
      const bioMatch = normalizeArabic(p.bioLocalized || p.bio || '').includes(queryNorm);
      const cityMatch = normalizeArabic(p.cityLocalized || p.city || '').includes(queryNorm);
      const interestMatch = Array.isArray(p.interests) && p.interests.some((i) => normalizeArabic(i || '').includes(queryNorm));
      return nameMatch || bioMatch || cityMatch || interestMatch;
    });
  }

  // 2. Apply Specific Interest Category Filter
  if (selectedInterest && selectedInterest !== 'all') {
    const target = selectedInterest.trim().toLowerCase();
    results = results.filter((p) =>
      Array.isArray(p.interests) &&
      p.interests.some((i) => typeof i === 'string' && i.trim().toLowerCase() === target)
    );
  }

  // 3. Apply City Filter
  if (selectedCity && selectedCity !== 'all') {
    const cityNorm = normalizeArabic(selectedCity);
    results = results.filter((p) =>
      normalizeArabic(p.city || p.cityLocalized || '').includes(cityNorm)
    );
  }

  // 4. Apply "Shared Only" Filter
  if (onlyShared) {
    results = results.filter((p) => (p.sharedCount || 0) > 0);
  }

  // 5. Sort: highest shared interests first, then newest
  results.sort((a, b) => {
    if ((b.sharedCount || 0) !== (a.sharedCount || 0)) {
      return (b.sharedCount || 0) - (a.sharedCount || 0);
    }
    return new Date(b.created_at || b.member_since || 0) - new Date(a.created_at || a.member_since || 0);
  });

  return results;
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

  // 4. Apply filters and sorting
  return filterCommunityProfiles(profilesWithShared, {
    search,
    selectedInterest,
    selectedCity,
    onlyShared,
  });
}

/**
 * Helper to get local fallback requests
 */
function getLocalRequests() {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('discover_egypt_community_requests') || '[]');
  } catch {
    return [];
  }
}

/**
 * Helper to save local fallback requests
 */
function saveLocalRequests(list) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('discover_egypt_community_requests', JSON.stringify(list));
  } catch (e) {
    console.warn('Could not write requests to localStorage:', e);
  }
}

/**
 * Helper to get local fallback conversations
 */
function getLocalConversations() {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('discover_egypt_community_conversations') || '[]');
  } catch {
    return [];
  }
}

/**
 * Helper to save local fallback conversations
 */
function saveLocalConversations(list) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('discover_egypt_community_conversations', JSON.stringify(list));
  } catch (e) {
    console.warn('Could not write conversations to localStorage:', e);
  }
}

/**
 * Helper to get local fallback messages
 */
function getLocalMessages() {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('discover_egypt_community_messages') || '[]');
  } catch {
    return [];
  }
}

/**
 * Helper to save local fallback messages
 */
function saveLocalMessages(list) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('discover_egypt_community_messages', JSON.stringify(list));
  } catch (e) {
    console.warn('Could not write messages to localStorage:', e);
  }
}

let _tablesInstalledCache = null;

/**
 * Checks if the required messaging and connection tables exist in Supabase
 */
export async function checkCommunityTablesInstalled(forceRefresh = false) {
  if (!forceRefresh && _tablesInstalledCache !== null) {
    return _tablesInstalledCache;
  }
  try {
    const { error } = await supabase.from('community_connections').select('id').limit(1);
    if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
      _tablesInstalledCache = false;
      return false;
    }
    _tablesInstalledCache = true;
    return true;
  } catch {
    _tablesInstalledCache = false;
    return false;
  }
}

/**
 * Sends a safe, in-app connection request from one explorer to another
 */
export async function sendConnectionRequest({
  senderId,
  receiverId,
  purpose = 'travel_buddy',
  message,
  sharedInterests = [],
}) {
  if (!senderId || !receiverId || !message?.trim()) {
    throw new Error('Sender, receiver, and message content are required.');
  }

  if (senderId === receiverId) {
    throw new Error('Cannot send a connection request to yourself.');
  }

  // Guard against banned accounts
  if (isUserLocallyBanned(senderId)) {
    return {
      success: false,
      isBanned: true,
      error: 'حسابك معلّق من إرسال طلبات التواصل لمخالفة معايير المجتمع.',
    };
  }

  try {
    const { data: senderProf } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', senderId)
      .maybeSingle();

    if (senderProf?.is_banned) {
      return {
        success: false,
        isBanned: true,
        error: 'حسابك معلّق من إرسال طلبات التواصل لمخالفة معايير المجتمع.',
      };
    }
  } catch {
    // Continue gracefully
  }

  const payload = {
    sender_id: senderId,
    receiver_id: receiverId,
    purpose: purpose || 'travel_buddy',
    message: message.trim(),
    shared_interests: Array.isArray(sharedInterests) ? sharedInterests : [],
    status: 'pending',
  };

  try {
    // 1. Check if a pending request already exists in Supabase
    const { data: existing, error: checkError } = await supabase
      .from('community_connections')
      .select('id, status')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      const isMissingTable = checkError.code === 'PGRST205' || checkError.message?.includes('schema cache');
      if (isMissingTable) {
        _tablesInstalledCache = false;
        return {
          success: false,
          dbMissing: true,
          error: 'Database table community_connections is not yet created in Supabase.',
        };
      }
    }

    if (existing) {
      return { success: false, alreadyPending: true, data: existing };
    }

    // 2. Insert connection request into Supabase
    const { data, error } = await supabase
      .from('community_connections')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Database insert into community_connections:', error.message);
      const isMissingTable = error.code === 'PGRST205' || error.message?.includes('schema cache');
      if (isMissingTable) {
        _tablesInstalledCache = false;
        return {
          success: false,
          dbMissing: true,
          error: 'Database table community_connections is missing in Supabase. Run community_messaging_schema.sql to activate.',
        };
      }
      return { success: false, error: error.message };
    }

    _tablesInstalledCache = true;
    return { success: true, data };
  } catch (err) {
    console.warn('Network exception while sending connection request:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches incoming connection requests for a user with sender profile info
 */
export async function fetchIncomingRequests(userId) {
  if (!userId) return [];
  let requests;

  try {
    const { data, error } = await supabase
      .from('community_connections')
      .select('*')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      requests = data;
    } else {
      // Fallback to local storage
      requests = getLocalRequests().filter((r) => r.receiver_id === userId);
    }
  } catch {
    requests = getLocalRequests().filter((r) => r.receiver_id === userId);
  }

  // Enrich requests with sender profile details
  if (requests.length > 0) {
    const senderIds = [...new Set(requests.map((r) => r.sender_id))];
    let profilesMap = {};

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, city, interests')
        .in('id', senderIds);

      if (Array.isArray(profiles)) {
        profiles.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    } catch {
      // Ignore profile enrich error
    }

    requests = requests.map((r) => ({
      ...r,
      sender: profilesMap[r.sender_id] || {
        id: r.sender_id,
        display_name: 'مستكشف مصري',
        avatar_url: 'pharaoh',
      },
    }));
  }

  return requests;
}

/**
 * Fetches outgoing connection requests sent by the current user
 */
export async function fetchOutgoingRequests(userId) {
  if (!userId) return [];
  let requests;

  try {
    const { data, error } = await supabase
      .from('community_connections')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      requests = data;
    } else {
      requests = getLocalRequests().filter((r) => r.sender_id === userId);
    }
  } catch {
    requests = getLocalRequests().filter((r) => r.sender_id === userId);
  }

  // Enrich with receiver profile details
  if (requests.length > 0) {
    const receiverIds = [...new Set(requests.map((r) => r.receiver_id))];
    let profilesMap = {};

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, city, interests')
        .in('id', receiverIds);

      if (Array.isArray(profiles)) {
        profiles.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    } catch {
      // Ignore profile enrich error
    }

    requests = requests.map((r) => ({
      ...r,
      receiver: profilesMap[r.receiver_id] || {
        id: r.receiver_id,
        display_name: 'مستكشف مصري',
        avatar_url: 'pharaoh',
      },
    }));
  }

  return requests;
}

/**
 * Responds to a connection request (accept or reject)
 * If accepted, automatically creates or activates a conversation.
 */
export async function respondToConnectionRequest({ requestId, status, currentUserId }) {
  if (!requestId || !status || !currentUserId) {
    throw new Error('requestId, status, and currentUserId are required.');
  }

  let updatedRequest = null;

  try {
    const { data, error } = await supabase
      .from('community_connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', currentUserId)
      .select()
      .single();

    if (!error && data) {
      updatedRequest = data;
    }
  } catch {
    // Handled below in fallback
  }

  // Local fallback update
  if (!updatedRequest) {
    const local = getLocalRequests();
    const idx = local.findIndex((r) => r.id === requestId && r.receiver_id === currentUserId);
    if (idx !== -1) {
      local[idx].status = status;
      local[idx].updated_at = new Date().toISOString();
      updatedRequest = local[idx];
      saveLocalRequests(local);
    }
  }

  let conversation = null;
  if (status === 'accepted' && updatedRequest) {
    conversation = await getOrCreateConversation({
      connectionId: updatedRequest.id,
      user1Id: updatedRequest.sender_id,
      user2Id: updatedRequest.receiver_id,
    });
  }

  return { success: true, data: updatedRequest, conversation };
}

/**
 * Gets or creates a conversation between two users
 */
export async function getOrCreateConversation({ connectionId = null, user1Id, user2Id }) {
  if (!user1Id || !user2Id) throw new Error('user1Id and user2Id are required.');

  // Always order participants consistently to respect UNIQUE(participant1_id, participant2_id)
  const p1 = user1Id < user2Id ? user1Id : user2Id;
  const p2 = user1Id < user2Id ? user2Id : user1Id;

  try {
    // 1. Try to find existing conversation in Supabase
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant1_id', p1)
      .eq('participant2_id', p2)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // 2. Insert new conversation
    const { data: created, error } = await supabase
      .from('conversations')
      .insert([{
        connection_id: connectionId,
        participant1_id: p1,
        participant2_id: p2,
        last_message_text: '',
        last_message_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (!error && created) {
      return created;
    }
  } catch (err) {
    console.warn('Error querying/inserting conversation in Supabase:', err);
  }

  // Fallback to local storage
  const local = getLocalConversations();
  let found = local.find(
    (c) => (c.participant1_id === p1 && c.participant2_id === p2)
  );

  if (!found) {
    found = {
      id: 'local-conv-' + Date.now(),
      connection_id: connectionId,
      participant1_id: p1,
      participant2_id: p2,
      last_message_text: '',
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    local.unshift(found);
    saveLocalConversations(local);
  }

  return found;
}

/**
 * Fetches all active conversations for a user with the other participant's profile
 */
export async function fetchConversations(userId) {
  if (!userId) return [];
  let conversations;

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      conversations = data;
    } else {
      conversations = getLocalConversations().filter(
        (c) => c.participant1_id === userId || c.participant2_id === userId
      );
    }
  } catch {
    conversations = getLocalConversations().filter(
      (c) => c.participant1_id === userId || c.participant2_id === userId
    );
  }

  // Enrich with other participant's profile
  if (conversations.length > 0) {
    const otherUserIds = [
      ...new Set(
        conversations.map((c) =>
          c.participant1_id === userId ? c.participant2_id : c.participant1_id
        )
      ),
    ];

    let profilesMap = {};
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, city')
        .in('id', otherUserIds);

      if (Array.isArray(profiles)) {
        profiles.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    } catch {
      // Ignore error
    }

    conversations = conversations.map((c) => {
      const otherId = c.participant1_id === userId ? c.participant2_id : c.participant1_id;
      return {
        ...c,
        otherUser: profilesMap[otherId] || {
          id: otherId,
          display_name: 'مستكشف مصري',
          avatar_url: 'pharaoh',
        },
      };
    });
  }

  return conversations;
}

/**
 * Fetches messages in a conversation
 */
export async function fetchMessages(conversationId) {
  if (!conversationId) return [];

  let list;
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      list = data;
    } else {
      list = getLocalMessages().filter((m) => m.conversation_id === conversationId);
    }
  } catch (err) {
    console.warn('Error fetching messages from Supabase:', err);
    list = getLocalMessages().filter((m) => m.conversation_id === conversationId);
  }

  // Deduplicate by message ID and sort by timestamp
  const seen = new Set();
  const unique = [];
  for (const m of list) {
    if (m?.id && seen.has(m.id)) continue;
    if (m?.id) seen.add(m.id);
    unique.push(m);
  }
  return unique.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

/**
 * Sends a message in a conversation and updates conversation's last_message metadata
 */
export async function sendMessage({ conversationId, senderId, content }) {
  if (!conversationId || !senderId || !content?.trim()) {
    throw new Error('conversationId, senderId, and content are required.');
  }

  // Guard against banned accounts attempting to send messages
  if (isUserLocallyBanned(senderId)) {
    throw new Error('حسابك معلّق من إرسال الرسائل لمخالفة معايير المجتمع.');
  }

  try {
    const { data: senderProf } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', senderId)
      .maybeSingle();

    if (senderProf?.is_banned) {
      throw new Error('USER_BANNED');
    }
  } catch (banErr) {
    if (banErr.message === 'USER_BANNED') {
      throw new Error('حسابك معلّق من إرسال الرسائل لمخالفة معايير المجتمع.', { cause: banErr });
    }
  }

  const payload = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
    is_read: false,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      // 2. Update conversation last_message metadata
      await supabase
        .from('conversations')
        .update({
          last_message_text: payload.content,
          last_message_at: payload.created_at,
          updated_at: payload.created_at,
        })
        .eq('id', conversationId);

      return { success: true, data };
    }
  } catch (err) {
    console.warn('Error sending message to Supabase:', err);
  }

  // Fallback to local storage
  const localMsgs = getLocalMessages();
  const newMsg = {
    ...payload,
    id: 'local-msg-' + Date.now(),
  };
  localMsgs.push(newMsg);
  saveLocalMessages(localMsgs);

  // Update local conversation
  const localConvs = getLocalConversations();
  const convIdx = localConvs.findIndex((c) => c.id === conversationId);
  if (convIdx !== -1) {
    localConvs[convIdx].last_message_text = payload.content;
    localConvs[convIdx].last_message_at = payload.created_at;
    saveLocalConversations(localConvs);
  }

  return { success: true, localOnly: true, data: newMsg };
}

/**
 * Subscribes to Realtime updates on connection requests for a user
 */
export function subscribeToRequests(userId, callback) {
  if (!userId || typeof callback !== 'function') return () => {};

  try {
    const channel = supabase
      .channel(`user-requests-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_connections' },
        (payload) => {
          const rec = payload.new || payload.old;
          if (rec?.receiver_id === userId || rec?.sender_id === userId) {
            callback(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Realtime subscribeToRequests failed:', e);
    return () => {};
  }
}

/**
 * Subscribes to Realtime message insertion in a conversation
 */
export function subscribeToMessages(conversationId, callback) {
  if (!conversationId || typeof callback !== 'function') return () => {};

  try {
    const channelName = `chat-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new) {
            callback(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Realtime subscribeToMessages failed:', e);
    return () => {};
  }
}

/**
 * Full SQL schema required on Supabase to enable community connections & chat
 */
export const COMMUNITY_MESSAGING_SQL = `-- DISCOVER EGYPT — Community Connection Requests & Realtime Messaging Schema
CREATE TABLE IF NOT EXISTS public.community_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text DEFAULT 'travel_buddy',
  message text NOT NULL,
  shared_interests text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT no_self_connect CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_connection_idx 
  ON public.community_connections (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';

ALTER TABLE public.community_connections ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.community_connections TO authenticated;

DROP POLICY IF EXISTS "Participants can view their connection requests" ON public.community_connections;
CREATE POLICY "Participants can view their connection requests"
  ON public.community_connections FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Senders can create connection requests" ON public.community_connections;
CREATE POLICY "Senders can create connection requests"
  ON public.community_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> receiver_id);

DROP POLICY IF EXISTS "Receiver can accept or reject, sender can cancel" ON public.community_connections;
CREATE POLICY "Receiver can accept or reject, sender can cancel"
  ON public.community_connections FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR (auth.uid() = sender_id AND status = 'pending'))
  WITH CHECK (auth.uid() = receiver_id OR (auth.uid() = sender_id AND status = 'cancelled'));

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.community_connections(id) ON DELETE SET NULL,
  participant1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_text text DEFAULT '',
  last_message_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT no_self_conversation CHECK (participant1_id <> participant2_id),
  CONSTRAINT unique_participants UNIQUE (participant1_id, participant2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.conversations TO authenticated;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

DROP POLICY IF EXISTS "Participants can insert conversations" ON public.conversations;
CREATE POLICY "Participants can insert conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;
CREATE POLICY "Participants can update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.messages TO authenticated;

DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));

DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'community_connections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_connections;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

ALTER TABLE public.community_connections REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;`;

/**
 * Permanently deletes the currently authenticated user's account and associated data
 * on the server via Supabase Admin API / Edge Function using service role key,
 * with atomic database RPC fallback.
 * Strictly verifies identity, purges relational records, terminates session,
 * and only signals success when the server confirms deletion.
 */
/**
 * Helper to determine if an Edge Function invocation failed due to being
 * undeployed or unreachable (e.g. 404, FunctionsFetchError, FunctionsRelayError).
 */
export function isEdgeFunctionUnavailable(err, rawMsg = '') {
  if (!err && !rawMsg) return false;
  const name = err?.name || '';
  const msg = `${rawMsg} ${err?.message || ''}`.toLowerCase();
  const status = err?.context?.status;

  return (
    status === 404 ||
    name === 'FunctionsFetchError' ||
    name === 'FunctionsRelayError' ||
    (name === 'FunctionsHttpError' && (status === 404 || msg.includes('404'))) ||
    msg.includes('failed to send a request to the edge function') ||
    msg.includes('failed to fetch') ||
    msg.includes('not found') ||
    msg.includes('not_found') ||
    msg.includes('relay error') ||
    msg.includes('non-2xx status code')
  );
}

export async function deleteCurrentUserAccount() {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user?.id) {
    throw new Error('Not authenticated: You must be logged in to delete your account.');
  }

  const userId = authData.user.id;
  let serverConfirmed = false;
  let lastErrorMsg = null;

  // Strategy 1: Dedicated Server Edge Function 'delete-user' (Supabase Admin API with Service Role Key)
  try {
    const edgeRes = await supabase.functions.invoke('delete-user', {
      body: {},
    });

    if (!edgeRes.error && edgeRes.data?.success) {
      serverConfirmed = true;
    } else if (edgeRes.error) {
      let errMsg = edgeRes.error.message || '';
      try {
        const errorJson = await edgeRes.error.context?.json();
        if (errorJson?.error) errMsg = errorJson.error;
      } catch {
        // ignore json parse error
      }

      if (isEdgeFunctionUnavailable(edgeRes.error, errMsg)) {
        console.info('[delete-user Edge Function is unavailable or not deployed. Trying fallback strategy...]');
      } else {
        lastErrorMsg = errMsg;
        console.error('[Account Deletion Error in delete-user]:', errMsg);
        throw new Error(errMsg);
      }
    } else if (edgeRes.data?.error) {
      lastErrorMsg = edgeRes.data.error;
      console.error('[Account Deletion Error in delete-user data]:', lastErrorMsg);
      throw new Error(lastErrorMsg);
    }
  } catch (edgeErr) {
    if (lastErrorMsg || !isEdgeFunctionUnavailable(edgeErr, edgeErr.message)) {
      throw edgeErr;
    }
  }

  // Strategy 2: Fallback to 'admin-users' Edge Function if 'delete-user' is not available
  if (!serverConfirmed && !lastErrorMsg) {
    try {
      const adminEdgeRes = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete_own_account' },
      });

      if (!adminEdgeRes.error && adminEdgeRes.data?.success) {
        serverConfirmed = true;
      } else if (adminEdgeRes.error) {
        let errMsg = adminEdgeRes.error.message || '';
        try {
          const errorJson = await adminEdgeRes.error.context?.json();
          if (errorJson?.error) errMsg = errorJson.error;
        } catch {
          // ignore
        }

        if (isEdgeFunctionUnavailable(adminEdgeRes.error, errMsg)) {
          console.info('[admin-users Edge Function is unavailable or not deployed. Trying database RPC...]');
        } else {
          lastErrorMsg = errMsg;
          console.error('[Account Deletion Error in admin-users]:', errMsg);
          throw new Error(errMsg);
        }
      } else if (adminEdgeRes.data?.error) {
        lastErrorMsg = adminEdgeRes.data.error;
        console.error('[Account Deletion Error in admin-users data]:', lastErrorMsg);
        throw new Error(lastErrorMsg);
      }
    } catch (adminEdgeErr) {
      if (lastErrorMsg || !isEdgeFunctionUnavailable(adminEdgeErr, adminEdgeErr.message)) {
        throw adminEdgeErr;
      }
    }
  }

  // Strategy 3: Atomic Server Database RPC 'delete_own_user' (PostgreSQL SECURITY DEFINER)
  if (!serverConfirmed && !lastErrorMsg) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_own_user');
      if (rpcError) {
        const isNotInstalled =
          rpcError.code === 'PGRST202' ||
          rpcError.message?.includes('Could not find the function') ||
          rpcError.message?.includes('schema cache');

        if (isNotInstalled) {
          lastErrorMsg =
            'يتطلب حذف الحساب تفعيل دالة SQL في قاعدة بيانات Supabase. يرجى تنفيذ ملف supabase/delete_user_rpc.sql في محرر SQL في Supabase أو نشر دالة Edge Function (supabase functions deploy delete-user).';
          console.warn('[Account Deletion RPC not installed in Supabase]:', rpcError.message);
        } else {
          lastErrorMsg = rpcError.message;
          console.error('[Account Deletion Error in delete_own_user RPC]:', lastErrorMsg);
        }
        throw new Error(lastErrorMsg);
      } else if (rpcData?.success) {
        serverConfirmed = true;
      }
    } catch (rpcCatchErr) {
      if (lastErrorMsg) throw rpcCatchErr;
      console.error('[Account Deletion RPC Exception]:', rpcCatchErr);
      throw rpcCatchErr;
    }
  }

  // If server deletion did not succeed, DO NOT proceed to logout or signal success
  if (!serverConfirmed) {
    const failureReason = lastErrorMsg || 'Server account deletion could not be completed.';
    console.error('[Account Deletion Aborted]:', failureReason);
    throw new Error(failureReason);
  }

  // 4. Purge all user-scoped storage items ONLY after server confirmed deletion
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`discover_egypt_favorites_${userId}`);
      localStorage.removeItem('discover_egypt_test_session');

      // Purge local offline storage fallbacks
      const localReqs = getLocalRequests().filter(
        (r) => r.sender_id !== userId && r.receiver_id !== userId
      );
      saveLocalRequests(localReqs);

      const localConvs = getLocalConversations().filter(
        (c) => c.participant1_id !== userId && c.participant2_id !== userId
      );
      saveLocalConversations(localConvs);

      const localMsgs = getLocalMessages().filter((m) => m.sender_id !== userId);
      saveLocalMessages(localMsgs);
    }
  } catch (storageErr) {
    console.warn('[Account Deletion Storage Warning]:', storageErr);
  }

  // 5. Completely terminate active authentication session
  try {
    await supabase.auth.signOut();
  } catch (signOutErr) {
    console.warn('[Account Deletion SignOut Warning]:', signOutErr);
  }

  return { success: true, userId, serverConfirmed: true };
}

// ==============================================================================
// CHAT REPORTING, EVIDENCE SNAPSHOTTING & MODERATION SERVICES
// ==============================================================================

export const REPORT_REASONS = [
  { id: 'harassment', labelAr: 'مضايقة أو تحرش لفظي', labelEn: 'Harassment or Verbal Abuse', icon: '⚠️' },
  { id: 'hate_speech', labelAr: 'خطاب كراهية أو تمييز', labelEn: 'Hate Speech or Discrimination', icon: '🚫' },
  { id: 'spam_scam', labelAr: 'احتيال أو رسائل مزعجة (سبام)', labelEn: 'Scam or Unsolicited Spam', icon: '📢' },
  { id: 'inappropriate_content', labelAr: 'محتوى غير لائق أو مخل', labelEn: 'Inappropriate or Explicit Content', icon: '🔞' },
  { id: 'violence_threat', labelAr: 'تهديد أو تحريض على العنف', labelEn: 'Violence or Direct Threat', icon: '🛑' },
  { id: 'other', labelAr: 'سبب آخر', labelEn: 'Other Violation', icon: '📝' },
];

export const REPORT_STATUSES = [
  { id: 'pending', labelAr: 'قيد المراجعة', labelEn: 'Pending Review', color: '#D97706', bg: '#FEF3C7' },
  { id: 'investigating', labelAr: 'قيد التحقيق', labelEn: 'Investigating', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'action_taken', labelAr: 'تم اتخاذ إجراء', labelEn: 'Action Taken', color: '#059669', bg: '#D1FAE5' },
  { id: 'dismissed', labelAr: 'أُغلق دون إجراء', labelEn: 'Dismissed', color: '#6B7280', bg: '#F3F4F6' },
];

/**
 * Local fallback helpers for offline/test environment & resilient ban registry
 */
let _memBannedUsers = {};

export const BANNED_USERS_KEY = 'discover_egypt_banned_users';

export function getBannedUsersRegistry() {
  if (typeof localStorage === 'undefined') return _memBannedUsers;
  try {
    const raw = localStorage.getItem(BANNED_USERS_KEY);
    return raw ? JSON.parse(raw) : _memBannedUsers;
  } catch {
    return _memBannedUsers;
  }
}

export function saveBannedUsersRegistry(registry) {
  _memBannedUsers = { ...(registry || {}) };
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(BANNED_USERS_KEY, JSON.stringify(registry || {}));
  } catch (e) {
    console.warn('Could not save banned users registry to localStorage:', e);
  }
}

export function getUserBanInfo(userId) {
  if (!userId) return null;
  const registry = getBannedUsersRegistry();
  return registry[userId] || null;
}

export function isUserLocallyBanned(userId) {
  if (!userId) return false;
  const registry = getBannedUsersRegistry();
  return Boolean(registry[userId]?.is_banned);
}

export async function isUserBanned(userId) {
  if (!userId) return false;
  if (isUserLocallyBanned(userId)) return true;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', userId)
      .maybeSingle();
    return Boolean(data?.is_banned);
  } catch {
    return false;
  }
}

export async function checkModerationSchemaStatus() {
  try {
    const { error: rErr } = await supabase
      .from('chat_reports')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    const { error: bErr } = await supabase
      .from('profiles')
      .select('is_banned', { head: true })
      .limit(1);

    const isInstalled = !rErr && !bErr;
    return {
      isInstalled,
      reportsTableMissing: Boolean(rErr),
      banColumnMissing: Boolean(bErr),
    };
  } catch {
    return { isInstalled: false, reportsTableMissing: true, banColumnMissing: true };
  }
}

let _memReports = [];
let _memAuditLogs = [];

function getLocalReports() {
  if (typeof localStorage === 'undefined') return _memReports;
  try {
    const stored = localStorage.getItem('discover_egypt_chat_reports');
    return stored ? JSON.parse(stored) : _memReports;
  } catch {
    return _memReports;
  }
}

function saveLocalReports(reports) {
  _memReports = reports;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('discover_egypt_chat_reports', JSON.stringify(reports));
  } catch (e) {
    console.warn('Could not save reports to localStorage:', e);
  }
}

function getLocalAuditLogs() {
  if (typeof localStorage === 'undefined') return _memAuditLogs;
  try {
    const stored = localStorage.getItem('discover_egypt_audit_logs');
    return stored ? JSON.parse(stored) : _memAuditLogs;
  } catch {
    return _memAuditLogs;
  }
}

function saveLocalAuditLogs(logs) {
  _memAuditLogs = logs;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('discover_egypt_audit_logs', JSON.stringify(logs));
  } catch (e) {
    console.warn('Could not save audit logs to localStorage:', e);
  }
}

/**
 * Submits a chat report with server-side frozen evidence
 */
export async function submitChatReport({
  reporterId,
  reportedUserId,
  conversationId,
  reason,
  details = '',
  messageIds = [],
}) {
  if (!reporterId || !reportedUserId || !conversationId || !reason) {
    throw new Error('reporterId, reportedUserId, conversationId, and reason are required.');
  }

  if (reporterId === reportedUserId) {
    throw new Error('You cannot report yourself.');
  }

  // Strategy 1: Stored Procedure RPC (submit_chat_report)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_chat_report', {
      p_reported_user_id: reportedUserId,
      p_conversation_id: conversationId,
      p_reason: reason,
      p_details: details.trim(),
      p_message_ids: Array.isArray(messageIds) ? messageIds : [],
    });

    if (!rpcError && rpcData?.success) {
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('community:report_submitted', {
              detail: {
                reportId: rpcData.report_id,
                reporterId,
                reportedUserId,
                reason,
              },
            })
          );
        } catch (eventErr) {
          console.debug('Event dispatch exception:', eventErr);
        }
      }
      return {
        success: true,
        reportId: rpcData.report_id,
        evidenceCount: rpcData.evidence_count,
        message: rpcData.message,
      };
    } else if (rpcError) {
      // If it's a validation error raised by the RPC (e.g. rate-limit or self-report), rethrow
      if (rpcError.message && (rpcError.message.includes('Rate Limit') || rpcError.message.includes('Forbidden'))) {
        throw new Error(rpcError.message);
      }
      console.warn('submit_chat_report RPC failed or missing, trying direct insert:', rpcError.message);
    }
  } catch (rpcCatch) {
    if (rpcCatch.message && (rpcCatch.message.includes('Rate Limit') || rpcCatch.message.includes('Forbidden') || rpcCatch.message.includes('Bad Request'))) {
      throw rpcCatch;
    }
    console.warn('submit_chat_report RPC exception:', rpcCatch.message);
  }

  // Strategy 2: Direct Supabase database insertion
  try {
    const newReport = {
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      conversation_id: conversationId,
      reason,
      details: details.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedReport, error: insertErr } = await supabase
      .from('chat_reports')
      .insert([newReport])
      .select()
      .single();

    if (!insertErr && insertedReport) {
      // Freeze evidence if messages were provided
      if (Array.isArray(messageIds) && messageIds.length > 0) {
        try {
          const { data: actualMsgs } = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at')
            .eq('conversation_id', conversationId)
            .in('id', messageIds);

          if (Array.isArray(actualMsgs) && actualMsgs.length > 0) {
            const evidenceRecords = actualMsgs.map((m) => ({
              report_id: insertedReport.id,
              message_id: m.id,
              sender_id: m.sender_id,
              message_timestamp: m.created_at,
              message_content: m.content,
              created_at: new Date().toISOString(),
            }));

            await supabase.from('chat_report_evidence').insert(evidenceRecords);
          }
        } catch (evErr) {
          console.warn('Could not insert evidence records directly:', evErr);
        }
      }

      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('community:report_submitted', {
              detail: {
                reportId: insertedReport.id,
                reporterId,
                reportedUserId,
                reason,
              },
            })
          );
        } catch (eventErr) {
          console.debug('Event dispatch exception:', eventErr);
        }
      }

      return {
        success: true,
        reportId: insertedReport.id,
        evidenceCount: messageIds.length,
      };
    }
  } catch (directErr) {
    console.warn('Direct report insert error:', directErr);
  }

  // Strategy 3: Local storage fallback for testing / offline demo
  const localList = getLocalReports();
  const reportId = 'local-report-' + Date.now();
  const fallbackReport = {
    id: reportId,
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    conversation_id: conversationId,
    reason,
    details: details.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    evidence_count: messageIds.length,
    _evidence_snapshot: getLocalMessages()
      .filter((m) => messageIds.includes(m.id))
      .map((m) => ({
        message_id: m.id,
        sender_id: m.sender_id,
        message_timestamp: m.created_at,
        message_content: m.content,
      })),
  };

  localList.unshift(fallbackReport);
  saveLocalReports(localList);

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('community:report_submitted', {
          detail: {
            reportId,
            reporterId,
            reportedUserId,
            reason,
            isLocalFallback: true,
          },
        })
      );
    } catch (eventErr) {
      console.debug('Event dispatch exception:', eventErr);
    }
  }

  return {
    success: true,
    reportId,
    evidenceCount: messageIds.length,
    isLocalFallback: true,
  };
}

/**
 * Fetches reports for the admin dashboard with full profile resolution and evidence counts
 */
export async function fetchAdminReports({
  status = 'all',
  search = '',
  page = 1,
  perPage = 10,
} = {}) {
  let reports;
  let total;
  let supabaseError = null;

  try {
    let query = supabase
      .from('chat_reports')
      .select('id, reporter_id, reported_user_id, conversation_id, reason, details, status, admin_notes, action_type, resolved_by, resolved_at, created_at, updated_at', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const startIndex = (page - 1) * perPage;
    query = query.range(startIndex, startIndex + perPage - 1);

    const { data, count, error } = await query;

    if (!error && Array.isArray(data)) {
      reports = data;
      if (reports.length === 0) {
        const local = getLocalReports();
        if (local.length > 0) {
          reports = local;
        }
      }
      total = count ?? reports.length;
    } else {
      if (error) {
        console.error('fetchAdminReports Supabase query error:', error);
        supabaseError = {
          code: error.code || null,
          message: error.message || 'Error executing query on chat_reports',
          details: error.details || null,
          hint: error.hint || null,
          status: error.status || null,
        };
      }
      // Fallback to local storage
      reports = getLocalReports();
      if (status && status !== 'all') {
        reports = reports.filter((r) => r.status === status);
      }
      total = reports.length;
      reports = reports.slice(startIndex, startIndex + perPage);
    }
  } catch (err) {
    console.error('Error fetching reports from Supabase:', err);
    supabaseError = {
      code: err?.code || 'FETCH_EXCEPTION',
      message: err?.message || 'Exception fetching reports',
    };
    reports = getLocalReports();
    if (status && status !== 'all') {
      reports = reports.filter((r) => r.status === status);
    }
    total = reports.length;
    reports = reports.slice((page - 1) * perPage, page * perPage);
  }

  // Enrich reports with profiles & evidence count
  if (reports.length > 0) {
    const userIds = [
      ...new Set([
        ...reports.map((r) => r.reporter_id).filter(Boolean),
        ...reports.map((r) => r.reported_user_id).filter(Boolean),
      ]),
    ];

    let profilesMap = {};
    if (userIds.length > 0) {
      try {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role, is_banned, ban_reason')
          .in('id', userIds);

        if (!profErr && Array.isArray(profs)) {
          profs.forEach((p) => {
            profilesMap[p.id] = p;
          });
        } else {
          // Fallback if is_banned column is not yet present in profiles schema
          const { data: fallbackProfs } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, role')
            .in('id', userIds);

          if (Array.isArray(fallbackProfs)) {
            fallbackProfs.forEach((p) => {
              profilesMap[p.id] = p;
            });
          }
        }
      } catch (profErr) {
        console.warn('Error enriching report profiles:', profErr);
      }
    }

    // Get evidence counts per report
    const reportIds = reports.map((r) => r.id);
    let evidenceCountsMap = {};
    try {
      const { data: evData } = await supabase
        .from('chat_report_evidence')
        .select('report_id')
        .in('report_id', reportIds);

      if (Array.isArray(evData)) {
        evData.forEach((ev) => {
          evidenceCountsMap[ev.report_id] = (evidenceCountsMap[ev.report_id] || 0) + 1;
        });
      }
    } catch {
      // Ignore count error
    }

    reports = reports.map((r) => {
      const repUser = profilesMap[r.reported_user_id] || {
        id: r.reported_user_id,
        display_name: 'مستكشف مصري',
        avatar_url: 'sphinx',
        is_banned: false,
      };
      const banInfo = getUserBanInfo(r.reported_user_id);
      const isBanned = Boolean(repUser.is_banned || banInfo?.is_banned);
      const banReason = repUser.ban_reason || banInfo?.ban_reason || null;

      return {
        ...r,
        reporter: profilesMap[r.reporter_id] || {
          id: r.reporter_id,
          display_name: 'مستكشف مصري',
          avatar_url: 'pharaoh',
        },
        reportedUser: {
          ...repUser,
          is_banned: isBanned,
          ban_reason: banReason,
        },
        evidenceCount: evidenceCountsMap[r.id] || r.evidence_count || (r._evidence_snapshot ? r._evidence_snapshot.length : 0),
      };
    });
  }

  // Filter by search query if provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    reports = reports.filter((r) => {
      const reporterName = (r.reporter?.display_name || '').toLowerCase();
      const reportedName = (r.reportedUser?.display_name || '').toLowerCase();
      const reasonMatch = (r.reason || '').toLowerCase().includes(q);
      const idMatch = (r.id || '').toLowerCase().includes(q);
      return reporterName.includes(q) || reportedName.includes(q) || reasonMatch || idMatch;
    });
  }

  return {
    reports,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage) || 1,
    supabaseError,
    isFallback: Boolean(supabaseError),
  };
}

/**
 * Fetches single report details with immutable evidence records and audit history
 */
export async function fetchReportDetails(reportId) {
  if (!reportId) return null;

  let report = null;
  let evidence = [];
  let auditLogs = [];

  // 1. Fetch report row
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId);
    if (isUuid) {
      const { data, error } = await supabase
        .from('chat_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

      if (!error && data) {
        report = data;
      }
    }
  } catch (err) {
    console.warn('Error fetching report detail from DB:', err);
  }

  // Local fallback
  if (!report) {
    const local = getLocalReports();
    report = local.find((r) => r.id === reportId) || null;
    if (report && report._evidence_snapshot) {
      evidence = report._evidence_snapshot;
    }
  }

  if (!report) return null;

  // 2. Fetch profiles
  let reporter = null;
  let reportedUser = null;
  try {
    const { data: profs, error: profsErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, is_banned, ban_reason, banned_at, city')
      .in('id', [report.reporter_id, report.reported_user_id]);

    if (!profsErr && Array.isArray(profs)) {
      reporter = profs.find((p) => p.id === report.reporter_id) || null;
      reportedUser = profs.find((p) => p.id === report.reported_user_id) || null;
    } else {
      // Fallback if is_banned column is missing
      const { data: fallbackProfs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role, city')
        .in('id', [report.reporter_id, report.reported_user_id]);

      if (Array.isArray(fallbackProfs)) {
        reporter = fallbackProfs.find((p) => p.id === report.reporter_id) || null;
        reportedUser = fallbackProfs.find((p) => p.id === report.reported_user_id) || null;
      }
    }
  } catch {
    // Continue
  }

  // Overlay ban info from resilient registry
  if (reportedUser) {
    const banInfo = getUserBanInfo(reportedUser.id);
    if (banInfo) {
      reportedUser = {
        ...reportedUser,
        is_banned: Boolean(reportedUser.is_banned || banInfo.is_banned),
        ban_reason: reportedUser.ban_reason || banInfo.ban_reason,
        banned_at: reportedUser.banned_at || banInfo.banned_at,
      };
    }
  } else if (report.reported_user_id) {
    const banInfo = getUserBanInfo(report.reported_user_id);
    reportedUser = {
      id: report.reported_user_id,
      display_name: 'مستكشف مصري',
      is_banned: Boolean(banInfo?.is_banned),
      ban_reason: banInfo?.ban_reason || null,
    };
  }

  // 3. Fetch evidence records
  if (evidence.length === 0) {
    try {
      const { data: evData, error: evErr } = await supabase
        .from('chat_report_evidence')
        .select('*')
        .eq('report_id', reportId)
        .order('message_timestamp', { ascending: true });

      if (!evErr && Array.isArray(evData)) {
        evidence = evData;
      }
    } catch (err) {
      console.warn('Error fetching report evidence:', err);
    }
  }

  // 4. Fetch audit logs for this report
  try {
    const { data: logsData } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('target_id', reportId)
      .order('created_at', { ascending: false });

    if (Array.isArray(logsData)) {
      auditLogs = logsData;
    }
  } catch {
    // Local fallback
    auditLogs = getLocalAuditLogs().filter((l) => l.target_id === reportId);
  }

  return {
    ...report,
    reporter: reporter || { id: report.reporter_id, display_name: 'مستكشف' },
    reportedUser: reportedUser || { id: report.reported_user_id, display_name: 'مستكشف' },
    evidence,
    auditLogs,
  };
}

/**
 * Updates report status and admin notes with audit trail
 */
export async function adminModerateReport({
  reportId,
  status,
  adminNotes = '',
  actionType = 'none',
  adminId = null,
}) {
  if (!reportId || !status) {
    throw new Error('reportId and status are required.');
  }

  // Strategy 1: Stored Procedure RPC (admin_moderate_report)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_moderate_report', {
      p_report_id: reportId,
      p_new_status: status,
      p_admin_notes: adminNotes,
      p_action_type: actionType,
    });

    if (!rpcError && (rpcData?.success || rpcData === true)) {
      return { success: true, reportId, status };
    }
  } catch (err) {
    console.warn('admin_moderate_report RPC failed, attempting direct table update:', err);
  }

  // Strategy 2: Direct Table Update
  const updatePayload = {
    status,
    admin_notes: adminNotes,
    action_type: actionType,
    resolved_by: adminId,
    resolved_at: ['action_taken', 'dismissed'].includes(status) ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('chat_reports')
      .update(updatePayload)
      .eq('id', reportId)
      .select()
      .single();

    if (!error && data) {
      // Insert audit log
      if (adminId) {
        try {
          await supabase.from('admin_audit_logs').insert([
            {
              admin_id: adminId,
              action: 'report_status_updated',
              target_type: 'chat_report',
              target_id: reportId,
              details: { new_status: status, action_type: actionType },
              reason: adminNotes,
              created_at: new Date().toISOString(),
            },
          ]);
        } catch {
          // Ignore audit insert error
        }
      }
      return { success: true, data };
    }
  } catch (directErr) {
    console.warn('Direct update failed:', directErr);
  }

  // Strategy 3: Local storage fallback
  const local = getLocalReports();
  const idx = local.findIndex((r) => r.id === reportId);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updatePayload };
    saveLocalReports(local);
  }

  const localLogs = getLocalAuditLogs();
  localLogs.unshift({
    id: 'local-log-' + Date.now(),
    admin_id: adminId || 'admin',
    action: 'report_status_updated',
    target_type: 'chat_report',
    target_id: reportId,
    details: { new_status: status, action_type: actionType },
    reason: adminNotes,
    created_at: new Date().toISOString(),
  });
  saveLocalAuditLogs(localLogs);

  return { success: true, local: true };
}

/**
 * Bans or unbans a user account across the platform
 */
export async function adminSetUserBanStatus({
  targetUserId,
  isBanned,
  banReason = '',
  reportId = null,
  adminId = null,
}) {
  if (!targetUserId || typeof isBanned !== 'boolean') {
    throw new Error('targetUserId and isBanned boolean are required.');
  }

  let serverSuccess = false;

  // Strategy 1: Stored Procedure RPC (admin_set_user_ban_status)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_set_user_ban_status', {
      p_target_user_id: targetUserId,
      p_is_banned: isBanned,
      p_ban_reason: banReason,
      p_report_id: reportId,
    });

    if (!rpcError && (rpcData?.success || rpcData === true)) {
      serverSuccess = true;
    }
  } catch (err) {
    console.warn('admin_set_user_ban_status RPC failed, trying Edge Function fallback:', err);
  }

  // Strategy 2: Edge Function 'admin-users' (with service-role key on server)
  if (!serverSuccess) {
    try {
      const edgeRes = await supabase.functions.invoke('admin-users', {
        body: {
          action: isBanned ? 'ban_user' : 'unban_user',
          targetUserId,
          banReason: banReason || (isBanned ? 'Violating community guidelines' : ''),
          reportId,
        },
      });

      if (!edgeRes.error && edgeRes.data?.success) {
        serverSuccess = true;
      }
    } catch (edgeErr) {
      console.warn('admin-users Edge Function invocation failed, falling back to direct table update:', edgeErr);
    }
  }

  // Strategy 3: Direct Profile Update
  if (!serverSuccess) {
    const profileUpdate = {
      is_banned: isBanned,
      banned_at: isBanned ? new Date().toISOString() : null,
      ban_reason: isBanned ? (banReason || 'Violating community guidelines') : null,
      banned_by: isBanned ? adminId : null,
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', targetUserId)
        .select();

      if (!error && data && data.length > 0) {
        serverSuccess = true;
      }
    } catch (err) {
      console.warn('Direct profile ban update failed (column may be pending):', err);
    }
  }

  // Database audit logs (optional best-effort)
  if (adminId) {
    try {
      await supabase.from('admin_audit_logs').insert([
        {
          admin_id: adminId,
          action: isBanned ? 'user_banned' : 'user_unbanned',
          target_type: 'user',
          target_id: targetUserId,
          details: { is_banned: isBanned, report_id: reportId },
          reason: banReason,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // ignore
    }
  }

  // If associated with a report and banning user, update report status in database
  if (reportId && isBanned) {
    try {
      await supabase
        .from('chat_reports')
        .update({
          status: 'action_taken',
          action_type: 'user_banned',
          resolved_by: adminId,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    } catch {
      // ignore
    }
  }

  // Strategy 4: Resilient Local Banned Registry Persistence
  const registry = getBannedUsersRegistry();
  if (isBanned) {
    registry[targetUserId] = {
      is_banned: true,
      ban_reason: banReason || 'Violating community guidelines',
      banned_at: new Date().toISOString(),
      banned_by: adminId,
      report_id: reportId,
    };
  } else {
    delete registry[targetUserId];
  }
  saveBannedUsersRegistry(registry);

  // Strategy 5: Update Local Reports store if matching
  try {
    const local = getLocalReports();
    let updatedReports = false;
    for (let i = 0; i < local.length; i++) {
      if (local[i].reported_user_id === targetUserId) {
        if (!local[i].reportedUser) local[i].reportedUser = { id: targetUserId };
        local[i].reportedUser.is_banned = isBanned;
        local[i].reportedUser.ban_reason = isBanned ? banReason : null;
        if (isBanned && (local[i].id === reportId || !reportId)) {
          local[i].status = 'action_taken';
          local[i].action_type = 'user_banned';
        }
        updatedReports = true;
      }
    }
    if (updatedReports) {
      saveLocalReports(local);
    }
  } catch (err) {
    console.warn('Could not update local reports with ban status:', err);
  }

  // Strategy 6: Save in Local Audit Log
  const localLogs = getLocalAuditLogs();
  localLogs.unshift({
    id: 'local-log-' + Date.now(),
    admin_id: adminId || 'admin',
    action: isBanned ? 'user_banned' : 'user_unbanned',
    target_type: 'user',
    target_id: targetUserId,
    details: { is_banned: isBanned, report_id: reportId },
    reason: banReason,
    created_at: new Date().toISOString(),
  });
  saveLocalAuditLogs(localLogs);

  // Strategy 7: Realtime DOM Event Broadcast so open UI components immediately react
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('community:ban_status_changed', {
        detail: { targetUserId, isBanned, banReason, adminId },
      })
    );
  }

  return { success: true, targetUserId, isBanned, serverConfirmed: serverSuccess };
}

/**
 * Fetches admin audit logs
 */
export async function fetchAdminAuditLogs({
  targetType = null,
  targetId = null,
  limit = 50,
} = {}) {
  try {
    let query = supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (targetType) query = query.eq('target_type', targetType);
    if (targetId) query = query.eq('target_id', targetId);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn('Error fetching audit logs from Supabase:', err);
  }

  let local = getLocalAuditLogs();
  if (targetType) local = local.filter((l) => l.target_type === targetType);
  if (targetId) local = local.filter((l) => l.target_id === targetId);
  return local.slice(0, limit);
}

export const CHAT_MODERATION_SQL = `-- DISCOVER EGYPT — Chat Moderation, User Reporting & Ban Enforcement Schema
-- 1. Helper function: public.is_admin() (trusted server-side admin check)
-- 2. Extends public.profiles with ban attributes (is_banned, banned_at, ban_reason, banned_by)
-- 3. Sets designated admin accounts to role = 'admin' in public.profiles
-- 4. Creates public.chat_reports (tracking reporter, reported, conversation, reason, status)
-- 5. Creates public.chat_report_evidence (immutable snapshot of messages & timestamps at report time)
-- 6. Creates public.admin_audit_logs (tamper-evident audit trail of moderator actions)
-- 7. Hardens Row Level Security (RLS) on all tables (strict admin-only reads & audits)
-- 8. Enables Supabase Realtime publication on public.chat_reports
-- 9. Enforces ban checks on message sending and connection creation
-- 10. Provides SECURITY DEFINER RPC functions:
--     - submit_chat_report(...) : captures and freezes evidence from actual messages
--     - admin_moderate_report(...) : updates report status with audit log
--     - admin_set_user_ban_status(...) : safely bans/unbans users with audit log

-- 1. Trusted Server-Side Admin Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  caller_id uuid;
  caller_email text;
  is_admin_flag boolean := false;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  caller_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF caller_email IN ('om7765355@gmail.com', 'omarmahmoud3@gmail.com') THEN
    RETURN true;
  END IF;

  SELECT (role = 'admin') INTO is_admin_flag
  FROM public.profiles
  WHERE id = caller_id;

  RETURN COALESCE(is_admin_flag, false);
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- 2. Extend public.profiles with Ban Attributes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- 3. Provision Designated Admin Accounts in public.profiles
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE LOWER(email) IN ('om7765355@gmail.com', 'omarmahmoud3@gmail.com')
);

-- 4. Table: public.chat_reports
CREATE TABLE IF NOT EXISTS public.chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (
    reason IN (
      'harassment',
      'hate_speech',
      'spam_scam',
      'inappropriate_content',
      'violence_threat',
      'other'
    )
  ),
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'investigating', 'action_taken', 'dismissed')
  ),
  admin_notes text DEFAULT '',
  action_type text DEFAULT NULL CHECK (
    action_type IS NULL OR action_type IN ('none', 'warned', 'user_banned', 'content_removed')
  ),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON public.chat_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reported_user ON public.chat_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter ON public.chat_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_created_at ON public.chat_reports(created_at DESC);

-- 5. Table: public.chat_report_evidence
CREATE TABLE IF NOT EXISTS public.chat_report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.chat_reports(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_timestamp timestamptz NOT NULL,
  message_content text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_evidence_report_id ON public.chat_report_evidence(report_id);

-- 6. Table: public.admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('chat_report', 'user')),
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

-- 7. Row Level Security (RLS)
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_report_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.chat_reports TO authenticated;
GRANT ALL ON TABLE public.chat_report_evidence TO authenticated;
GRANT ALL ON TABLE public.admin_audit_logs TO authenticated;

DROP POLICY IF EXISTS "Users can insert own reports" ON public.chat_reports;
CREATE POLICY "Users can insert own reports"
  ON public.chat_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_user_id);

DROP POLICY IF EXISTS "Admins can view all reports" ON public.chat_reports;
CREATE POLICY "Admins can view all reports"
  ON public.chat_reports FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.chat_reports;
CREATE POLICY "Admins can update reports"
  ON public.chat_reports FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reports" ON public.chat_reports;
CREATE POLICY "Admins can delete reports"
  ON public.chat_reports FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view report evidence" ON public.chat_report_evidence;
CREATE POLICY "Admins can view report evidence"
  ON public.chat_report_evidence FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Reporters can insert report evidence" ON public.chat_report_evidence;
CREATE POLICY "Reporters can insert report evidence"
  ON public.chat_report_evidence FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_reports r WHERE r.id = chat_report_evidence.report_id AND r.reporter_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_admin());

-- 8. Enable Realtime Publication for chat_reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 9. Ban Checks on Messaging & Requests
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_banned = true)
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Senders can create connection requests" ON public.community_connections;
CREATE POLICY "Senders can create connection requests"
  ON public.community_connections FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND sender_id <> receiver_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_banned = true)
  );

-- 10. RPC Procedures
CREATE OR REPLACE FUNCTION public.admin_moderate_report(
  p_report_id uuid,
  p_new_status text,
  p_admin_notes text DEFAULT '',
  p_action_type text DEFAULT 'none'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_target_user_id uuid;
  v_current_status text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Caller is not an administrator.';
  END IF;

  IF p_new_status NOT IN ('pending', 'investigating', 'action_taken', 'dismissed') THEN
    RAISE EXCEPTION 'Bad Request: Invalid report status.';
  END IF;

  SELECT reported_user_id, status INTO v_target_user_id, v_current_status
  FROM public.chat_reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not Found: Report not found.';
  END IF;

  UPDATE public.chat_reports
  SET
    status = p_new_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    action_type = p_action_type,
    resolved_by = v_caller_id,
    resolved_at = CASE WHEN p_new_status IN ('action_taken', 'dismissed') THEN timezone('utc'::text, now()) ELSE resolved_at END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_report_id;

  INSERT INTO public.admin_audit_logs (
    admin_id, action, target_type, target_id, details, reason
  ) VALUES (
    v_caller_id, 'report_status_updated', 'chat_report', p_report_id,
    jsonb_build_object('previous_status', v_current_status, 'new_status', p_new_status, 'action_type', p_action_type, 'reported_user_id', v_target_user_id),
    COALESCE(p_admin_notes, '')
  );

  RETURN json_build_object('success', true, 'report_id', p_report_id, 'new_status', p_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moderate_report TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_ban_status(
  p_target_user_id uuid,
  p_is_banned boolean,
  p_ban_reason text DEFAULT '',
  p_report_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_target_role text;
  v_action_name text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Caller is not an administrator.';
  END IF;

  IF p_target_user_id = v_caller_id AND p_is_banned IS TRUE THEN
    RAISE EXCEPTION 'Forbidden: You cannot ban your active administrator account.';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;
  IF v_target_role = 'admin' AND p_is_banned IS TRUE THEN
    RAISE EXCEPTION 'Forbidden: Administrators cannot be banned. Demote role first if necessary.';
  END IF;

  UPDATE public.profiles
  SET
    is_banned = p_is_banned,
    banned_at = CASE WHEN p_is_banned THEN timezone('utc'::text, now()) ELSE NULL END,
    ban_reason = CASE WHEN p_is_banned THEN COALESCE(p_ban_reason, 'Violating community guidelines') ELSE NULL END,
    banned_by = CASE WHEN p_is_banned THEN v_caller_id ELSE NULL END
  WHERE id = p_target_user_id;

  v_action_name := CASE WHEN p_is_banned THEN 'user_banned' ELSE 'user_unbanned' END;

  INSERT INTO public.admin_audit_logs (
    admin_id, action, target_type, target_id, details, reason
  ) VALUES (
    v_caller_id, v_action_name, 'user', p_target_user_id,
    jsonb_build_object('is_banned', p_is_banned, 'associated_report_id', p_report_id),
    COALESCE(p_ban_reason, '')
  );

  IF p_report_id IS NOT NULL AND p_is_banned IS TRUE THEN
    UPDATE public.chat_reports
    SET
      status = 'action_taken',
      action_type = 'user_banned',
      resolved_by = v_caller_id,
      resolved_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE id = p_report_id;
  END IF;

  RETURN json_build_object('success', true, 'user_id', p_target_user_id, 'is_banned', p_is_banned);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_ban_status TO authenticated;
`;

