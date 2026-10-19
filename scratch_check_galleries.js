import { PLACES_DATA } from './src/data/placesData.js';

let totalGalleryImages = 0;
const galleryCounts = {};

PLACES_DATA.forEach(p => {
  if (p.gallery && Array.isArray(p.gallery)) {
    p.gallery.forEach(g => {
      totalGalleryImages++;
      let id = g.url || '';
      if (id.includes('unsplash.com/photo-')) {
        id = id.split('unsplash.com/')[1].split('?')[0];
      } else if (id.includes('aida-public')) {
        id = 'AI_GENERATED_AIDA';
      }
      galleryCounts[id] = (galleryCounts[id] || 0) + 1;
    });
  }
});

console.log('Total gallery items:', totalGalleryImages);
console.log('Unique gallery image IDs:', Object.keys(galleryCounts).length);
console.log('Top gallery IDs:', Object.entries(galleryCounts).slice(0, 10));
