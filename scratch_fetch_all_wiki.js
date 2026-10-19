import { PLACES_DATA } from './src/data/placesData.js';

// Search Wikipedia API for a title or query
async function getWikiImage(query) {
  // First search for the most relevant article
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=1`;
  try {
    const sRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'DiscoverEgypt/1.0 (contact@discoveregypt.com)' }
    });
    const sData = await sRes.json();
    if (!sData.query || !sData.query.search || sData.query.search.length === 0) {
      return null;
    }
    const title = sData.query.search[0].title;

    // Now get pageimage
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages|description&format=json&pithumbsize=1200`;
    const iRes = await fetch(imgUrl, {
      headers: { 'User-Agent': 'DiscoverEgypt/1.0 (contact@discoveregypt.com)' }
    });
    const iData = await iRes.json();
    const pages = iData.query.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    if (page && page.thumbnail && page.thumbnail.source) {
      return {
        matchedTitle: title,
        source: page.thumbnail.source
      };
    }
  } catch (err) {
    return null;
  }
  return null;
}

async function testAll() {
  const results = [];
  for (let i = 0; i < PLACES_DATA.length; i++) {
    const p = PLACES_DATA[i];
    const query = `${p.nameEn} Egypt`;
    const res = await getWikiImage(query);
    console.log(`[${i + 1}/${PLACES_DATA.length}] ${p.nameEn}: ${res ? res.matchedTitle : 'FAILED'}`);
    results.push({
      id: p.id,
      nameEn: p.nameEn,
      result: res
    });
  }
  console.log('Finished. Success count:', results.filter(r => r.result).length);
}

testAll();
