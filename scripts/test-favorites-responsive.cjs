const { chromium } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'audit-screenshots', 'favorites-responsive');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const viewports = [
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-360', width: 360, height: 740 },
  ];

  const langs = ['ar', 'en'];
  let totalErrors = 0;

  for (const lang of langs) {
    console.log(`\n================ Testing Language: ${lang.toUpperCase()} ================`);
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        locale: lang === 'ar' ? 'ar-EG' : 'en-US',
      });
      const page = await context.newPage();

      await page.addInitScript((l) => {
        localStorage.setItem('discover_egypt_favorites_guest', JSON.stringify(['great-sphinx-of-giza', 'giza-pyramids']));
        localStorage.setItem('discover_egypt_favorites', JSON.stringify(['great-sphinx-of-giza', 'giza-pyramids']));
        localStorage.setItem('discover_egypt_lang', l);
      }, lang);

      await page.goto('http://localhost:4173/favorites', { waitUntil: 'networkidle' });
      try {
        await page.waitForSelector('.journal-entry-card', { timeout: 8000 });
      } catch (e) {
        console.warn(`Card not found in time for ${lang} ${vp.name}`);
      }
      await page.waitForTimeout(400);

      const inspection = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.journal-entry-card'));
        if (cards.length === 0) return { error: 'No cards found' };

        const results = cards.map((card, idx) => {
          const cardRect = card.getBoundingClientRect();
          const photo = card.querySelector('.journal-entry-photo');
          const details = card.querySelector('.journal-entry-details');

          const photoRect = photo ? photo.getBoundingClientRect() : null;
          const detailsRect = details ? details.getBoundingClientRect() : null;

          let overlapArea = 0;
          if (photoRect && detailsRect) {
            const xOverlap = Math.max(0, Math.min(photoRect.right, detailsRect.right) - Math.max(photoRect.left, detailsRect.left));
            const yOverlap = Math.max(0, Math.min(photoRect.bottom, detailsRect.bottom) - Math.max(photoRect.top, detailsRect.top));
            overlapArea = xOverlap * yOverlap;
          }

          return {
            cardIndex: idx,
            cardWidth: cardRect.width,
            cardHeight: cardRect.height,
            photoWidth: photoRect?.width,
            photoHeight: photoRect?.height,
            detailsWidth: detailsRect?.width,
            detailsHeight: detailsRect?.height,
            overlapArea,
          };
        });

        // Horizontal overflow check on document
        const doc = document.documentElement;
        const hasDocOverflow = doc.scrollWidth > doc.clientWidth + 1;

        return {
          results,
          hasDocOverflow,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });

      console.log(`[${lang.toUpperCase()}] ${vp.name}: ${inspection.results?.[0]?.photoWidth?.toFixed(0)}px photo, ${inspection.results?.[0]?.detailsWidth?.toFixed(0)}px details, overlapArea: ${inspection.results?.[0]?.overlapArea || 0}`);

      if (inspection.results?.[0]?.overlapArea > 0) {
        console.error(`❌ OVERLAP DETECTED on ${lang} ${vp.name}: area = ${inspection.results[0].overlapArea}`);
        totalErrors++;
      } else {
        console.log(`✅ No overlap on ${lang} ${vp.name}`);
      }

      if (inspection.hasDocOverflow) {
        console.error(`❌ Page has horizontal overflow: scrollWidth=${inspection.scrollWidth} > clientWidth=${inspection.clientWidth}`);
        totalErrors++;
      }

      const shotPath = path.join(OUT_DIR, `${lang}_${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      await context.close();
    }
  }

  await browser.close();
  console.log(`\nTest finished. Total errors: ${totalErrors}`);
  if (totalErrors > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
