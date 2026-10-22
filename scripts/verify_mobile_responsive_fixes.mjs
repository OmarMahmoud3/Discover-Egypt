import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/4b5d7016-579f-47c9-9ea6-a5316dc93c31/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const TEST_USER = {
  id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
  email: 'omar@discoveregypt.com',
  name: 'Omar Mahmoud',
  avatar_url: 'pharaoh',
  interests: ['الآثار الفرعونية', 'المتاحف والتاريخ المصري'],
};

async function main() {
  console.log('🚀 Starting Mobile Responsiveness Verification using Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // 1. Viewport iPhone 13/14 (390 x 844)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Navigate and inject test user
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((u) => {
    const sessionData = {
      access_token: 'valid-test-token',
      refresh_token: 'valid-test-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      user: {
        id: u.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: u.email,
        user_metadata: {
          full_name: u.name,
          name: u.name,
          avatar_url: u.avatar_url,
          interests: u.interests,
          is_public: true,
          contact_preference: 'in_app',
        },
      },
    };
    localStorage.setItem('discover_egypt_test_session', JSON.stringify(sessionData));
  }, TEST_USER);

  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Capture Main Mobile Community page (checking banner & nav tabs)
  const shot1 = path.join(SCREENSHOTS_DIR, '21_mobile_community_tabs_fixed.png');
  await page.screenshot({ path: shot1 });
  console.log('📸 Captured:', shot1);

  // Inspect community nav tabs
  const tabsEvaluation = await page.evaluate(() => {
    const nav = document.querySelector('.community-nav-tabs');
    const buttons = Array.from(document.querySelectorAll('.community-tab-btn'));
    return {
      navScrollWidth: nav?.scrollWidth,
      navClientWidth: nav?.clientWidth,
      buttons: buttons.map(b => ({
        text: b.innerText.trim().replace(/\n/g, ' '),
        width: b.getBoundingClientRect().width,
        height: b.getBoundingClientRect().height,
      })),
      hasHorizontalOverflow: nav ? nav.scrollWidth > nav.clientWidth + 2 : false,
    };
  });
  console.log('📊 Tabs evaluation on 390px mobile:', tabsEvaluation);

  // 2. Open Safe Connect Modal while on Explorers tab
  try {
    await page.waitForSelector('.explorer-card', { timeout: 8000 });
  } catch (e) {
    console.warn('Timed out waiting for .explorer-card');
  }
  const connectBtn = await page.$('.explorer-card .connect-btn');
  if (connectBtn) {
    console.log('👉 Clicking connect button on explorer card...');
    await connectBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    const shot3 = path.join(SCREENSHOTS_DIR, '23_mobile_safe_connect_modal_fixed.png');
    await page.screenshot({ path: shot3 });
    console.log('📸 Captured Safe Connect modal:', shot3);

    const modalMetrics = await page.evaluate(() => {
      const modal = document.querySelector('.connect-modal-card');
      const actions = document.querySelector('.connect-modal-actions');
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      const modalRect = modal?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      const navRect = bottomNav?.getBoundingClientRect();
      return {
        viewportHeight: window.innerHeight,
        modalHeight: modalRect?.height,
        modalBottom: modalRect?.bottom,
        actionsBottom: actionsRect?.bottom,
        actionsVisibleWithinViewport: actionsRect ? actionsRect.bottom <= window.innerHeight + 1 : false,
        actionsZIndex: window.getComputedStyle(actions).zIndex,
        backdropZIndex: window.getComputedStyle(document.querySelector('.connect-modal-backdrop')).zIndex,
        bottomNavZIndex: bottomNav ? window.getComputedStyle(bottomNav).zIndex : 'none',
      };
    });
    console.log('📊 Modal metrics on mobile:', modalMetrics);

    // Close modal
    const closeBtn = await page.$('.connect-modal-close');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // 3. Switch to "الطلبات" tab
  const tabBtns = await page.$$('.community-tab-btn');
  if (tabBtns.length >= 2) {
    await tabBtns[1].click();
    await new Promise((r) => setTimeout(r, 800));
    const shot2 = path.join(SCREENSHOTS_DIR, '22_mobile_requests_tab_active.png');
    await page.screenshot({ path: shot2 });
    console.log('📸 Captured requests tab:', shot2);
  }

  // 3. Open DB Setup Schema Modal
  const dbNoticeBtn = await page.$('.community-db-notice-btn');
  if (dbNoticeBtn) {
    console.log('👉 Opening DB Setup modal...');
    await dbNoticeBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    const shot4 = path.join(SCREENSHOTS_DIR, '24_mobile_db_setup_modal.png');
    await page.screenshot({ path: shot4 });
    console.log('📸 Captured DB Setup modal:', shot4);

    const dbCloseBtn = await page.$('.db-modal-card .connect-modal-close');
    if (dbCloseBtn) {
      await dbCloseBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // 4. Test iPhone SE (375 x 667)
  console.log('📱 Testing iPhone SE (375 x 667)...');
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  const shot5 = path.join(SCREENSHOTS_DIR, '25_mobile_iphone_se_375px.png');
  await page.screenshot({ path: shot5 });
  console.log('📸 Captured iPhone SE view:', shot5);

  const connectBtnSmall = await page.$('.explorer-card .connect-btn');
  if (connectBtnSmall) {
    await connectBtnSmall.click();
    await new Promise((r) => setTimeout(r, 1000));
    const shot6 = path.join(SCREENSHOTS_DIR, '26_mobile_iphone_se_modal.png');
    await page.screenshot({ path: shot6 });
    console.log('📸 Captured iPhone SE Safe Connect modal:', shot6);
  }

  await browser.close();
  console.log('🎉 Verification finished successfully!');
}

main().catch((err) => {
  console.error('❌ Error during verification:', err);
  process.exit(1);
});
