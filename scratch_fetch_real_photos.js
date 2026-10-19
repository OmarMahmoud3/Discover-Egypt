import fs from 'fs';

const TITLES_MAP = {
  "giza-plateau": "Giza pyramid complex",
  "great-pyramid-of-khufu": "Great Pyramid of Giza",
  "great-sphinx-of-giza": "Great Sphinx of Giza",
  "grand-egyptian-museum": "Grand Egyptian Museum",
  "step-pyramid-of-djoser": "Pyramid of Djoser",
  "serapeum-of-saqqara": "Serapeum of Saqqara",
  "red-pyramid-dahshur": "Red Pyramid",
  "bent-pyramid-dahshur": "Bent Pyramid",
  "memphis-open-air-museum": "Memphis, Egypt",
  "egyptian-museum-tahrir": "Egyptian Museum (Cairo)",
  "nmec-cairo": "National Museum of Egyptian Civilization",
  "museum-of-islamic-art-cairo": "Museum of Islamic Art, Cairo",
  "coptic-museum-cairo": "Coptic Museum",
  "citadel-of-saladin": "Cairo Citadel",
  "mosque-of-muhammad-ali": "Mosque of Muhammad Ali",
  "al-muizz-street": "Al-Mu'izz Street",
  "khan-el-khalili": "Khan el-Khalili",
  "sultan-hassan-mosque": "Mosque-Madrasa of Sultan Hasan",
  "al-rifai-mosque": "Al-Rifa'i Mosque",
  "mosque-of-ibn-tulun": "Mosque of Ibn Tulun",
  "hanging-church-cairo": "Hanging Church",
  "ben-ezra-synagogue": "Ben Ezra Synagogue",
  "baron-empain-palace": "Baron Empain Palace",
  "manial-palace": "Prince Mohamed Ali Palace (Manial)",
  "cairo-tower": "Cairo Tower",
  "abdeen-palace": "Abdeen Palace",
  "bibliotheca-alexandrina": "Bibliotheca Alexandrina",
  "citadel-of-qaitbay": "Citadel of Qaitbay",
  "catacombs-kom-el-shoqafa": "Catacombs of Kom El Shoqafa",
  "pompeys-pillar": "Pompey's Pillar (Alexandria)",
  "roman-theatre-kom-el-dikka": "Kom El Dikka",
  "montaza-gardens": "Montaza Palace",
  "royal-jewelry-museum": "Royal Jewelry Museum",
  "alexandria-national-museum": "Alexandria National Museum",
  "stanley-bridge": "Stanley Bridge",
  "abu-al-abbas-al-mursi-mosque": "Abu al-Abbas al-Mursi Mosque",
  "karnak-temple-complex": "Karnak",
  "luxor-temple": "Luxor Temple",
  "valley-of-the-kings": "Valley of the Kings",
  "temple-of-hatshepsut": "Mortuary temple of Hatshepsut",
  "colossi-of-memnon": "Colossi of Memnon",
  "medinet-habu-temple": "Medinet Habu",
  "ramesseum": "Ramesseum",
  "deir-el-medina": "Deir el-Medina",
  "luxor-museum": "Luxor Museum",
  "dendera-temple-complex": "Dendera temple complex",
  "temple-seti-i-abydos": "Temple of Seti I (Abydos)",
  "temple-of-edfu": "Temple of Edfu",
  "temple-of-kom-ombo": "Temple of Kom Ombo",
  "temple-of-esna": "Temple of Esna",
  "philae-temple-complex": "Philae",
  "unfinished-obelisk": "Unfinished obelisk",
  "nubian-museum": "Nubian Museum",
  "abu-simbel-temples": "Abu Simbel",
  "elephantine-island": "Elephantine",
  "gharb-soheil-nubian-village": "Aswan",
  "aga-khan-mausoleum": "Mausoleum of the Aga Khan",
  "aswan-high-dam": "Aswan Dam",
  "kalabsha-temple": "Temple of Kalabsha",
  "saint-catherine-monastery": "Saint Catherine's Monastery",
  "mount-sinai": "Mount Sinai",
  "ras-mohammed-national-park": "Ras Muhammad National Park",
  "naama-bay": "Naama Bay",
  "sharm-el-sheikh-old-market": "Al-Sahaba Mosque",
  "blue-hole-dahab": "Blue Hole (Red Sea)",
  "abu-galum-protectorate": "Ras Abu Galum",
  "colored-canyon": "Coloured Canyon",
  "giftun-islands": "Giftun Island",
  "hurghada-marina": "Hurghada",
  "el-gouna": "El Gouna",
  "wadi-el-gemal-national-park": "Wadi Gemal",
  "monastery-of-saint-anthony": "Monastery of Saint Anthony",
  "monastery-of-saint-paul": "Monastery of Saint Paul the Anchorite",
  "wadi-al-hitan": "Wadi al-Hitan",
  "wadi-el-rayan": "Wadi El Rayan",
  "qasr-qarun-temple": "Qasr Qarun",
  "tunis-village-fayoum": "Faiyum Oasis",
  "lake-qarun": "Lake Moeris",
  "magic-lake-fayoum": "Wadi El Rayan",
  "shali-fortress": "Shali, Egypt",
  "oracle-temple-amun-siwa": "Siwa Oasis",
  "cleopatras-spring-siwa": "Siwa Oasis",
  "white-desert-national-park": "White Desert National Park",
  "black-desert": "Black Desert (Egypt)",
  "crystal-mountain-egypt": "Crystal Mountain (Egypt)",
  "temple-of-hibis": "Temple of Hibis",
  "al-qasr-islamic-village": "Dakhla Oasis",
  "historic-rashid-rosetta": "Rashid",
  "tanis-archaeological-site": "Tanis",
  "monasteries-wadi-el-natrun": "Wadi El Natrun",
  "monastery-saint-bishoy": "Monastery of Saint Pishoy",
  "qaitbay-citadel-rosetta": "Fort Julien",
  "zaranik-protectorate": "Lake Bardawil",
  "nabq-protected-area": "Nabq Protected Area"
};

async function getArticleImages(title) {
  // Query page images & images in page
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages|images&format=json&pithumbsize=1200`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'DiscoverEgyptBot/1.0 (info@discoveregypt.com)' } });
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    if (!page || page.missing !== undefined) return null;

    let thumb = page.thumbnail?.source;
    if (thumb && !thumb.endsWith('.svg.png') && !thumb.endsWith('.svg')) {
      return thumb;
    }

    // If svg or no thumb, search for first valid jpg/png file on that page
    if (page.images && page.images.length > 0) {
      for (const img of page.images) {
        const imgTitle = img.title;
        if (/\.(jpe?g|png)$/i.test(imgTitle) && !imgTitle.toLowerCase().includes('icon') && !imgTitle.toLowerCase().includes('logo')) {
          // get imageinfo url
          const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imgTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
          const iRes = await fetch(infoUrl, { headers: { 'User-Agent': 'DiscoverEgyptBot/1.0 (info@discoveregypt.com)' } });
          const iData = await iRes.json();
          const iPages = iData.query?.pages;
          if (iPages) {
            const iId = Object.keys(iPages)[0];
            const iThumb = iPages[iId]?.imageinfo?.[0]?.thumburl || iPages[iId]?.imageinfo?.[0]?.url;
            if (iThumb) return iThumb;
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching for ${title}:`, err.message);
  }
  return null;
}

async function run() {
  const finalMap = {};
  const entries = Object.entries(TITLES_MAP);
  console.log(`Starting to fetch real photos for ${entries.length} landmarks...`);

  for (let i = 0; i < entries.length; i++) {
    const [id, title] = entries[i];
    const imgUrl = await getArticleImages(title);
    if (imgUrl) {
      finalMap[id] = imgUrl;
      console.log(`[${i + 1}/${entries.length}] SUCCESS: ${id} -> ${title}`);
    } else {
      console.log(`[${i + 1}/${entries.length}] FAILED: ${id} (${title})`);
    }
  }

  fs.writeFileSync('scratch_photos_map.json', JSON.stringify(finalMap, null, 2));
  console.log(`Done! Saved ${Object.keys(finalMap).length} real photos to scratch_photos_map.json`);
}

run();
