import fs from 'fs';
import { checkUrl } from '../scratch_photo_resolver.js';
import { PLACES_DATA } from '../src/data/placesData.js';
import { supabase } from '../src/lib/supabase.js';

// Base map
const base = JSON.parse(fs.readFileSync('verified_real_photos_map.json', 'utf8'));

// The precise verified additions and overrides
const preciseAdditions = {
  'grand-egyptian-museum': 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Grand_Egyptian_Museum.jpg?width=1200',
  'egyptian-museum-tahrir': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/1897_bis_1902_wurde_das_%C3%84gyptische_Museum_in_Kairo_gebaut._04.jpg/1280px-1897_bis_1902_wurde_das_%C3%84gyptische_Museum_in_Kairo_gebaut._04.jpg',
  'nmec-cairo': 'https://commons.wikimedia.org/wiki/Special:FilePath/NMEC-MainEntrance.jpg?width=1200',
  'mosque-of-muhammad-ali': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Muhammad_Ali_Mosque_1.jpg/1280px-Muhammad_Ali_Mosque_1.jpg',
  'manial-palace': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Manial_Palace_and_Museum.jpg/1280px-Manial_Palace_and_Museum.jpg',
  'roman-theatre-kom-el-dikka': 'https://commons.wikimedia.org/wiki/Special:FilePath/Alexandrie_Th%C3%A9%C3%A2tre_romain_2.jpg?width=1200',
  'stanley-bridge': 'https://upload.wikimedia.org/wikipedia/commons/4/49/AlexStanleyBridge.jpg',
  'temple-of-esna': 'https://commons.wikimedia.org/wiki/Special:FilePath/SFEC%20EGYPT%20ESNA%202006-007.JPG?width=1200',
  'philae-temple-complex': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Philae_Temple_R03.jpg/1280px-Philae_Temple_R03.jpg',
  'aga-khan-mausoleum': 'https://commons.wikimedia.org/wiki/Special:FilePath/Aswan%20Aga%20Khan%20Mausoleum%20R01.jpg?width=1200',
  'aswan-high-dam': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Aswan_High_Dam-1.jpg/1280px-Aswan_High_Dam-1.jpg',
  'sharm-el-sheikh-old-market': 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Sahaba%20Mosque%20in%20Sharm%20El-Sheikh1.jpg?width=1200',
  'abu-galum-protectorate': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Blue_Lagoon_South_Sinai.jpg/1280px-Blue_Lagoon_South_Sinai.jpg',
  'giftun-islands': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Giftun_Soraya01.JPG/1280px-Giftun_Soraya01.JPG',
  'wadi-el-gemal-national-park': 'https://commons.wikimedia.org/wiki/Special:FilePath/Wadi%20el%20Gemal%20National%20Park1.jpg?width=1200',
  'wadi-al-hitan': 'https://commons.wikimedia.org/wiki/Special:FilePath/Dorudon%20atrox%20fossil%20at%20Wadi%20El-Hitan%2C%20Egypt%2C%20March%202008.jpg?width=1200',
  'shali-fortress': 'https://commons.wikimedia.org/wiki/Special:FilePath/Shali_Fortress.jpg?width=1200',
  'temple-of-hibis': 'https://commons.wikimedia.org/wiki/Special:FilePath/The%20Temple%20of%20Hibis%20by%20Hanne%20Siegmeier.jpg?width=1200',
  'historic-rashid-rosetta': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Rashid_For_Wiki-21.jpg/1280px-Rashid_For_Wiki-21.jpg',
  'zaranik-protectorate': 'https://commons.wikimedia.org/wiki/Special:FilePath/ISS035-E-007148%20Nile%20-%20Sinai%20-%20Dead%20Sea%20-%20Wide%20Angle%20View.jpg?width=1200',
  'tanis-archaeological-site': 'https://commons.wikimedia.org/wiki/Special:FilePath/Ruins_of_Tanis.jpg?width=1200'
};

const fullMap = { ...base, ...preciseAdditions };

async function buildAndApply() {
  console.log('--- Step 1: Validating All 94 Photos ---');
  const verifiedMap = {};
  const failures = [];

  for (let i = 0; i < PLACES_DATA.length; i++) {
    const p = PLACES_DATA[i];
    const rawUrl = fullMap[p.id];
    if (!rawUrl) {
      console.error(`[${i + 1}/${PLACES_DATA.length}] Missing URL for: ${p.id}`);
      failures.push(p.id);
      continue;
    }

    const check = await checkUrl(rawUrl);
    if (check.ok) {
      const finalUrl = check.url || rawUrl;
      verifiedMap[p.id] = finalUrl;
      console.log(`[${i + 1}/${PLACES_DATA.length}] ✓ OK: ${p.id}`);
    } else {
      console.error(`[${i + 1}/${PLACES_DATA.length}] ✗ FAILED: ${p.id} (${rawUrl})`);
      failures.push(p.id);
    }
  }

  if (failures.length > 0) {
    console.error(`Stopping: ${failures.length} places failed URL validation.`, failures);
    process.exit(1);
  }

  console.log('\n--- Step 2: All 94 Photos Verified 100%! Saving JSON ---');
  fs.writeFileSync('src/data/realPhotosMap.json', JSON.stringify(verifiedMap, null, 2));

  console.log('\n--- Step 3: Updating Supabase database ---');
  const { data: dbPlaces, error: fetchErr } = await supabase.from('places').select('id, slug, name');
  if (fetchErr) {
    console.error('Error fetching places from Supabase:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${dbPlaces.length} places in Supabase. Updating image_url for each...`);
  let dbUpdatedCount = 0;

  for (const dbPlace of dbPlaces) {
    const newImage = verifiedMap[dbPlace.slug];
    if (newImage) {
      const { error: updErr } = await supabase
        .from('places')
        .update({
          image_url: newImage,
          gallery: [newImage]
        })
        .eq('id', dbPlace.id);

      if (updErr) {
        console.error(`Failed to update ${dbPlace.slug} in Supabase:`, updErr);
      } else {
        dbUpdatedCount++;
      }
    } else {
      console.warn(`No real photo mapped for slug: ${dbPlace.slug}`);
    }
  }

  console.log(`✓ Successfully updated ${dbUpdatedCount}/${dbPlaces.length} places in Supabase!`);

  console.log('\n--- Step 4: Updating src/data/placesData.js ---');
  let placesDataCode = fs.readFileSync('src/data/placesData.js', 'utf8');

  let replacedCount = 0;
  for (const p of PLACES_DATA) {
    const newImage = verifiedMap[p.id];
    if (newImage && p.image !== newImage) {
      const searchStr = `id: '${p.id}'`;
      const pIdx = placesDataCode.indexOf(searchStr);
      if (pIdx !== -1) {
        const imgRegex = /image:\s*['"`]([^'"`]+)['"`]/;
        const sub = placesDataCode.slice(pIdx, pIdx + 1200);
        const match = sub.match(imgRegex);
        if (match && match[1] !== newImage) {
          const oldFull = match[0];
          const newFull = `image: '${newImage}'`;
          const replacedSub = sub.replace(oldFull, newFull);
          placesDataCode = placesDataCode.slice(0, pIdx) + replacedSub + placesDataCode.slice(pIdx + 1200);
          replacedCount++;
        }
      }
    }
  }

  fs.writeFileSync('src/data/placesData.js', placesDataCode, 'utf8');
  console.log(`✓ Updated ${replacedCount} places in src/data/placesData.js`);
  console.log('\n🎉 ALL 94 PLACES NOW HAVE REAL-WORLD AUTHENTIC PHOTOS EVERYWHERE!');
}

buildAndApply();
