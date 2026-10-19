import fs from 'fs';
import { checkUrl, findCommonsPhoto } from './scratch_photo_resolver.js';
import { PLACES_DATA } from './src/data/placesData.js';

// Pre-tested high quality candidates from Wikimedia Commons & verified real photography
const CURATED_CANDIDATES = {
  "giza-plateau": "Pyramids_of_the_Giza_Necropolis.jpg",
  "great-pyramid-of-khufu": "Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg",
  "great-sphinx-of-giza": "Sphinx_with_the_third_pyramid.jpg",
  "grand-egyptian-museum": "Grand_Egyptian_Museum_atrium_with_statue_of_Ramesses_II.jpg",
  "step-pyramid-of-djoser": "Sakkara_01.jpg",
  "serapeum-of-saqqara": "Serapeum_gate.jpg",
  "red-pyramid-dahshur": "Rote_Pyramide_(Dahschur)_01.jpg",
  "bent-pyramid-dahshur": "Bent_Pyramid_at_Dahshur.jpg",
  "memphis-open-air-museum": "Memphis200401.JPG",
  "egyptian-museum-tahrir": "Egyptian_Museum,_Cairo_(front).jpg",
  "nmec-cairo": "National_Museum_of_Egyptian_Civilization_building.jpg",
  "museum-of-islamic-art-cairo": "GD-EG-Caire-MuséeIsl001.JPG",
  "coptic-museum-cairo": "Kairo_-_Altkairo_05.jpg",
  "citadel-of-saladin": "Saladin_Citadel_Cairo.jpg",
  "mosque-of-muhammad-ali": "Mosque_of_Muhammad_Ali,_Cairo_01.jpg",
  "al-muizz-street": "Al-Mu'izz_Street_Cairo.jpg",
  "khan-el-khalili": "خان_الخليلي_1.jpg",
  "sultan-hassan-mosque": "Mosque-Madrassa_of_Sultan_Hasan_01.jpg",
  "al-rifai-mosque": "Al-Rifai_Mosque,_Cairo_01.jpg",
  "mosque-of-ibn-tulun": "Mosque_of_Ibn_Tulun_Courtyard.jpg",
  "hanging-church-cairo": "The_Hanging_Church,_Cairo_01.jpg",
  "ben-ezra-synagogue": "Synagogue_Ben_Ezra_-_Caire_2003.JPG",
  "baron-empain-palace": "Baron_Empain_Palace_Cairo.jpg",
  "manial-palace": "Manial_Palace_and_Museum_entrance.jpg",
  "cairo-tower": "Cairo_Tower_01.jpg",
  "abdeen-palace": "Abdeen_Palace_Cairo.jpg",
  "bibliotheca-alexandrina": "Bibliotheca_Alexandrina_exterior.jpg",
  "citadel-of-qaitbay": "Citadel_of_Qaitbay_Alexandria.jpg",
  "catacombs-kom-el-shoqafa": "Kom_el-Shoqafa_catacombs.jpg",
  "pompeys-pillar": "Pompey's_Pillar_Alexandria.jpg",
  "roman-theatre-kom-el-dikka": "Roman_Amphitheatre_Alexandria.jpg",
  "montaza-gardens": "Montaza_Palace_Alexandria.jpg",
  "royal-jewelry-museum": "Royal_Jewelry_Museum_Alexandria.jpg",
  "alexandria-national-museum": "Alexandria_National_Museum_facade.jpg",
  "stanley-bridge": "Stanley_Bridge_Alexandria.jpg",
  "abu-al-abbas-al-mursi-mosque": "Abu_al-Abbas_al-Mursi_Mosque_Alexandria.jpg",
  "karnak-temple-complex": "Karnak_temple_hypostyle_hall.jpg",
  "luxor-temple": "Luxor_Temple_entrance_colossi.jpg",
  "valley-of-the-kings": "Valley_of_the_Kings_Luxor.jpg",
  "temple-of-hatshepsut": "Mortuary_Temple_of_Hatshepsut_cliffs.jpg",
  "colossi-of-memnon": "Colossi_of_Memnon_Luxor.jpg",
  "medinet-habu-temple": "Medinet_Habu_Ramses_III_temple.jpg",
  "ramesseum": "Ramesseum_Luxor_statue.jpg",
  "deir-el-medina": "Deir_el-Medina_artisans_village.jpg",
  "luxor-museum": "Luxor_Museum_exterior.jpg",
  "dendera-temple-complex": "Dendera_Temple_Hathor_facade.jpg",
  "temple-seti-i-abydos": "Temple_of_Seti_I_Abydos_facade.jpg",
  "temple-of-edfu": "Temple_of_Edfu_pylon.jpg",
  "temple-of-kom-ombo": "Temple_of_Kom_Ombo_Nile.jpg",
  "temple-of-esna": "Temple_of_Esna_columns.jpg",
  "philae-temple-complex": "Philae_Temple_of_Isis_Aswan.jpg",
  "unfinished-obelisk": "Unfinished_Obelisk_Aswan_quarry.jpg",
  "nubian-museum": "Nubian_Museum_Aswan_building.jpg",
  "abu-simbel-temples": "Abu_Simbel_Great_Temple_facade.jpg",
  "elephantine-island": "Elephantine_Island_Aswan_Nile.jpg",
  "gharb-soheil-nubian-village": "Gharb_Soheil_Nubian_village_Aswan.jpg",
  "aga-khan-mausoleum": "Aga_Khan_Mausoleum_Aswan.jpg",
  "aswan-high-dam": "Aswan_High_Dam_monument.jpg",
  "kalabsha-temple": "Temple_of_Kalabsha_Lake_Nasser.jpg",
  "saint-catherine-monastery": "Saint_Catherine's_Monastery_Sinai.jpg",
  "mount-sinai": "Mount_Sinai_sunrise.jpg",
  "ras-mohammed-national-park": "Ras_Mohammed_National_Park_Sinai.jpg",
  "naama-bay": "Naama_Bay_Sharm_el-Sheikh.jpg",
  "sharm-el-sheikh-old-market": "Al-Sahaba_Mosque_Old_Market_Sharm.jpg",
  "blue-hole-dahab": "Blue_Hole_Dahab_Red_Sea.jpg",
  "abu-galum-protectorate": "Ras_Abu_Galum_protected_area.jpg",
  "colored-canyon": "Colored_Canyon_Nuweiba_Sinai.jpg",
  "giftun-islands": "Giftun_Island_Hurghada_beach.jpg",
  "hurghada-marina": "Hurghada_Marina_promenade.jpg",
  "el-gouna": "El_Gouna_lagoons_Red_Sea.jpg",
  "wadi-el-gemal-national-park": "Wadi_El_Gemal_National_Park_beach.jpg",
  "monastery-of-saint-anthony": "Monastery_of_Saint_Anthony_Red_Sea.jpg",
  "monastery-of-saint-paul": "Monastery_of_Saint_Paul_the_Anchorite.jpg",
  "wadi-al-hitan": "Wadi_Al-Hitan_whale_fossil.jpg",
  "wadi-el-rayan": "Wadi_El_Rayan_waterfalls_Fayoum.jpg",
  "qasr-qarun-temple": "Qasr_Qarun_temple_Fayoum.jpg",
  "tunis-village-fayoum": "Tunis_village_pottery_Fayoum.jpg",
  "lake-qarun": "Lake_Qarun_Fayoum_sunset.jpg",
  "magic-lake-fayoum": "Magic_Lake_Wadi_El_Rayan_dunes.jpg",
  "shali-fortress": "Shali_Fortress_Siwa_Oasis.jpg",
  "oracle-temple-amun-siwa": "Temple_of_the_Oracle_of_Amun_Aghurmi_Siwa.jpg",
  "cleopatras-spring-siwa": "Cleopatras_Bath_Siwa_Oasis.jpg",
  "white-desert-national-park": "White_Desert_National_Park_Egypt.jpg",
  "black-desert": "Black_Desert_Egypt_volcanic_hills.jpg",
  "crystal-mountain-egypt": "Crystal_Mountain_Egypt_arch.jpg",
  "temple-of-hibis": "Temple_of_Hibis_Kharga_Oasis.jpg",
  "al-qasr-islamic-village": "Al-Qasr_Islamic_village_Dakhla_Oasis.jpg",
  "historic-rashid-rosetta": "Rashid_Rosetta_Ottoman_houses.jpg",
  "tanis-archaeological-site": "Tanis_San_el-Hagar_ruins.jpg",
  "monasteries-wadi-el-natrun": "Wadi_El_Natrun_monastery_walls.jpg",
  "monastery-saint-bishoy": "Monastery_of_Saint_Bishoy_Wadi_El_Natrun.jpg",
  "qaitbay-citadel-rosetta": "Fort_Julien_Rosetta_Qaitbay_Citadel.jpg",
  "zaranik-protectorate": "Zaranik_Protectorate_Lake_Bardawil.jpg",
  "nabq-protected-area": "Nabq_Protected_Area_mangroves.jpg"
};

// Also load previous scratch_photos_map.json as potential candidates if needed
let previousMap = {};
try {
  previousMap = JSON.parse(fs.readFileSync('scratch_photos_map.json', 'utf8'));
} catch (e) {}

async function verifyAll() {
  const verifiedMap = {};
  const failed = [];

  for (let i = 0; i < PLACES_DATA.length; i++) {
    const p = PLACES_DATA[i];
    const candidateFile = CURATED_CANDIDATES[p.id];
    let candidateUrl = candidateFile 
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(candidateFile)}?width=1200`
      : null;

    // Check curated candidate first
    let verified = false;
    if (candidateUrl) {
      const check = await checkUrl(candidateUrl);
      if (check.ok) {
        verifiedMap[p.id] = candidateUrl;
        verified = true;
      }
    }

    // If not verified, try previous map if valid and not a logo/svg
    if (!verified && previousMap[p.id]) {
      const prevUrl = previousMap[p.id];
      if (!prevUrl.includes('logo') && !prevUrl.includes('Logo') && !prevUrl.endsWith('.svg.png')) {
        const check = await checkUrl(prevUrl);
        if (check.ok) {
          verifiedMap[p.id] = prevUrl;
          verified = true;
        }
      }
    }

    // If still not verified, search commons
    if (!verified) {
      const found = await findCommonsPhoto(`${p.nameEn} Egypt`) || await findCommonsPhoto(p.nameEn) || await findCommonsPhoto(p.name);
      if (found) {
        verifiedMap[p.id] = found;
        verified = true;
      }
    }

    if (verified) {
      console.log(`[${i + 1}/${PLACES_DATA.length}] OK: ${p.nameEn} -> ${verifiedMap[p.id].slice(0, 60)}...`);
    } else {
      console.log(`[${i + 1}/${PLACES_DATA.length}] FAIL: ${p.nameEn}`);
      failed.push(p);
    }
  }

  console.log(`\nFinished: Verified ${Object.keys(verifiedMap).length}/${PLACES_DATA.length} places.`);
  console.log('Failed places count:', failed.length);
  fs.writeFileSync('verified_real_photos_map.json', JSON.stringify(verifiedMap, null, 2));
}

verifyAll();
