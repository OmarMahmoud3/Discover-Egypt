-- ==============================================================================
-- DISCOVER EGYPT — Chat Moderation, User Reporting & Ban Enforcement Schema
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
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: Trusted Server-Side Admin Check
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
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

  -- A. Check Supabase Auth app_metadata (strictly controlled by server/admin)
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  -- B. Check user_metadata role if provisioned
  IF COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  -- C. Check verified JWT email against designated administrator accounts
  caller_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF caller_email IN ('om7765355@gmail.com', 'omarmahmoud3@gmail.com') THEN
    RETURN true;
  END IF;

  -- D. Check public.profiles role = 'admin' safely bypassing RLS via SECURITY DEFINER
  SELECT (role = 'admin') INTO is_admin_flag
  FROM public.profiles
  WHERE id = caller_id;

  RETURN COALESCE(is_admin_flag, false);
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Extend public.profiles with Ban Attributes
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- ------------------------------------------------------------------------------
-- 3. Provision Designated Admin Accounts in public.profiles
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE LOWER(email) IN ('om7765355@gmail.com', 'omarmahmoud3@gmail.com')
);

-- ------------------------------------------------------------------------------
-- 4. Table: public.chat_reports
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. Table: public.chat_report_evidence
-- Stores an immutable, frozen snapshot of flagged messages at the moment of report
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. Table: public.admin_audit_logs
-- Tamper-evident ledger of all moderation actions
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_report_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.chat_reports TO authenticated;
GRANT ALL ON TABLE public.chat_report_evidence TO authenticated;
GRANT ALL ON TABLE public.admin_audit_logs TO authenticated;

-- A. Policies for public.chat_reports
-- Users can only insert their own reports
DROP POLICY IF EXISTS "Users can insert own reports" ON public.chat_reports;
CREATE POLICY "Users can insert own reports"
  ON public.chat_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id 
    AND reporter_id <> reported_user_id
  );

-- Only verified administrators can view reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.chat_reports;
CREATE POLICY "Admins can view all reports"
  ON public.chat_reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- Only verified administrators can update reports (change status, add notes)
DROP POLICY IF EXISTS "Admins can update reports" ON public.chat_reports;
CREATE POLICY "Admins can update reports"
  ON public.chat_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- Only verified administrators can delete reports
DROP POLICY IF EXISTS "Admins can delete reports" ON public.chat_reports;
CREATE POLICY "Admins can delete reports"
  ON public.chat_reports
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- B. Policies for public.chat_report_evidence
-- Only administrators can read evidence
DROP POLICY IF EXISTS "Admins can view report evidence" ON public.chat_report_evidence;
CREATE POLICY "Admins can view report evidence"
  ON public.chat_report_evidence
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- Reporters can insert evidence during report creation
DROP POLICY IF EXISTS "Reporters can insert report evidence" ON public.chat_report_evidence;
CREATE POLICY "Reporters can insert report evidence"
  ON public.chat_report_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_reports r
      WHERE r.id = chat_report_evidence.report_id
        AND r.reporter_id = auth.uid()
    )
  );

-- C. Policies for public.admin_audit_logs
-- Only administrators can read or insert audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- D. Additional Administrator Read Access on Linked Tables (to prevent join failures)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 8. Enable Supabase Realtime Publication for public.chat_reports
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 9. Enforce Ban Restrictions on Messages and Connection Requests
-- ------------------------------------------------------------------------------
-- Update message insertion policy to reject banned users
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
CREATE POLICY "Conversation participants can send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_banned = true
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- Update community connection insertion to reject banned users
DROP POLICY IF EXISTS "Senders can create connection requests" ON public.community_connections;
CREATE POLICY "Senders can create connection requests"
  ON public.community_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND sender_id <> receiver_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_banned = true
    )
  );

-- ------------------------------------------------------------------------------
-- 10. SECURITY DEFINER RPC Functions
-- ------------------------------------------------------------------------------

-- A. Submit Chat Report and Freeze Evidence Server-Side
CREATE OR REPLACE FUNCTION public.submit_chat_report(
  p_reported_user_id uuid,
  p_conversation_id uuid,
  p_reason text,
  p_details text DEFAULT '',
  p_message_ids uuid[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_report_id uuid;
  v_conv_valid boolean;
  v_msg_count integer := 0;
  v_pending_count integer;
  v_msg_rec RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated.';
  END IF;

  -- 1. Prevent self-reporting
  IF v_caller_id = p_reported_user_id THEN
    RAISE EXCEPTION 'Bad Request: You cannot report yourself.';
  END IF;

  -- 2. Validate reason
  IF p_reason NOT IN ('harassment', 'hate_speech', 'spam_scam', 'inappropriate_content', 'violence_threat', 'other') THEN
    RAISE EXCEPTION 'Bad Request: Invalid report reason.';
  END IF;

  -- 3. Verify conversation existence and caller participation
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND (
        (participant1_id = v_caller_id AND participant2_id = p_reported_user_id)
        OR
        (participant2_id = v_caller_id AND participant1_id = p_reported_user_id)
      )
  ) INTO v_conv_valid;

  IF NOT v_conv_valid THEN
    RAISE EXCEPTION 'Forbidden: Conversation not found or participants do not match.';
  END IF;

  -- 4. Rate-limiting check: maximum 3 pending reports by the same reporter against the same user
  SELECT count(*) INTO v_pending_count
  FROM public.chat_reports
  WHERE reporter_id = v_caller_id
    AND reported_user_id = p_reported_user_id
    AND status IN ('pending', 'investigating');

  IF v_pending_count >= 3 THEN
    RAISE EXCEPTION 'Rate Limit: You already have an open report under review for this user.';
  END IF;

  -- 5. Insert report record
  INSERT INTO public.chat_reports (
    reporter_id,
    reported_user_id,
    conversation_id,
    reason,
    details,
    status
  ) VALUES (
    v_caller_id,
    p_reported_user_id,
    p_conversation_id,
    p_reason,
    COALESCE(p_details, ''),
    'pending'
  ) RETURNING id INTO v_report_id;

  -- 6. Freeze evidence from actual database records (tamper-proof snapshot)
  IF p_message_ids IS NOT NULL AND array_length(p_message_ids, 1) > 0 THEN
    FOR v_msg_rec IN
      SELECT id, sender_id, content, created_at
      FROM public.messages
      WHERE conversation_id = p_conversation_id
        AND id = ANY(p_message_ids)
      ORDER BY created_at ASC
    LOOP
      INSERT INTO public.chat_report_evidence (
        report_id,
        message_id,
        sender_id,
        message_timestamp,
        message_content
      ) VALUES (
        v_report_id,
        v_msg_rec.id,
        v_msg_rec.sender_id,
        v_msg_rec.created_at,
        v_msg_rec.content
      );
      v_msg_count := v_msg_count + 1;
    END LOOP;
  END IF;

  -- 7. Return safe, sanitized confirmation
  RETURN json_build_object(
    'success', true,
    'report_id', v_report_id,
    'evidence_count', v_msg_count,
    'message', 'Report received and queued for administrative review.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_chat_report FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_chat_report FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_chat_report TO authenticated;


-- B. Admin Moderate Report (Status update & internal notes with audit log)
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

  -- Verify caller is an administrator via server-side trusted is_admin()
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Caller is not an administrator.';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('pending', 'investigating', 'action_taken', 'dismissed') THEN
    RAISE EXCEPTION 'Bad Request: Invalid report status.';
  END IF;

  -- Check report existence
  SELECT reported_user_id, status INTO v_target_user_id, v_current_status
  FROM public.chat_reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not Found: Report not found.';
  END IF;

  -- Update report
  UPDATE public.chat_reports
  SET
    status = p_new_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    action_type = p_action_type,
    resolved_by = v_caller_id,
    resolved_at = CASE WHEN p_new_status IN ('action_taken', 'dismissed') THEN timezone('utc'::text, now()) ELSE resolved_at END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_report_id;

  -- Insert audit log
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    reason
  ) VALUES (
    v_caller_id,
    'report_status_updated',
    'chat_report',
    p_report_id,
    jsonb_build_object(
      'previous_status', v_current_status,
      'new_status', p_new_status,
      'action_type', p_action_type,
      'reported_user_id', v_target_user_id
    ),
    COALESCE(p_admin_notes, '')
  );

  RETURN json_build_object(
    'success', true,
    'report_id', p_report_id,
    'new_status', p_new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_report FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_moderate_report FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_report TO authenticated;


-- C. Admin Set User Ban Status (Ban or unban user with audit log)
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

  -- Verify caller is an administrator via server-side trusted is_admin()
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Caller is not an administrator.';
  END IF;

  -- Prevent self-ban
  IF p_target_user_id = v_caller_id AND p_is_banned IS TRUE THEN
    RAISE EXCEPTION 'Forbidden: You cannot ban your active administrator account.';
  END IF;

  -- Prevent banning another administrator
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;
  IF v_target_role = 'admin' AND p_is_banned IS TRUE THEN
    RAISE EXCEPTION 'Forbidden: Administrators cannot be banned. Demote role first if necessary.';
  END IF;

  -- Update target profile
  UPDATE public.profiles
  SET
    is_banned = p_is_banned,
    banned_at = CASE WHEN p_is_banned THEN timezone('utc'::text, now()) ELSE NULL END,
    ban_reason = CASE WHEN p_is_banned THEN COALESCE(p_ban_reason, 'Violating community guidelines') ELSE NULL END,
    banned_by = CASE WHEN p_is_banned THEN v_caller_id ELSE NULL END
  WHERE id = p_target_user_id;

  v_action_name := CASE WHEN p_is_banned THEN 'user_banned' ELSE 'user_unbanned' END;

  -- Insert audit log
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    reason
  ) VALUES (
    v_caller_id,
    v_action_name,
    'user',
    p_target_user_id,
    jsonb_build_object(
      'is_banned', p_is_banned,
      'associated_report_id', p_report_id
    ),
    COALESCE(p_ban_reason, '')
  );

  -- If linked to a report and banning user, optionally auto-update report status
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

  RETURN json_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'is_banned', p_is_banned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_ban_status FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_ban_status FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_ban_status TO authenticated;
