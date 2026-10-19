import fs from 'fs';

const map = JSON.parse(fs.readFileSync('scratch_photos_map.json', 'utf8'));
console.log('Total in map:', Object.keys(map).length);
Object.entries(map).slice(0, 15).forEach(([k, v]) => {
  console.log(`${k}: ${v.slice(0, 80)}...`);
});
