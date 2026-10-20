import fs from 'fs';

const map = JSON.parse(fs.readFileSync('src/data/realPhotosMap.json', 'utf8'));
let code = fs.readFileSync('src/data/placesData.js', 'utf8');

let count = 0;
for (const [id, url] of Object.entries(map)) {
  const targetId = `"id": "${id}"`;
  const idx = code.indexOf(targetId);
  if (idx !== -1) {
    const chunk = code.slice(idx, idx + 2000);
    const m = chunk.match(/"image":\s*"([^"]+)"/);
    if (m && m[1] !== url) {
      const oldImgStr = m[0];
      const newImgStr = `"image": "${url}"`;
      const newChunk = chunk.replace(oldImgStr, newImgStr);
      code = code.slice(0, idx) + newChunk + code.slice(idx + 2000);
      count++;
    }
  }
}

fs.writeFileSync('src/data/placesData.js', code, 'utf8');
console.log(`Successfully updated ${count} places in src/data/placesData.js with real photos.`);
