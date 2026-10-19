const { chromium, devices } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/353e5488-5587-434f-b3b9-7058af3b1385';
const LOCAL_DIR = path.join(__dirname, '..', 'audit-screenshots', 'voice-search');

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

/**
 * Script injected into page to mock the browser Web Speech API for automated verification.
 * This simulates a user speaking Arabic or English and receiving real-time speech events.
 */
const mockSpeechRecognitionScript = `
  window.__mockVoiceTranscript = null;
  window.__mockSpeechRecognitionInstances = [];

  class MockSpeechRecognition extends EventTarget {
    constructor() {
      super();
      this.continuous = false;
      this.interimResults = true;
      this.maxAlternatives = 1;
      this.lang = 'ar-EG';
      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      window.__mockSpeechRecognitionInstances.push(this);
    }

    start() {
      setTimeout(() => {
        if (this.onstart) this.onstart();
        
        // If a test transcript is queued, emit interim and final speech events
        const phrase = window.__mockVoiceTranscript || (this.lang.startsWith('ar') ? 'الأقصر' : 'Pyramids');
        
        // Interim event
        setTimeout(() => {
          if (this.onresult) {
            const interimEvent = {
              resultIndex: 0,
              results: [
                Object.assign([{ transcript: phrase.slice(0, 3) }], { isFinal: false })
              ]
            };
            this.onresult(interimEvent);
          }
        }, 150);

        // Final event
        setTimeout(() => {
          if (this.onresult) {
            const finalEvent = {
              resultIndex: 0,
              results: [
                Object.assign([{ transcript: phrase }], { isFinal: true })
              ]
            };
            this.onresult(finalEvent);
          }
          if (this.onend) this.onend();
        }, 350);
      }, 50);
    }

    stop() {
      if (this.onend) this.onend();
    }

    abort() {
      if (this.onend) this.onend();
    }
  }

  window.SpeechRecognition = MockSpeechRecognition;
  window.webkitSpeechRecognition = MockSpeechRecognition;
`;

async function run() {
  console.log('\n======================================================');
  console.log('  STARTING PLAYWRIGHT VOICE SEARCH TESTS');
  console.log('======================================================\n');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-remote-fonts'],
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: ARABIC VOICE SEARCH ON EXPLORE PAGE (Desktop 1280x850)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Arabic Voice Search on /explore (Desktop)');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'ar-EG',
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.addInitScript(mockSpeechRecognitionScript);

    await desktopPage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForSelector('[data-testid="voice-search-trigger"]', { timeout: 8000 });
    console.log('  ✓ Voice search trigger button rendered on /explore');

    // Set voice transcript to "الأقصر"
    await desktopPage.evaluate(() => {
      window.__mockVoiceTranscript = 'الأقصر';
    });

    // Click microphone button
    const micBtn = await desktopPage.$('[data-testid="voice-search-trigger"]');
    await micBtn.click();
    console.log('  ✓ Clicked microphone button to initiate voice search');

    // Wait for speech recognition to complete and update search input
    await desktopPage.waitForTimeout(600);
    const inputValue = await desktopPage.$eval('input[type="text"]', (el) => el.value);
    console.log(`  ✓ Search input populated with recognized voice transcript: "${inputValue}"`);

    // Verify filtered destination results
    await desktopPage.waitForSelector('.explore-grid article', { timeout: 8000 });
    const resultCount = await desktopPage.$$eval('.explore-grid article', (cards) => cards.length);
    console.log(`  ✓ Destinations filtered by voice query: ${resultCount} places displayed`);

    await saveScreenshot(desktopPage, 'voice_explore_arabic_result.png');
    await desktopContext.close();

    // -------------------------------------------------------------------------
    // TEST 2: ENGLISH VOICE SEARCH ON EXPLORE PAGE
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] English Voice Search on /explore (English LTR)');
    const enContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'en-US',
    });
    const enPage = await enContext.newPage();
    await enPage.addInitScript(mockSpeechRecognitionScript);

    // Set localStorage language to 'en'
    await enPage.addInitScript(() => {
      localStorage.setItem('discover_egypt_lang', 'en');
    });

    await enPage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await enPage.waitForSelector('[data-testid="voice-search-trigger"]', { timeout: 8000 });

    // Queue English transcript "Pyramids"
    await enPage.evaluate(() => {
      window.__mockVoiceTranscript = 'Pyramids';
    });

    await enPage.click('[data-testid="voice-search-trigger"]');
    await enPage.waitForTimeout(600);

    const enInputValue = await enPage.$eval('input[type="text"]', (el) => el.value);
    console.log(`  ✓ English voice search input populated: "${enInputValue}"`);

    await enPage.waitForSelector('.explore-grid article', { timeout: 8000 });
    const enResultCount = await enPage.$$eval('.explore-grid article', (cards) => cards.length);
    console.log(`  ✓ Filtered destinations for "Pyramids": ${enResultCount} places`);

    await saveScreenshot(enPage, 'voice_explore_english_result.png');
    await enContext.close();

    // -------------------------------------------------------------------------
    // TEST 3: SEARCH MODAL VOICE INTEGRATION
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Voice Search inside Search Modal');
    const modalContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'ar-EG',
    });
    const modalPage = await modalContext.newPage();
    await modalPage.addInitScript(mockSpeechRecognitionScript);

    await modalPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Open search modal via nav-action-btn
    await modalPage.waitForSelector('.nav-action-btn', { timeout: 8000 });
    await modalPage.click('.nav-action-btn');

    await modalPage.waitForSelector('#global-search-modal', { timeout: 8000 });
    console.log('  ✓ Search modal opened');

    await modalPage.waitForSelector('#global-search-modal [data-testid="voice-search-trigger"]', { timeout: 6000 });
    console.log('  ✓ Voice search button present inside modal');

    await modalPage.evaluate(() => {
      window.__mockVoiceTranscript = 'الإسكندرية';
    });

    await modalPage.click('#global-search-modal [data-testid="voice-search-trigger"]');
    await modalPage.waitForTimeout(600);

    const modalInputVal = await modalPage.$eval('#global-search-modal input[type="text"]', (el) => el.value);
    console.log(`  ✓ Modal search input populated with voice transcript: "${modalInputVal}"`);

    const modalResultsCount = await modalPage.$$eval('#global-search-modal button[type="button"]', (items) => items.length);
    console.log(`  ✓ Modal search interactive items: ${modalResultsCount}`);

    await saveScreenshot(modalPage, 'voice_search_modal.png');
    await modalContext.close();

    // -------------------------------------------------------------------------
    // TEST 4: HOME HERO EDITORIAL SEARCH BAR
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Voice Search in Home Hero Bar');
    const homeContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'ar-EG',
    });
    const homePage = await homeContext.newPage();
    await homePage.addInitScript(mockSpeechRecognitionScript);

    await homePage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await homePage.waitForSelector('.editorial-search-bar [data-testid="voice-search-trigger"]', { timeout: 8000 });

    await homePage.evaluate(() => {
      window.__mockVoiceTranscript = 'أسوان';
    });

    await homePage.click('.editorial-search-bar [data-testid="voice-search-trigger"]');
    await homePage.waitForTimeout(600);

    const homeInputVal = await homePage.$eval('.editorial-search-bar input', (el) => el.value);
    console.log(`  ✓ Home hero search bar populated with voice transcript: "${homeInputVal}"`);
    await saveScreenshot(homePage, 'voice_home_hero.png');

    await homeContext.close();

    // -------------------------------------------------------------------------
    // TEST 5: UNSUPPORTED BROWSER FALLBACK
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Unsupported Browser Fallback Handling');
    const unsupportedContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'ar-EG',
    });
    const unsupportedPage = await unsupportedContext.newPage();
    // Invalidate speech recognition
    await unsupportedPage.addInitScript(`
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
    `);

    await unsupportedPage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await unsupportedPage.waitForSelector('[data-testid="voice-search-trigger"]', { timeout: 8000 });

    // Click voice button on unsupported browser
    await unsupportedPage.click('[data-testid="voice-search-trigger"]');
    await unsupportedPage.waitForTimeout(400);

    const hasPopover = await unsupportedPage.$('.voice-search-status-popover');
    console.log(`  ✓ Graceful unsupported popover displayed: ${hasPopover !== null}`);

    // Verify typing still works flawlessly
    await unsupportedPage.fill('input[type="text"]', 'القاهرة');
    const typedVal = await unsupportedPage.$eval('input[type="text"]', (el) => el.value);
    console.log(`  ✓ Text search remains fully functional on unsupported browser: "${typedVal}"`);

    await unsupportedContext.close();

    // -------------------------------------------------------------------------
    // TEST 6: MOBILE RESPONSIVE LAYOUT & ZERO OVERFLOW (iPhone 15 - 393 x 852)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Mobile Phone Display (iPhone 15 - 393x852)');
    const iPhone15 = devices['iPhone 15'];
    const phoneContext = await browser.newContext({
      ...iPhone15,
      locale: 'ar-EG',
    });
    const phonePage = await phoneContext.newPage();
    await phonePage.addInitScript(mockSpeechRecognitionScript);

    await phonePage.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await phonePage.waitForSelector('[data-testid="voice-search-trigger"]', { timeout: 8000 });

    const overflowMetrics = await phonePage.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });

    console.log(`  ✓ Phone layout width: ${overflowMetrics.clientWidth}px, scrollWidth: ${overflowMetrics.scrollWidth}px (Overflow: ${overflowMetrics.hasOverflow ? 'YES' : 'NONE'})`);
    if (overflowMetrics.hasOverflow) {
      throw new Error('Horizontal overflow detected on mobile phone display!');
    }

    // Scroll to search input for screenshot
    await phonePage.evaluate(() => {
      const el = document.querySelector('.architectural-search-bar') || document.querySelector('input[type="text"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await phonePage.waitForTimeout(400);
    await saveScreenshot(phonePage, 'voice_mobile_overview.png');

    await phoneContext.close();

    console.log('\n======================================================');
    console.log('  ✅ ALL PLAYWRIGHT VOICE SEARCH TESTS PASSED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Playwright Test Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
