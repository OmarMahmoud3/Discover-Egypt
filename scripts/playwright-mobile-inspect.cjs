const { chromium, devices } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const iPhone = devices['iPhone 15'];
const BASE_URL = 'http://localhost:5174';
const OUT_DIR = path.join(__dirname, '..', 'audit-screenshots', 'playwright-mobile');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    ...iPhone,
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  const pagesToTest = [
    { url: `${BASE_URL}/`, name: '01_home_iphone15' },
    { url: `${BASE_URL}/explore`, name: '02_explore_iphone15' },
    { url: `${BASE_URL}/places/giza-pyramids`, name: '03_place_details_iphone15' },
    { url: `${BASE_URL}/favorites`, name: '04_favorites_iphone15' },
  ];

  console.log('--- Starting Playwright Mobile Inspection on iPhone 15 ---');

  for (const p of pagesToTest) {
    console.log(`Navigating to: ${p.url}`);
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(600);

    // Measure document scrollWidth vs clientWidth
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        overflowElements: Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.right > doc.clientWidth + 2 || rect.left < -2;
          })
          .map(el => ({
            tag: el.tagName,
            class: el.className,
            id: el.id,
            rect: el.getBoundingClientRect(),
          }))
          .slice(0, 5),
      };
    });

    console.log(`[${p.name}] Viewport: ${metrics.viewportWidth}x${metrics.viewportHeight}, ScrollWidth: ${metrics.scrollWidth}, Overflow count: ${metrics.overflowElements.length}`);
    if (metrics.overflowElements.length > 0) {
      console.log('Overflow elements:', JSON.stringify(metrics.overflowElements, null, 2));
    }

    const shotPath = path.join(OUT_DIR, `${p.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  await browser.close();
  console.log('--- Playwright Mobile Inspection Complete ---');
}

run().catch(err => {
  console.error('Playwright execution error:', err);
  process.exit(1);
});
