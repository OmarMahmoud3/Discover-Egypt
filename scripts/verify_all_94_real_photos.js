import fs from 'fs';
import { checkUrl } from '../scratch_photo_resolver.js';
import { PLACES_DATA } from '../src/data/placesData.js';

// Load base verified map (76 places)
const verifiedBase = JSON.parse(fs.readFileSync('verified_real_photos_map.json', 'utf8'));

// The 18 verified additions
const additions = {
  'grand-egyptian-museum': 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Grand_Egyptian_Museum.jpg?width=1200',
  'egyptian-museum-tahrir': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/1897_bis_1902_wurde_das_%C3%84gyptische_Museum_in_Kairo_gebaut._04.jpg/1280px-1897_bis_1902_wurde_das_%C3%84gyptische_Museum_in_Kairo_gebaut._04.jpg',
  'nmec-cairo': 'https://commons.wikimedia.org/wiki/Special:FilePath/NMEC-MainEntrance.jpg?width=1200',
  'mosque-of-muhammad-ali': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/%D9%82%D9%84%D8%B9%D8%A9_%D8%B5%D9%84%D8%A7%D8%AD_%D8%A7%D9%84%D8%AF%D9%8A%D9%86_%D8%A7%D9%84%D8%A3%D9%8A%D9%88%D8%A8%D9%8A_%D9%88%D8%AC%D8%A7%D9%85%D8%B9_%D9%85%D8%AD%D9%85%D8%AF_%D8%B9%D9%84%D9%8A.jpg/1280px-thumbnail.jpg',
  'manial-palace': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Manial_Palace_and_Museum.jpg/1280px-Manial_Palace_and_Museum.jpg',
  'roman-theatre-kom-el-dikka': 'https://commons.wikimedia.org/wiki/Special:FilePath/Alexandrie_Th%C3%A9%C3%A2tre_romain_2.jpg?width=1200',
  'stanley-bridge': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Stanley_bridge_%28Alexandria%29_-_Egypt.jpg/1280px-Stanley_bridge_%28Alexandria%29_-_Egypt.jpg',
  'philae-temple-complex': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Philae_Temple_R03.jpg/1280px-Philae_Temple_R03.jpg',
  'aga-khan-mausoleum': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Assuan_Aga_Khan_Mausoleum_BW_2.jpg/1280px-Assuan_Aga_Khan_Mausoleum_BW_2.jpg',
  'aswan-high-dam': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Aswan_High_Dam-1.jpg/1280px-Aswan_High_Dam-1.jpg',
  'sharm-el-sheikh-old-market': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Al-Sahaba_Mosque%2C_Old_Market%2C_Sharm_El_Sheikh.jpg/1280px-Al-Sahaba_Mosque%2C_Old_Market%2C_Sharm_El_Sheikh.jpg',
  'abu-galum-protectorate': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Blue_Lagoon_South_Sinai.jpg/1280px-Blue_Lagoon_South_Sinai.jpg',
  'giftun-islands': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Giftun_Island.jpg/1280px-Giftun_Island.jpg',
  'wadi-el-gemal-national-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Wadi_El_Gemal_National_Park.jpg/1280px-Wadi_El_Gemal_National_Park.jpg',
  'wadi-al-hitan': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/The_complete_skeleton_of_the_Basilosaurus_is_displayed_at_the_Wadi_Al-Hitan_open-air_museum.jpg/1280px-thumbnail.jpg',
  'shali-fortress': 'https://commons.wikimedia.org/wiki/Special:FilePath/Shali_Fortress.jpg?width=1200',
  'historic-rashid-rosetta': 'https://upload.wikimedia.org/wikipedia/commons/f/f5/%D9%85%D9%86%D8%B2%D9%84_%D8%A7%D9%84%D8%A3%D9%85%D8%B5%D9%8A%D9%84%D9%8A3.jpg',
  'tanis-archaeological-site': 'https://commons.wikimedia.org/wiki/Special:FilePath/Ruins_of_Tanis.jpg?width=1200'
};

const fullMap = { ...verifiedBase, ...additions };

async function verifyCompleteCoverage() {
  console.log(`Checking coverage for all ${PLACES_DATA.length} places...`);
  const finalVerified = {};
  const failed = [];

  for (let i = 0; i < PLACES_DATA.length; i++) {
    const p = PLACES_DATA[i];
    const url = fullMap[p.id];
    if (!url) {
      console.log(`[${i + 1}/${PLACES_DATA.length}] MISSING URL: ${p.id} (${p.nameEn})`);
      failed.push(p.id);
      continue;
    }

    const check = await checkUrl(url);
    if (check.ok) {
      finalVerified[p.id] = check.url || url;
      console.log(`[${i + 1}/${PLACES_DATA.length}] OK: ${p.id}`);
    } else {
      console.log(`[${i + 1}/${PLACES_DATA.length}] FAILED CHECK: ${p.id} -> ${url}`);
      failed.push(p.id);
    }
  }

  console.log(`\nResults: ${Object.keys(finalVerified).length} verified / ${PLACES_DATA.length} total.`);
  if (failed.length > 0) {
    console.error(`Failed places (${failed.length}):`, failed);
  } else {
    console.log('ALL 94 PLACES VERIFIED 100% WITH REAL PHOTOS!');
    fs.writeFileSync('all_94_real_photos.json', JSON.stringify(finalVerified, null, 2));
  }
}

verifyCompleteCoverage();
