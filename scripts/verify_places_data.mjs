import { PLACES_DATA } from '../src/data/placesData.js';

console.log(`Total places in PLACES_DATA: ${PLACES_DATA.length}`);

const ids = new Set();
const slugs = new Set();
let errors = 0;

PLACES_DATA.forEach((p, idx) => {
  if (!p.id) {
    console.error(`Place at index ${idx} missing ID`);
    errors++;
  }
  if (!p.slug) {
    console.error(`Place at index ${idx} missing slug`);
    errors++;
  }
  if (!p.name) {
    console.error(`Place at index ${idx} missing name`);
    errors++;
  }
  if (!p.city) {
    console.error(`Place ${p.slug} missing city`);
    errors++;
  }
  if (!p.category) {
    console.error(`Place ${p.slug} missing category`);
    errors++;
  }
  if (!p.image) {
    console.error(`Place ${p.slug} missing image`);
    errors++;
  }
  if (ids.has(p.id)) {
    console.error(`Duplicate ID found: ${p.id}`);
    errors++;
  }
  if (slugs.has(p.slug)) {
    console.error(`Duplicate slug found: ${p.slug}`);
    errors++;
  }
  ids.add(p.id);
  slugs.add(p.slug);
});

if (errors === 0) {
  console.log(`✅ All ${PLACES_DATA.length} places are valid, unique, and complete!`);
} else {
  console.log(`❌ Found ${errors} validation errors.`);
}
