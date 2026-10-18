import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'Mobile 320px', width: 320, height: 568 },
  { name: 'Mobile 360px', width: 360, height: 640 },
  { name: 'Mobile 375px', width: 375, height: 667 },
  { name: 'Mobile 390px', width: 390, height: 844 },
  { name: 'Mobile 430px', width: 430, height: 932 },
  { name: 'Tablet 768px', width: 768, height: 1024 },
  { name: 'Desktop 1024px', width: 1024, height: 768 },
  { name: 'Desktop 1280px', width: 1280, height: 800 },
];

async function runMapAudit() {
  console.log('🚀 Launching Chrome for Interactive Map Validation...');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  } catch (err) {
    console.error('Could not launch Chrome at', CHROME_PATH, err.message);
    process.exit(1);
  }

  const page = await browser.newPage();
  let passedChecks = 0;
  let failedChecks = 0;

  function assertCheck(cond, desc) {
    if (cond) {
      console.log(`  ✓ ${desc}`);
      passedChecks++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failedChecks++;
    }
  }

  try {
    // 1. Audit /map route
    console.log('\n--- TEST 1: Dedicated /map Route ---');
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const mapTitle = await page.$eval('h1', (el) => el.textContent.trim());
    assertCheck(mapTitle.includes('خريطة'), `Map page title loaded correctly: "${mapTitle}"`);

    const mapContainerExists = await page.$('.places-map') !== null;
    assertCheck(mapContainerExists, 'Leaflet MapContainer element (.places-map) is mounted');

    // Wait for markers
    await page.waitForSelector('.custom-map-pin', { timeout: 8000 });
    const pinCount = await page.$$eval('.custom-map-pin', (pins) => pins.length);
    assertCheck(pinCount > 0, `Rendered ${pinCount} destination map markers on Egypt atlas`);

    // Check OpenStreetMap attribution
    const attribution = await page.$eval('.leaflet-control-attribution', (el) => el.textContent.trim());
    assertCheck(attribution.includes('OpenStreetMap'), `OpenStreetMap attribution is present: "${attribution}"`);

    // Click a pin to open popup
    console.log('\n--- TEST 2: Marker Click & Popup Interaction ---');
    const firstPin = await page.$('.custom-map-pin');
    if (firstPin) {
      await firstPin.click();
      await new Promise((r) => setTimeout(r, 600));

      const popupVisible = await page.$('.places-map-popup-card') !== null;
      assertCheck(popupVisible, 'Clicking destination pin opens rich popup card (.places-map-popup-card)');

      const popupTitle = await page.$eval('.places-map-popup-title', (el) => el.textContent.trim());
      assertCheck(popupTitle.length > 0, `Popup displays destination name: "${popupTitle}"`);

      const detailsLink = await page.$('.places-map-popup-link');
      const href = await page.evaluate((el) => el.getAttribute('href'), detailsLink);
      assertCheck(href && href.startsWith('/places/'), `Popup details button links to destination route: "${href}"`);
    }

    // 3. Audit /explore map toggle
    console.log('\n--- TEST 3: /explore Segmented Map Toggle ---');
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const mapToggleBtn = await page.$('#explore-view-map-btn');
    assertCheck(mapToggleBtn !== null, 'Map view toggle button (#explore-view-map-btn) is present on /explore');

    if (mapToggleBtn) {
      await page.evaluate(() => document.getElementById('explore-view-map-btn')?.click());
      await page.waitForSelector('#explore-map-container .places-map', { timeout: 8000 });

      const exploreMapMounted = (await page.$('#explore-map-container .places-map')) !== null;
      assertCheck(exploreMapMounted, 'Toggling to Map view on /explore renders PlacesMap');

      await page.waitForSelector('#explore-map-container .custom-map-pin', { timeout: 8000 });
      const explorePins = await page.$$eval('#explore-map-container .custom-map-pin', (pins) => pins.length);
      assertCheck(explorePins > 0, `PlacesMap on /explore displays ${explorePins} filtered markers`);
    }

    // 4. Viewport Responsiveness & Overflow Test
    console.log('\n--- TEST 4: Responsive Viewport & Overflow Audit ---');
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/map`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        return scrollWidth > docWidth;
      });

      assertCheck(!overflow, `No horizontal scroll overflow at ${vp.name} (${vp.width}x${vp.height})`);
    }

    // 5. English LTR test
    console.log('\n--- TEST 5: English LTR Translation & Layout ---');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'domcontentloaded' });

    // Trigger language toggle
    const langBtn = await page.$('.nav-language-btn');
    if (langBtn) {
      await page.evaluate(() => document.querySelector('.nav-language-btn')?.click());
      await new Promise((r) => setTimeout(r, 600));
      const htmlDir = await page.$eval('html', (el) => el.getAttribute('dir'));
      assertCheck(htmlDir === 'ltr', `Switching language updates HTML document direction to "${htmlDir}"`);
    }

    console.log('\n======================================================');
    console.log(`  AUDIT COMPLETE: ${passedChecks} PASSED, ${failedChecks} FAILED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Audit run error:', err);
    failedChecks++;
  } finally {
    await browser.close();
  }

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMapAudit();
