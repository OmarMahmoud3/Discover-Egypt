-- Discover Egypt: Supabase Schema & Security Hardening
-- Profiles table, trigger, and Row Level Security (RLS) policies

-- 1. Create profiles table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  preferred_language text DEFAULT 'ar',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Auto-create profile trigger on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, preferred_language, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'ar'),
    'user' -- New users always default to normal user
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security Policies for public.profiles

-- Policy A: Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy B: Verified administrators can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy C: Users can update their own profile fields EXCEPT role
-- (role must match existing database role to prevent client-side privilege escalation)
DROP POLICY IF EXISTS "Users can update own profile non-role fields" ON public.profiles;
CREATE POLICY "Users can update own profile non-role fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Policy D: Administrators can update and manage any profile (including role promotion/demotion)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy E: Service role has full access (used by Edge Functions)
-- Note: In Supabase, service_role bypasses RLS automatically, but policy explicitly documented.

-- 4. Atomic Role Update Function (Protected Invariants)
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS json AS $$
DECLARE
  caller_id uuid;
  caller_role text;
  target_current_role text;
  admin_count integer;
BEGIN
  caller_id := auth.uid();

  -- Verify caller is authenticated
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
  END IF;

  -- Verify caller is an administrator
  SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;
  IF caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Forbidden: Caller is not an administrator';
  END IF;

  -- Validate target role
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Bad Request: Role must be either admin or user';
  END IF;

  -- Prevent self-demotion
  IF target_user_id = caller_id AND new_role <> 'admin' THEN
    RAISE EXCEPTION 'Forbidden: You cannot alter or revoke permissions for your active admin account';
  END IF;

  -- Check target user's current role
  SELECT role INTO target_current_role FROM public.profiles WHERE id = target_user_id;
  IF target_current_role IS NULL THEN
    RAISE EXCEPTION 'Not Found: Target user profile not found';
  END IF;

  -- Prevent demoting the last remaining administrator
  IF target_current_role = 'admin' AND new_role = 'user' THEN
    SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Forbidden: Cannot demote the last remaining administrator in the system';
    END IF;
  END IF;

  -- Perform role update
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_role', new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
