import { chromium } from 'file:///C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/4b5d7016-579f-47c9-9ea6-a5316dc93c31/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chrome browser for Authenticated Community visual verification...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  // Navigate to site to set origin
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });

  // Inject authenticated Supabase session
  await page.evaluate(() => {
    const sessionData = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      user: {
        id: 'user-ahmed-demo',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'ahmed.explorer@discoveregypt.com',
        user_metadata: {
          full_name: 'أحمد مستكشف',
          name: 'أحمد مستكشف',
          avatar_url: 'pharaoh',
          bio: 'عاشق للحضارة الفرعونية وتوثيق معابد الأقصر وأسوان',
          interests: ['الآثار الفرعونية', 'التصوير والتوثيق', 'جولات النيل والفلوكة'],
          is_public: true,
          contact_preference: 'in_app',
        },
      },
    };
    localStorage.setItem('sb-irdrdbwkfccplloirndz-auth-token', JSON.stringify(sessionData));
  });

  // 1. Authenticated Community Directory with Shared Interests highlighted
  console.log('Navigating to Community as authenticated user...');
  await page.goto('http://localhost:5174/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Capture screenshot: Community Directory with Shared Interests pills & stars
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_community_desktop.png') });
  console.log('Captured: 09_community_desktop.png (Authenticated with shared matches)');

  // 2. Open Safe Connect Modal on Salma El-Naggar (has shared interests)
  console.log('Opening Safe Connect Modal...');
  const connectBtn = page.locator('.explorer-connect-btn').first();
  await connectBtn.click();
  await page.waitForTimeout(400);

  // Capture screenshot: Safe Connect Modal with pre-filled message, purpose chips, icebreakers
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_safe_connect_modal.png') });
  console.log('Captured: 12_safe_connect_modal.png (Safe Connect Modal open)');

  // Click an icebreaker suggestion to populate custom text
  const icebreaker = page.locator('.icebreaker-btn').first();
  if (await icebreaker.isVisible()) {
    await icebreaker.click();
    await page.waitForTimeout(200);
  }

  // Submit the connection request
  const submitBtn = page.locator('.connect-btn-submit');
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForTimeout(500);
  }

  // Capture screenshot: Confirmation toast and "تم إرسال الطلب ✓" button
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_request_sent_success.png') });
  console.log('Captured: 13_request_sent_success.png (Request sent confirmation)');

  // 3. Authenticated Profile Interests Tab
  console.log('Navigating to /profile?tab=interests...');
  await page.goto('http://localhost:5174/profile?tab=interests', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Capture screenshot: 5th tab (الاهتمامات والتواصل)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_profile_interests_tab.png') });
  console.log('Captured: 14_profile_interests_tab.png (Profile Interests Tab)');

  // Add custom interest to trigger dirty-state bar
  const customInput = page.locator('input[placeholder="إضافة اهتمام جديد"]');
  if (await customInput.isVisible()) {
    await customInput.fill('مراقبة النجوم بالصحراء البيضاء');
    await page.locator('button', { hasText: 'إضافة' }).click();
    await page.waitForTimeout(300);
  }

  // Capture screenshot: Dirty state with sticky save/cancel bar
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_profile_interests_dirty_bar.png') });
  console.log('Captured: 15_profile_interests_dirty_bar.png (Dirty state action bar)');

  // 4. Mobile View of Community
  console.log('Testing Mobile View...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ar-EG',
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(() => {
    const sessionData = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      user: {
        id: 'user-ahmed-demo',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'ahmed.explorer@discoveregypt.com',
        user_metadata: {
          full_name: 'أحمد مستكشف',
          name: 'أحمد مستكشف',
          avatar_url: 'pharaoh',
          interests: ['الآثار الفرعونية', 'التصوير والتوثيق'],
        },
      },
    };
    localStorage.setItem('sb-irdrdbwkfccplloirndz-auth-token', JSON.stringify(sessionData));
  });

  await mobilePage.goto('http://localhost:5174/community', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(500);

  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile: clientWidth=${clientWidth}px, scrollWidth=${scrollWidth}px`);

  await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_community_mobile_view.png') });
  console.log('Captured: 16_community_mobile_view.png');

  await browser.close();
  console.log('All authenticated screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during verification:', err);
  process.exit(1);
});
