import fs from 'fs';
const lines = fs.readFileSync('src/Pages/Explore.jsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('googleusercontent') || l.includes('unsplash')) {
    console.log(`Line ${i + 1}: ${l}`);
  }
});
