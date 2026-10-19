import { PLACES_DATA } from './src/data/placesData.js';

PLACES_DATA.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.id}] ${p.nameEn} (${p.cityEn}): ${p.image}`);
});
