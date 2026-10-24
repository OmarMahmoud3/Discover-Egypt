-- ==============================================================================
-- DISCOVER EGYPT — Community Connection Requests & Realtime Messaging Schema
-- Enables safe, consent-based communication with Row Level Security (RLS)
-- and instant Supabase Realtime broadcast capabilities.
-- ==============================================================================

-- 1. Table: public.community_connections
-- Stores safe connection requests between two registered explorers
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

-- Partial index to prevent duplicate pending requests between the same users
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_connection_idx 
  ON public.community_connections (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';

-- Enable Row Level Security (RLS)
ALTER TABLE public.community_connections ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.community_connections TO authenticated;

-- RLS Policies for public.community_connections:
-- A. SELECT: Only the sender or the receiver can view the connection request
DROP POLICY IF EXISTS "Participants can view their connection requests" ON public.community_connections;
CREATE POLICY "Participants can view their connection requests"
  ON public.community_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- B. INSERT: Only authenticated sender can create request
DROP POLICY IF EXISTS "Senders can create connection requests" ON public.community_connections;
CREATE POLICY "Senders can create connection requests"
  ON public.community_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> receiver_id);

-- C. UPDATE: Receiver can accept/reject; Sender can cancel pending request
DROP POLICY IF EXISTS "Receiver can accept or reject, sender can cancel" ON public.community_connections;
CREATE POLICY "Receiver can accept or reject, sender can cancel"
  ON public.community_connections
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = receiver_id 
    OR (auth.uid() = sender_id AND status = 'pending')
  )
  WITH CHECK (
    auth.uid() = receiver_id 
    OR (auth.uid() = sender_id AND status = 'cancelled')
  );


-- 2. Table: public.conversations
-- Created when a connection request is accepted between two explorers
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

-- RLS Policies for public.conversations:
-- Only participants can view or update their conversations
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

DROP POLICY IF EXISTS "Participants can insert conversations" ON public.conversations;
CREATE POLICY "Participants can insert conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;
CREATE POLICY "Participants can update their conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);


-- 3. Table: public.messages
-- Stores individual chat messages exchanged between participants
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

-- RLS Policies for public.messages:
-- Only participants in the parent conversation can view messages
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
CREATE POLICY "Conversation participants can view messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- Only authenticated sender who is also a participant in the conversation can insert messages
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
CREATE POLICY "Conversation participants can send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- Conversation participants can update message read status
DROP POLICY IF EXISTS "Conversation participants can mark messages as read" ON public.messages;
CREATE POLICY "Conversation participants can mark messages as read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );



-- 3.1 Rate Limiting Trigger on Messages (prevents automated flooding / DoS)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  recent_msg_count integer;
BEGIN
  -- Prevent automated flooding: max 15 messages per 10 seconds per sender
  SELECT count(*) INTO recent_msg_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at >= (timezone('utc'::text, now()) - interval '10 seconds');

  IF recent_msg_count >= 15 THEN
    RAISE EXCEPTION 'Rate limit exceeded: You are sending messages too quickly. Please wait a few seconds.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_message_rate_limit ON public.messages;
CREATE TRIGGER trigger_check_message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();

-- 4. Enable Supabase Realtime Publication for instant delivery
-- This broadcasts INSERT and UPDATE events to authenticated subscribers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_connections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_connections;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Enable REPLICA IDENTITY FULL for complete payloads on updates
ALTER TABLE public.community_connections REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
