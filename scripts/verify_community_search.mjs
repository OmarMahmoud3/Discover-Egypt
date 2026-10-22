import { chromium } from 'file:///C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/4b5d7016-579f-47c9-9ea6-a5316dc93c31/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser to verify Community search functionality...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'ar-EG',
    });
    const page = await context.newPage();

    // Catch any page errors
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('PAGE CONSOLE ERROR:', msg.text());
    });

    console.log('Navigating to http://localhost:5173/community ...');
    await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });

    // Wait for explorer cards to appear
    await page.waitForSelector('.explorer-card', { timeout: 10000 });

    const initialCards = await page.locator('.explorer-card').count();
    console.log(`Initial total discoverable cards: ${initialCards}`);
    if (initialCards === 0) {
      throw new Error('Expected at least 1 discoverable explorer card initially.');
    }

    // Capture initial unfiltered community view
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '22_desktop_community_open_to_all.png') });

    // Locate the search input
    const searchInput = page.locator('.community-search-input');
    await searchInput.waitFor({ state: 'visible' });

    // 1. Type "مصطفى"
    console.log('Typing "مصطفى" into search input...');
    await searchInput.fill('مصطفى');
    await page.waitForTimeout(300); // Wait for useMemo / render update

    const filteredCardsCount = await page.locator('.explorer-card').count();
    console.log(`Cards visible after searching "مصطفى": ${filteredCardsCount}`);

    const cardName = await page.locator('.explorer-card .explorer-name').first().innerText();
    console.log(`First matching card explorer name: "${cardName}"`);

    const countBadge = await page.locator('.community-results-count').innerText();
    console.log(`Count badge text: "${countBadge}"`);

    if (filteredCardsCount !== 1) {
      throw new Error(`Expected exactly 1 card for "مصطفى", but found ${filteredCardsCount}`);
    }

    if (!cardName.includes('مصطفى')) {
      throw new Error(`Expected card name to include "مصطفى", but got "${cardName}"`);
    }

    // Capture screenshot of filtered state
    const filteredScreenshotPath = path.join(SCREENSHOTS_DIR, '23_community_search_filtered_mustafa.png');
    await page.screenshot({ path: filteredScreenshotPath });
    console.log(`Saved screenshot: ${filteredScreenshotPath}`);

    // 2. Clear the search input
    console.log('Clearing search input...');
    await searchInput.fill('');
    await page.waitForTimeout(300);

    const restoredCardsCount = await page.locator('.explorer-card').count();
    console.log(`Cards visible after clearing search: ${restoredCardsCount}`);
    if (restoredCardsCount !== initialCards) {
      throw new Error(`Expected all ${initialCards} cards to be restored, but found ${restoredCardsCount}`);
    }

    // 3. Test English case-insensitive search "Omar"
    console.log('Testing search for "Omar"...');
    await searchInput.fill('omar');
    await page.waitForTimeout(300);

    const omarCount = await page.locator('.explorer-card').count();
    console.log(`Cards matching "omar": ${omarCount}`);
    if (omarCount === 0) {
      throw new Error('Expected at least 1 matching card for "omar"');
    }

    console.log('✅ ALL Community Search Visual Verifications Passed Successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
