import fs from 'fs';

const map = JSON.parse(fs.readFileSync('src/data/realPhotosMap.json', 'utf8'));

let sql = `-- Discover Egypt: Batch Update all 94 Places with Real-World Authentic Photography
-- Run this script in your Supabase SQL Editor to update all places instantly.

BEGIN;

`;

for (const [slug, url] of Object.entries(map)) {
  const escapedUrl = url.replace(/'/g, "''");
  sql += `UPDATE public.places SET\n  image_url = '${escapedUrl}',\n  gallery = ARRAY['${escapedUrl}']::text[]\nWHERE slug = '${slug}';\n\n`;
}

sql += `COMMIT;\n`;

fs.writeFileSync('supabase/update_real_photos.sql', sql, 'utf8');
console.log('Successfully generated supabase/update_real_photos.sql with 94 updates.');
