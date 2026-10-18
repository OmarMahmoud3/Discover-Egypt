const { chromium, devices } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/db916ff9-f0f4-4e58-8e13-e183f73981f3';
const LOCAL_DIR = path.join(__dirname, '..', 'audit-screenshots', 'map-playwright');

[ARTIFACTS_DIR, LOCAL_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function saveScreenshot(page, filename) {
  const localPath = path.join(LOCAL_DIR, filename);
  const artifactPath = path.join(ARTIFACTS_DIR, filename);
  try {
    await page.screenshot({ path: localPath, fullPage: false, timeout: 6000 });
    await page.screenshot({ path: artifactPath, fullPage: false, timeout: 6000 });
    console.log(`  📸 Saved screenshot: ${filename}`);
  } catch (err) {
    console.warn(`  ⚠️ Screenshot warning for ${filename}:`, err.message);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('  STARTING PLAYWRIGHT MAP TESTS: DESKTOP & PHONE');
  console.log('======================================================\n');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-remote-fonts'],
  });

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: DESKTOP DISPLAY (1280 x 850)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Desktop Display (1280x850)');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'ar-EG',
    });
    const desktopPage = await desktopContext.newPage();

    console.log('  Navigating to http://localhost:5173/map on Desktop...');
    await desktopPage.goto(`${BASE_URL}/map`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForSelector('.places-map', { timeout: 8000 });
    await desktopPage.waitForSelector('.custom-map-pin', { timeout: 8000 });
    await desktopPage.waitForTimeout(1000);

    const desktopPinCount = await desktopPage.$$eval('.custom-map-pin', (pins) => pins.length);
    console.log(`  ✓ Desktop Map rendered with ${desktopPinCount} destination markers`);

    await saveScreenshot(desktopPage, 'map_desktop_overview.png');

    // Click marker pin to open rich popup
    console.log('  Clicking a destination pin on Desktop to open popup...');
    await desktopPage.waitForSelector('.leaflet-marker-icon', { timeout: 8000 });
    await desktopPage.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon');
      if (marker) {
        marker.click();
      }
    });

    await desktopPage.waitForSelector('.places-map-popup-card', { timeout: 8000 });
    await desktopPage.waitForTimeout(600);

    const title = await desktopPage.$eval('.places-map-popup-title', (el) => el.textContent.trim());
    console.log(`  ✓ Opened popup for destination: "${title}"`);
    await saveScreenshot(desktopPage, 'map_desktop_popup_opened.png');

    // Filter by city (Luxor / الأقصر)
    console.log('  Testing city filter button (الأقصر) on Desktop...');
    const luxorBtn = await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find((b) => b.textContent.includes('الأقصر'));
      if (found) {
        found.click();
        return true;
      }
      return false;
    });

    if (luxorBtn) {
      await desktopPage.waitForTimeout(800);
      const filteredCount = await desktopPage.$$eval('.custom-map-pin', (p) => p.length);
      console.log(`  ✓ City filter applied: ${filteredCount} markers visible on Luxor region`);
      await saveScreenshot(desktopPage, 'map_desktop_filtered.png');
    }

    await desktopContext.close();

    // -------------------------------------------------------------------------
    // TEST SUITE 2: PHONE DISPLAY (iPhone 15 - 393 x 852)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Phone Display (iPhone 15 - 393x852)');
    const iPhone15 = devices['iPhone 15'];
    const phoneContext = await browser.newContext({
      ...iPhone15,
      locale: 'ar-EG',
    });
    const phonePage = await phoneContext.newPage();

    console.log('  Navigating to http://localhost:5173/map on Phone...');
    await phonePage.goto(`${BASE_URL}/map`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await phonePage.waitForSelector('.places-map', { timeout: 8000 });
    await phonePage.waitForSelector('.custom-map-pin', { timeout: 8000 });
    await phonePage.waitForSelector('.leaflet-tile-loaded', { timeout: 8000 }).catch(() => {});
    await phonePage.waitForTimeout(1200);

    // Measure horizontal scroll overflow
    const overflowMetrics = await phonePage.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });

    console.log(`  ✓ Phone layout width: ${overflowMetrics.clientWidth}px, scrollWidth: ${overflowMetrics.scrollWidth}px (Overflow: ${overflowMetrics.hasOverflow ? 'YES' : 'NONE'})`);

    const bottomNavMap = await phonePage.$('.mobile-bottom-nav');
    console.log(`  ✓ Mobile bottom navigation bar rendered: ${bottomNavMap !== null}`);

    // Verify that the leaflet map fills the entire wrapper with zero gap under the map
    const mapDimensions = await phonePage.evaluate(() => {
      const wrapper = document.querySelector('.places-map-wrapper');
      const leafletMap = document.querySelector('.places-map');
      const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;
      const mapRect = leafletMap ? leafletMap.getBoundingClientRect() : null;
      return {
        wrapperHeight: wrapperRect ? Math.round(wrapperRect.height) : 0,
        mapHeight: mapRect ? Math.round(mapRect.height) : 0,
        gapUnderMap: wrapperRect && mapRect ? Math.round(wrapperRect.bottom - mapRect.bottom) : 0,
      };
    });

    console.log(`  ✓ Map wrapper height: ${mapDimensions.wrapperHeight}px, Leaflet height: ${mapDimensions.mapHeight}px (Gap under map: ${mapDimensions.gapUnderMap}px)`);
    if (mapDimensions.gapUnderMap > 2) {
      throw new Error(`Defect detected: gap under map is ${mapDimensions.gapUnderMap}px!`);
    }

    await phonePage.evaluate(() => {
      const el = document.querySelector('.places-map-wrapper');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: 'instant' });
      }
    });
    await phonePage.waitForTimeout(1000);
    await saveScreenshot(phonePage, 'map_mobile_overview.png');

    // Click marker pin on phone
    console.log('  Clicking destination pin on Phone display...');
    await phonePage.waitForSelector('.leaflet-marker-icon', { timeout: 8000 });
    await phonePage.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon');
      if (marker) marker.click();
    });
    await phonePage.waitForSelector('.places-map-popup-card', { timeout: 8000 });
    await phonePage.waitForTimeout(600);

    const phonePopupTitle = await phonePage.$eval('.places-map-popup-title', (el) => el.textContent.trim());
    console.log(`  ✓ Phone popup opened: "${phonePopupTitle}"`);
    await saveScreenshot(phonePage, 'map_mobile_popup.png');

    // Scroll destination list below map on phone
    await phonePage.evaluate(() => window.scrollBy(0, 420));
    await phonePage.waitForTimeout(400);
    await saveScreenshot(phonePage, 'map_mobile_list_scrolled.png');

    await phoneContext.close();

    // -------------------------------------------------------------------------
    // TEST SUITE 3: /explore MAP TOGGLE ON PHONE & DESKTOP
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] /explore Map View Toggle on Phone Display');
    const explorePhoneContext = await browser.newContext({
      ...iPhone15,
      locale: 'ar-EG',
    });
    const explorePhonePage = await explorePhoneContext.newPage();
    await explorePhonePage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await explorePhonePage.waitForSelector('#explore-view-map-btn', { timeout: 6000 });

    // Click Map Toggle Button
    await explorePhonePage.click('#explore-view-map-btn');
    await explorePhonePage.waitForSelector('#explore-map-container .places-map', { timeout: 8000 });
    await explorePhonePage.waitForTimeout(1000);
    console.log('  ✓ Toggled to Map view on /explore mobile successfully');
    await saveScreenshot(explorePhonePage, 'explore_mobile_map_toggle.png');

    await explorePhoneContext.close();

    console.log('\n======================================================');
    console.log('  ✅ ALL PLAYWRIGHT DESKTOP & PHONE MAP TESTS PASSED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Playwright Test Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
