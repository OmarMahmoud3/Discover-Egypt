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
  let requests = [];

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
  let requests = [];

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
  let conversations = [];

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

  let list = [];
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
 * Permanently deletes the currently authenticated user's account and associated data.
 * Calls Supabase RPC `delete_own_user()`, cleans up user-scoped local storage,
 * and signs the user out of all sessions.
 */
export async function deleteCurrentUserAccount() {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user?.id) {
    throw new Error('Not authenticated: You must be logged in to delete your account.');
  }

  const userId = authData.user.id;

  // 1. Call atomic database RPC function in Supabase
  let dbDeleted = false;
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('delete_own_user');
    if (rpcError) {
      // Check if it's the system protection error (cannot delete sole admin)
      if (rpcError.message?.includes('System Protection') || rpcError.message?.includes('administrator')) {
        throw new Error(rpcError.message);
      }
      console.warn('RPC delete_own_user notice:', rpcError.message);
      // Fallback: If RPC not yet installed in remote schema cache, try deleting from public tables
      try {
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.from('community_connections').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        await supabase.from('conversations').delete().or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);
        await supabase.from('messages').delete().eq('sender_id', userId);
      } catch (tableErr) {
        console.warn('Direct table cleanup notice:', tableErr);
      }
    } else {
      dbDeleted = true;
    }
  } catch (err) {
    if (err.message?.includes('System Protection') || err.message?.includes('administrator')) {
      throw err;
    }
    console.warn('Database deletion exception:', err);
  }

  // 2. Clear all user-scoped storage items
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`discover_egypt_favorites_${userId}`);
      localStorage.removeItem('discover_egypt_test_session');

      // Purge from local offline storage fallbacks
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
    console.warn('Storage purge error:', storageErr);
  }

  // 3. Completely terminate active authentication session
  try {
    await supabase.auth.signOut();
  } catch (signOutErr) {
    console.warn('SignOut error on deletion:', signOutErr);
  }

  return { success: true, userId, dbDeleted };
}
