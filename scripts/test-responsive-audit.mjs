import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5174';

const VIEWPORTS = [
  { name: '320px', width: 320, height: 568 },
  { name: '360px', width: 360, height: 640 },
  { name: '375px', width: 375, height: 667 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1024px', width: 1024, height: 768 },
  { name: '1280px', width: 1280, height: 800 },
];

const ROUTES = [
  { name: 'Home', path: '/' },
  { name: 'Explore', path: '/explore' },
  { name: 'PlaceDetails', path: '/places/giza-pyramids' },
  { name: 'Favorites', path: '/favorites' },
  { name: 'Login', path: '/login' },
  { name: 'AdminDashboard', path: '/admin' },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const issues = [];

  for (const lang of ['ar', 'en']) {
    console.log(`\n================== TESTING IN ${lang.toUpperCase()} ==================`);
    for (const r of ROUTES) {
      for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
        await new Promise((res) => setTimeout(res, 300));

        // Switch language if needed
        if (lang === 'en') {
          await page.evaluate(() => {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', 'en');
            const root = document.querySelector('[data-lang]');
            if (root) {
              root.setAttribute('dir', 'ltr');
              root.setAttribute('data-lang', 'en');
            }
          });
          await new Promise((res) => setTimeout(res, 100));
        }

        const overflow = await page.evaluate((vpWidth) => {
          const docWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const hasOverflow = scrollWidth > docWidth || bodyScrollWidth > docWidth;

          const offending = [];
          if (hasOverflow) {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const rect = el.getBoundingClientRect();
              if (rect.right > docWidth + 1 || rect.left < -1) {
                offending.push({
                  tag: el.tagName.toLowerCase(),
                  className: (el.className && typeof el.className === 'string') ? el.className.slice(0, 40) : '',
                  id: el.id || '',
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                  text: (el.innerText || '').slice(0, 30).replace(/\n/g, ' '),
                });
                if (offending.length >= 4) break;
              }
            }
          }
          return { hasOverflow, docWidth, scrollWidth, bodyScrollWidth, offending };
        }, vp.width);

        if (overflow.hasOverflow) {
          console.log(`❌ [${lang.toUpperCase()}] ${r.name} @ ${vp.name}: OVERFLOW (scrollWidth: ${overflow.scrollWidth} > clientWidth: ${overflow.docWidth})`);
          if (overflow.offending.length > 0) {
            console.log('   Offending elements:', JSON.stringify(overflow.offending));
          }
          issues.push({ lang, route: r.name, viewport: vp.name, overflow });
        } else {
          // console.log(`✓ [${lang.toUpperCase()}] ${r.name} @ ${vp.name}: PASS`);
        }
      }
    }
  }

  await browser.close();
  console.log(`\n\nTotal responsive overflow issues detected: ${issues.length}`);
}

run().catch((e) => {
  console.error('Audit run failed:', e);
});
