// @ts-nocheck
// Supabase Edge Function: delete-user
// Secure Server-Side Account Deletion using Supabase Admin API with Service Role Key.
// Strictly verifies caller identity via JWT, deletes caller's own auth.users record,
// and purges all associated relational data according to the platform privacy policy.
// The SUPABASE_SERVICE_ROLE_KEY is kept securely on the server and NEVER exposed to the frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const handler = async (req: Request): Promise<Response> => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[delete-user] Server configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase service environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract Authorization header & authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Initialize privileged admin client with service_role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Authenticate caller identity using service-role verified JWT token
    const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !callerUser) {
      console.warn('[delete-user] Token authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired access token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = callerUser.id;

    // 3. Parse payload (if any) and enforce identity constraints
    let payload: any = {};
    if (req.method === 'POST') {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }

    // Check caller's role to determine if they can delete others
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    const isCallerAdmin = callerProfile?.role === 'admin';

    // Standard users are strictly restricted to deleting ONLY their own user ID
    let targetUserId = callerId;
    if (payload.targetUserId && typeof payload.targetUserId === 'string' && payload.targetUserId !== callerId) {
      if (!isCallerAdmin) {
        console.warn(`[delete-user] Forbidden attempt by user ${callerId} to delete user ${payload.targetUserId}`);
        return new Response(
          JSON.stringify({ error: 'Forbidden: You cannot delete another user account.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = payload.targetUserId;
    }

    console.log(`[delete-user] Initiating deletion for user: ${targetUserId} (Initiated by: ${callerId})`);

    // 4. System safeguard: Prevent deleting the last remaining administrator
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetProfile?.role === 'admin') {
      const { count: adminCount, error: countErr } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (!countErr && (adminCount ?? 0) <= 1) {
        console.warn(`[delete-user] Blocked attempt to delete sole remaining administrator: ${targetUserId}`);
        return new Response(
          JSON.stringify({ error: 'System Protection: Cannot delete the only remaining administrator account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Explicit Relational Cleanup in foreign-key dependency order
    // A. Favorites
    try {
      const { error: favErr } = await adminClient
        .from('favorites')
        .delete()
        .eq('user_id', targetUserId);
      if (favErr && favErr.code !== 'PGRST205') {
        console.warn('[delete-user] Favorites purge notice:', favErr.message);
      }
    } catch (e) {
      console.warn('[delete-user] Favorites purge warning:', e);
    }

    // B. Direct messages sent by the target user
    try {
      const { error: msgErr } = await adminClient
        .from('messages')
        .delete()
        .eq('sender_id', targetUserId);
      if (msgErr && msgErr.code !== 'PGRST205') {
        console.warn('[delete-user] Messages purge notice:', msgErr.message);
      }
    } catch (e) {
      console.warn('[delete-user] Messages purge warning:', e);
    }

    // C. Conversations where target user is a participant
    try {
      const { error: convErr } = await adminClient
        .from('conversations')
        .delete()
        .or(`participant1_id.eq.${targetUserId},participant2_id.eq.${targetUserId}`);
      if (convErr && convErr.code !== 'PGRST205') {
        console.warn('[delete-user] Conversations purge notice:', convErr.message);
      }
    } catch (e) {
      console.warn('[delete-user] Conversations purge warning:', e);
    }

    // D. Connection requests sent or received
    try {
      const { error: connErr } = await adminClient
        .from('community_connections')
        .delete()
        .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);
      if (connErr && connErr.code !== 'PGRST205') {
        console.warn('[delete-user] Connections purge notice:', connErr.message);
      }
    } catch (e) {
      console.warn('[delete-user] Connections purge warning:', e);
    }

    // E. Public profile record
    try {
      const { error: profErr } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', targetUserId);
      if (profErr) {
        console.warn('[delete-user] Profile purge notice:', profErr.message);
      }
    } catch (e) {
      console.warn('[delete-user] Profile purge warning:', e);
    }

    // 6. Delete Authentication User from Supabase Auth via Admin API
    const { data: deleteAuthData, error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteAuthErr) {
      console.error(`[delete-user] Supabase Admin API deleteUser error for ${targetUserId}:`, deleteAuthErr.message);
      return new Response(
        JSON.stringify({
          error: `Failed to delete user authentication record: ${deleteAuthErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-user] Successfully purged user and Auth record for: ${targetUserId}`);

    // 7. Successful Response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'User account and all associated data permanently deleted from Supabase Auth and database.',
        userId: targetUserId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[delete-user] Unhandled exception during deletion:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error during account deletion.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// Start server using native Deno.serve with backwards compatible fallback
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler);
} else {
  const { serve } = await import('https://deno.land/std@0.168.0/http/server.ts');
  serve(handler);
}
