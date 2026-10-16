import fs from 'fs';

// Load PLACES_DATA from placesData.js or parsed JSON
const parsedPlaces = JSON.parse(fs.readFileSync('scripts/parsed_places.json', 'utf-8'));

// Generate SQL statements
let sql = `-- Discover Egypt: Seed 94 Tourist Destinations into public.places
-- Run this script in your Supabase SQL Editor if you wish to populate the database directly.

INSERT INTO public.places (
  id,
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
  is_published,
  created_at
)
VALUES
`;

const escapeSql = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
};

const rows = parsedPlaces.map((p) => {
  const galleryArray = p.gallery && p.gallery.length > 0 
    ? `ARRAY[${p.gallery.map(g => escapeSql(g.url || g)).join(', ')}]::text[]`
    : `'{}'::text[]`;

  return `(
  ${escapeSql(p.slug)},
  ${escapeSql(p.name)},
  ${escapeSql(p.nameEn)},
  ${escapeSql(p.slug)},
  ${escapeSql(p.city)},
  ${escapeSql(p.category)},
  ${escapeSql(p.description)},
  ${escapeSql(p.image)},
  ${galleryArray},
  ${p.latitude || 29.9792},
  ${p.longitude || 31.1342},
  true,
  NOW()
)`;
});

sql += rows.join(',\n') + `
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  slug = EXCLUDED.slug,
  city = EXCLUDED.city,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  gallery = EXCLUDED.gallery,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  is_published = EXCLUDED.is_published;
`;

fs.writeFileSync('supabase/seed_places.sql', sql, 'utf-8');
console.log('Generated supabase/seed_places.sql with 94 places.');
