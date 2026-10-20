import fs from 'fs';
import { PLACES_DATA } from '../src/data/placesData.js';

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function sqlArrayEscape(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 'ARRAY[]::text[]';
  const escapedItems = arr
    .map((item) => {
      const url = typeof item === 'string' ? item : item?.url || '';
      return url.replace(/'/g, "''");
    })
    .filter(Boolean)
    .map((url) => "'" + url + "'");
  if (escapedItems.length === 0) return 'ARRAY[]::text[]';
  return 'ARRAY[' + escapedItems.join(', ') + ']::text[]';
}

let sql = `-- Discover Egypt: Complete Seed for 94 Places into Supabase
-- Run this script in your Supabase SQL Editor to populate public.places

-- 1. Ensure public.places table exists with UUID primary key
CREATE TABLE IF NOT EXISTS public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  city text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  image_url text,
  gallery text[],
  latitude double precision,
  longitude double precision,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'places_slug_key'
  ) THEN
    ALTER TABLE public.places ADD CONSTRAINT places_slug_key UNIQUE (slug);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.places TO anon, authenticated, service_role;

-- Policy: Everyone can view published places
DROP POLICY IF EXISTS "Public read published places" ON public.places;
CREATE POLICY "Public read published places" ON public.places
  FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Policy: Administrators have full CRUD on places
DROP POLICY IF EXISTS "Admins manage places" ON public.places;
CREATE POLICY "Admins manage places" ON public.places
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. Insert or update all 94 destination places
INSERT INTO public.places (
  name,
  name_en,
  slug,
  city,
  category,
  description,
  image_url,
  gallery,
  latitude,
  longitude,
  is_published
)
VALUES
`;

const valueRows = PLACES_DATA.map((p) => {
  const slug = p.slug || p.id;
  const name = p.name;
  const nameEn = p.nameEn || p.name;
  const city = p.city || 'مصر';
  const category = p.category || 'معلم سياحي';
  const description = p.historicalText || p.historicalTextEn || p.description || p.name;
  const imageUrl = p.image || null;
  const gallery = p.gallery && p.gallery.length > 0 ? p.gallery : imageUrl ? [imageUrl] : [];
  const lat = typeof p.latitude === 'number' && !isNaN(p.latitude) ? p.latitude : null;
  const lng = typeof p.longitude === 'number' && !isNaN(p.longitude) ? p.longitude : null;

  return (
    '(\n  ' +
    [
      sqlEscape(name),
      sqlEscape(nameEn),
      sqlEscape(slug),
      sqlEscape(city),
      sqlEscape(category),
      sqlEscape(description),
      sqlEscape(imageUrl),
      sqlArrayEscape(gallery),
      sqlEscape(lat),
      sqlEscape(lng),
      'true',
    ].join(',\n  ') +
    '\n)'
  );
});

sql +=
  valueRows.join(',\n') +
  `
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  city = EXCLUDED.city,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  gallery = EXCLUDED.gallery,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  is_published = EXCLUDED.is_published;
`;

fs.writeFileSync('./supabase/seed_places.sql', sql, 'utf8');
console.log(`Successfully generated seed_places.sql with ${PLACES_DATA.length} places.`);
