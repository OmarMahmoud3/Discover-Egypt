import fs from 'fs';
import path from 'path';

function findImagesInDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      findImagesInDir(full);
    } else if (/\.(jsx?|tsx?|css|html)$/.test(f.name)) {
      const txt = fs.readFileSync(full, 'utf8');
      const matches = txt.match(/https?:\/\/[^"'\`\s\)]+/g) || [];
      const imgMatches = matches.filter(m => m.includes('unsplash') || m.includes('googleusercontent') || m.includes('wikimedia') || /\.(jpg|jpeg|png|webp|avif)/i.test(m));
      if (imgMatches.length > 0 && !full.includes('placesData.js')) {
        console.log(full, imgMatches.length, 'matches:', imgMatches);
      }
    }
  }
}
findImagesInDir('src');
