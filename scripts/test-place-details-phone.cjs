const { chromium, devices } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5174/places/giza-pyramids';
const OUT_DIR = path.join(__dirname, '..', 'audit-screenshots', 'place-details-phone');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function testPlaceDetails() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const viewports = [
    { name: 'small_320', width: 320, height: 568 },
    { name: 'android_360', width: 360, height: 740 },
    { name: 'iphoneSE_375', width: 375, height: 667 },
    { name: 'iphone15_393', width: 393, height: 852 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
      locale: 'ar-EG',
    });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Measure key elements
    const report = await page.evaluate(() => {
      const breadcrumb = document.querySelector('.place-details-page > div:first-child');
      const gallery = document.querySelector('section');
      const badges = document.querySelector('section .badge');
      const bottomBar = document.querySelector('.place-details-bar');
      const dots = document.querySelectorAll('button[aria-label^="Show photo"]');
      const doc = document.documentElement;

      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        hasHorizontalScroll: doc.scrollWidth > doc.clientWidth,
        breadcrumbRect: breadcrumb?.getBoundingClientRect(),
        galleryRect: gallery?.getBoundingClientRect(),
        bottomBarRect: bottomBar?.getBoundingClientRect(),
        dotsCount: dots.length,
        dotsHeights: Array.from(dots).map(d => ({
          w: d.getBoundingClientRect().width,
          h: d.getBoundingClientRect().height
        })),
        fixedElements: Array.from(document.querySelectorAll('*'))
          .filter(el => getComputedStyle(el).position === 'fixed')
          .map(el => ({
            tag: el.tagName,
            class: el.className,
            bottom: getComputedStyle(el).bottom,
            top: getComputedStyle(el).top,
            height: el.getBoundingClientRect().height,
          })),
      };
    });

    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    console.log(`Has horizontal scroll: ${report.hasHorizontalScroll} (Client: ${report.clientWidth}, Scroll: ${report.scrollWidth})`);
    console.log(`Bottom Bar:`, report.bottomBarRect);
    console.log(`Fixed Elements:`, report.fixedElements);
    console.log(`Gallery dots sizes:`, report.dotsHeights);

    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_top.png`), fullPage: false });
    // Scroll down to middle
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_mid.png`), fullPage: false });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}_bottom.png`), fullPage: false });

    await context.close();
  }

  await browser.close();
  console.log('PlaceDetails phone inspection complete. Screenshots saved.');
}

testPlaceDetails().catch(console.error);
