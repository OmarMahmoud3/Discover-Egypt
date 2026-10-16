import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve('audit-screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320px-very-small', width: 320, height: 568 },
  { name: '360px-small-android', width: 360, height: 640 },
  { name: '375px-iphone-se', width: 375, height: 667 },
  { name: '390px-iphone-12-14', width: 390, height: 844 },
  { name: '430px-large-phone', width: 430, height: 932 },
  { name: '768px-tablet', width: 768, height: 1024 },
  { name: '1024px-small-laptop', width: 1024, height: 768 },
  { name: '1280px-desktop', width: 1280, height: 800 },
];

async function runAudit() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Audit Home Page at all viewports in Arabic and English
  console.log('\n--- TESTING HOME PAGE AT ALL VIEWPORTS ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });

    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const hasOverflow = scrollWidth > docWidth || bodyScrollWidth > docWidth;

      // Find offending elements if any
      const offending = [];
      if (hasOverflow) {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth || rect.left < 0) {
            offending.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              rect: { left: rect.left, right: rect.right, width: rect.width },
              snippet: (el.innerText || '').slice(0, 40).replace(/\n/g, ' '),
            });
            if (offending.length >= 5) break;
          }
        }
      }

      return {
        docWidth,
        scrollWidth,
        bodyScrollWidth,
        hasOverflow,
        offending,
      };
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Overflow = ${overflowInfo.hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);
    if (overflowInfo.hasOverflow) {
      console.log('  Offending elements:', JSON.stringify(overflowInfo.offending, null, 2));
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `home-${vp.name}.png`),
      fullPage: false,
    });
  }

  // Test Explore, PlaceDetails, Favorites, and Admin
  console.log('\n--- TESTING OTHER ROUTES AT 375px & 768px ---');
  const routes = [
    { name: 'explore', url: 'http://localhost:5173/explore' },
    { name: 'place-details', url: 'http://localhost:5173/places/giza-pyramids' },
    { name: 'favorites', url: 'http://localhost:5173/favorites' },
    { name: 'admin', url: 'http://localhost:5173/admin' },
  ];

  for (const r of routes) {
    for (const w of [375, 768]) {
      await page.setViewport({ width: w, height: 800 });
      await page.goto(r.url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      const info = await page.evaluate(() => ({
        docWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));
      console.log(`Route ${r.name} @ ${w}px: Overflow = ${info.hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'} (scrollWidth: ${info.scrollWidth}, clientWidth: ${info.docWidth})`);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${r.name}-${w}px.png`),
        fullPage: false,
      });
    }
  }

  // Test English LTR mode
  console.log('\n--- TESTING ENGLISH LTR MODE ---');
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  // Click language button or switch to English
  await page.evaluate(() => {
    // If LanguageContext setLanguage is not in window, simulate clicking language toggle
    const langBtn = document.querySelector('.nav-language-btn');
    if (langBtn) langBtn.click();
  });
  await new Promise((res) => setTimeout(res, 500));
  const ltrInfo = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    docWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  console.log(`English LTR @ 375px: dir="${ltrInfo.dir}", Overflow = ${ltrInfo.hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `home-en-375px.png`),
    fullPage: false,
  });

  await browser.close();
  console.log('\nAudit complete! Screenshots saved to', OUTPUT_DIR);
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
