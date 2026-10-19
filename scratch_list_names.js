import { PLACES_DATA } from './src/data/placesData.js';

console.log(JSON.stringify(PLACES_DATA.map((p, i) => ({
  index: i,
  id: p.id,
  nameEn: p.nameEn,
  name: p.name,
  cityEn: p.cityEn
})), null, 2));
