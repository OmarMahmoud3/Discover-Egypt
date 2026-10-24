-- ==============================================================================
-- DISCOVER EGYPT — Permanent User Account Deletion & Data Eradication RPC
-- Atomically purges user profile, favorites, personal communications (messages,
-- conversations, connections), and permanently deletes the auth.users record.
-- Strictly secured to caller identity via auth.uid().
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_own_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_id uuid;
  other_admins_count integer;
  is_caller_admin boolean;
BEGIN
  -- 1. Strictly verify caller identity from verified Supabase JWT
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated to delete their account.';
  END IF;

  -- 2. System safeguard: Prevent deleting the last remaining administrator
  SELECT (role = 'admin') INTO is_caller_admin
  FROM public.profiles
  WHERE id = current_user_id;

  IF is_caller_admin IS TRUE THEN
    SELECT count(*) INTO other_admins_count
    FROM public.profiles
    WHERE role = 'admin' AND id <> current_user_id;

    IF other_admins_count < 1 THEN
      RAISE EXCEPTION 'System Protection: Cannot delete the only remaining administrator account.';
    END IF;
  END IF;

  -- 3. Explicit Relational Cleanup in strict foreign-key order
  -- A. Saved favorites & itineraries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorites') THEN
    DELETE FROM public.favorites WHERE user_id = current_user_id;
  END IF;

  -- B. Direct messages sent by this user
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    DELETE FROM public.messages WHERE sender_id = current_user_id;
  END IF;

  -- C. Conversations where user is a participant (also cascades remaining messages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    DELETE FROM public.conversations 
    WHERE participant1_id = current_user_id OR participant2_id = current_user_id;
  END IF;

  -- D. Community connections sent or received
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_connections') THEN
    DELETE FROM public.community_connections 
    WHERE sender_id = current_user_id OR receiver_id = current_user_id;
  END IF;

  -- E. Public explorer profile record
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- F. Permanent authentication record from auth.users (invalidates all sessions and tokens)
  DELETE FROM auth.users WHERE id = current_user_id;

  -- 4. Return successful audit confirmation
  RETURN json_build_object(
    'success', true,
    'message', 'User account and all associated data permanently deleted.',
    'user_id', current_user_id
  );
END;
$$;

-- Security Hardening: Revoke default public execution, permit authenticated users only
REVOKE ALL ON FUNCTION public.delete_own_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_own_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_own_user() TO authenticated;
