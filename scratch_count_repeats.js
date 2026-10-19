import { PLACES_DATA } from './src/data/placesData.js';

const counts = {};
PLACES_DATA.forEach(p => {
  const img = p.image || '';
  let id = img;
  if (img.includes('unsplash.com/photo-')) {
    id = img.split('unsplash.com/')[1].split('?')[0];
  } else if (img.includes('aida-public')) {
    id = 'AI_GENERATED_AIDA';
  }
  counts[id] = (counts[id] || 0) + 1;
});

console.log('Unique image count:', Object.keys(counts).length);
console.log('Most repeated images:');
Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${k}: ${v} places`);
});
