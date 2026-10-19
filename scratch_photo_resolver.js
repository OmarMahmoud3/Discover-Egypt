import fs from 'fs';

// Helper to check if a Special:FilePath or direct URL returns 200 image
async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    const cType = res.headers.get('content-type') || '';
    if (res.ok && cType.startsWith('image/')) {
      return { ok: true, url: res.url, type: cType };
    }
  } catch (err) {}
  return { ok: false };
}

// Find a real photo on Commons for a keyword
async function findCommonsPhoto(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap -logo -svg -icon')}&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DiscoverEgyptBot/1.0 (info@discoveregypt.com)' }
    });
    const data = await res.json();
    const pages = data.query?.pages;
    if (pages) {
      for (const pId of Object.keys(pages)) {
        const info = pages[pId]?.imageinfo?.[0];
        const thumb = info?.thumburl || info?.url;
        if (thumb && !thumb.endsWith('.svg.png') && !thumb.endsWith('.svg')) {
          const chk = await checkUrl(thumb);
          if (chk.ok) {
            return thumb;
          }
        }
      }
    }
  } catch (e) {}
  return null;
}

// Test candidate file or query
async function resolvePlacePhoto(id, nameEn, nameAr, candidateFile) {
  if (candidateFile) {
    const url = candidateFile.startsWith('http') 
      ? candidateFile 
      : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(candidateFile)}?width=1200`;
    const res = await checkUrl(url);
    if (res.ok) {
      return { id, photoUrl: url, source: 'candidate' };
    }
  }

  // Fallback searches
  const queries = [
    `${nameEn} Egypt`,
    `${nameEn}`,
    `${nameAr}`
  ];

  for (const q of queries) {
    const found = await findCommonsPhoto(q);
    if (found) {
      return { id, photoUrl: found, source: 'search: ' + q };
    }
  }

  return { id, photoUrl: null };
}

export { checkUrl, findCommonsPhoto, resolvePlacePhoto };
