// @ts-nocheck
// Supabase Edge Function: admin-list-users
// Secure administrative user management: retrieves authentic Supabase Auth users
// joined with public.profiles without exposing service-role secrets to the client.

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
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract Authorization header & validate caller
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
      // Fallback: verify with anon client if provided
      let fallbackUser = null;
      if (supabaseAnonKey) {
        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });
        const { data: fbData } = await callerClient.auth.getUser();
        fallbackUser = fbData?.user || null;
      }

      if (!fallbackUser) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid access token.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const currentUserId = callerUser?.id;

    // 3. Verify caller's authoritative role in public.profiles
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .maybeSingle();

    if (profileErr || callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only administrators can access user management operations.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse request payload
    let payload: any = {};
    if (req.method === 'POST') {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }

    const action = payload.action || 'list_users';

    // 5. Operation: list_users
    if (action === 'list_users') {
      const page = Math.max(1, parseInt(payload.page || '1', 10));
      const perPage = Math.min(100, Math.max(1, parseInt(payload.perPage || '10', 10)));
      const search = (payload.search || '').trim().toLowerCase();
      const roleFilter = payload.roleFilter || 'all';

      // Retrieve registered accounts directly from Supabase Auth
      const { data: authData, error: listAuthErr } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listAuthErr) {
        return new Response(
          JSON.stringify({ error: `Failed to retrieve Auth users: ${listAuthErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authUsers = authData?.users || [];

      // Retrieve all profiles from public.profiles
      const { data: profiles, error: listProfilesErr } = await adminClient
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_language, role, created_at');

      if (listProfilesErr) {
        return new Response(
          JSON.stringify({ error: `Failed to retrieve profiles: ${listProfilesErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Join Auth users with public.profiles strictly without inventing data
      let mergedUsers = authUsers.map((u: any) => {
        const p: any = profileMap.get(u.id);
        const isConfirmed = Boolean(u.email_confirmed_at || u.confirmed_at);

        return {
          id: u.id,
          email: u.email || '',
          created_at: u.created_at,
          confirmed_at: u.email_confirmed_at || u.confirmed_at || null,
          is_confirmed: isConfirmed,
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
          preferred_language: p?.preferred_language || null,
          role: p?.role || null, // null if no profile or role exists
          has_profile: Boolean(p),
          last_sign_in_at: u.last_sign_in_at || null,
        };
      });

      // Role filtering: 'all', 'admin', 'user', or 'unassigned' (missing role/profile)
      if (roleFilter === 'admin') {
        mergedUsers = mergedUsers.filter((u: any) => u.role === 'admin');
      } else if (roleFilter === 'user') {
        mergedUsers = mergedUsers.filter((u: any) => u.role === 'user');
      } else if (roleFilter === 'unassigned') {
        mergedUsers = mergedUsers.filter((u: any) => !u.role);
      }

      // Honest search across whole dataset
      if (search) {
        mergedUsers = mergedUsers.filter((u: any) => {
          const nameMatch = (u.display_name || '').toLowerCase().includes(search);
          const emailMatch = (u.email || '').toLowerCase().includes(search);
          const idMatch = (u.id || '').toLowerCase().includes(search);
          return nameMatch || emailMatch || idMatch;
        });
      }

      // Sort newest registration date first
      mergedUsers.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const total = mergedUsers.length;
      const totalPages = Math.ceil(total / perPage) || 1;
      const startIndex = (page - 1) * perPage;
      const paginatedUsers = mergedUsers.slice(startIndex, startIndex + perPage);

      return new Response(
        JSON.stringify({
          users: paginatedUsers,
          total,
          page,
          perPage,
          totalPages,
          totalAuthUsers: authUsers.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Operation: update_user_role
    if (action === 'update_user_role') {
      const { targetUserId, newRole } = payload;

      if (!targetUserId || typeof targetUserId !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Bad Request: targetUserId is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newRole !== 'admin' && newRole !== 'user') {
        return new Response(
          JSON.stringify({ error: 'Bad Request: role must be either "admin" or "user".' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Invariant 1: Prevent self-demotion
      if (targetUserId === currentUserId && newRole !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'You cannot alter or revoke permissions for your active administrator account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Invariant 2: Check target's current role
      const { data: targetProfile, error: targetErr } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('id', targetUserId)
        .maybeSingle();

      if (targetErr) {
        return new Response(
          JSON.stringify({ error: `Database error: ${targetErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Invariant 3: Prevent demoting the last remaining administrator
      if (newRole === 'user' && targetProfile?.role === 'admin') {
        const { count: adminCount, error: countErr } = await adminClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (countErr) {
          return new Response(
            JSON.stringify({ error: `Failed to check admin count: ${countErr.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if ((adminCount ?? 0) <= 1) {
          return new Response(
            JSON.stringify({ error: 'Cannot demote the last remaining administrator in the system.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update or insert profile cleanly using upsert
      const { data: authTarget } = await adminClient.auth.admin.getUserById(targetUserId);
      const name = authTarget?.user?.user_metadata?.full_name || authTarget?.user?.user_metadata?.name || null;

      const { error: upsertErr } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: targetUserId,
            display_name: targetProfile?.display_name || name,
            role: newRole,
            preferred_language: targetProfile?.preferred_language || 'ar',
          },
          { onConflict: 'id' }
        );

      if (upsertErr) {
        return new Response(
          JSON.stringify({ error: `Failed to update profile role: ${upsertErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Synchronize role into Auth user metadata
      try {
        await adminClient.auth.admin.updateUserById(targetUserId, {
          app_metadata: { role: newRole },
          user_metadata: { role: newRole },
        });
      } catch (authMetaErr: any) {
        console.warn('Could not update Auth metadata:', authMetaErr?.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: targetUserId,
            role: newRole,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: "${action}". Supported actions: list_users, update_user_role.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error occurred.' }),
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
