import fs from 'fs';
import { PLACES_DATA } from './src/data/placesData.js';

console.log('Total places in PLACES_DATA:', PLACES_DATA.length);

const imageDomains = {};
let aidaCount = 0;
const samplePlaces = [];

PLACES_DATA.forEach((p, idx) => {
  const img = p.image || '';
  let domain = 'none';
  try {
    if (img) domain = new URL(img).hostname;
  } catch (e) {
    domain = 'invalid';
  }
  imageDomains[domain] = (imageDomains[domain] || 0) + 1;
  if (img.includes('aida-public')) {
    aidaCount++;
  }
  if (idx < 10) {
    samplePlaces.push({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      image: img.slice(0, 70) + '...'
    });
  }
});

console.log('Image domains breakdown:', imageDomains);
console.log('aida-public count:', aidaCount);
console.log('Sample places:', JSON.stringify(samplePlaces, null, 2));
