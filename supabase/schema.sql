-- Discover Egypt: Supabase Schema & Security Hardening
-- Profiles table, trigger, permissions, and atomic role management

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

-- Grant schema and table permissions so queries never fail with "permission denied"
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;

-- 2. Auto-create profile trigger on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

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

-- 4. Atomic Role Update Function (SECURITY DEFINER to safely bypass RLS)
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  caller_id uuid;
  caller_role text;
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

  -- Prevent demoting the last remaining administrator
  IF new_role = 'user' THEN
    SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count <= 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'admin') THEN
      RAISE EXCEPTION 'Forbidden: Cannot demote the last remaining administrator in the system';
    END IF;
  END IF;

  -- Perform role update or insert (upsert)
  INSERT INTO public.profiles (id, role, preferred_language)
  VALUES (target_user_id, new_role, 'ar')
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_role', new_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role TO authenticated;

-- 5. Sync any existing registered auth users into public.profiles
INSERT INTO public.profiles (id, display_name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Ensure primary admin account keeps admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('om7765355@gmail.com', 'omarmahmoud3@gmail.com')
);
