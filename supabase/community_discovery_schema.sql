-- ==============================================================================
-- DISCOVER EGYPT — Community Discovery & Safe Connect Schema
-- Extends public.profiles with interests, privacy toggles, and safe connection requests
-- ==============================================================================

-- 1. Extend public.profiles table with community discovery and privacy attributes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_preference text DEFAULT 'in_app';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_handle text DEFAULT '';

-- 2. Create community connections table for safe, privacy-conscious communication
CREATE TABLE IF NOT EXISTS public.community_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  shared_interests text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.community_connections ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON TABLE public.community_connections TO authenticated;

-- 3. Row Level Security Policies for public.community_connections
DROP POLICY IF EXISTS "Users can insert connection requests" ON public.community_connections;
CREATE POLICY "Users can insert connection requests"
  ON public.community_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view own sent or received connection requests" ON public.community_connections;
CREATE POLICY "Users can view own sent or received connection requests"
  ON public.community_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can update received connection requests" ON public.community_connections;
CREATE POLICY "Users can update received connection requests"
  ON public.community_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 4. Update Row Level Security Policies on public.profiles to permit community discovery
-- Public profiles (where is_public = true or unset) can be viewed by all visitors and users,
-- while private profiles can always be viewed by their owners.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public discovery profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public discovery profiles are viewable by all" ON public.profiles;

CREATE POLICY "Public discovery profiles are viewable by all"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_public, true) = true
    OR auth.uid() = id
  );

-- Ensure table permissions for both anonymous and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON TABLE public.community_connections TO authenticated;


