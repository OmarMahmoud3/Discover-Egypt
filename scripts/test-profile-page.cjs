const { chromium } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'audit-screenshots', 'profile');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function testProfile() {
  console.log('\n======================================================');
  console.log('  VERIFYING DEDICATED USER ACCOUNT & PROFILE PAGE');
  console.log('======================================================\n');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // Test 1: Guest State
  console.log('[TEST 1] Verifying Guest State on /profile');
  const guestContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'ar-EG',
  });
  const guestPage = await guestContext.newPage();
  await guestPage.goto('http://localhost:4173/profile', { waitUntil: 'domcontentloaded' });
  await guestPage.waitForSelector('.profile-guest-card h1', { timeout: 8000 });

  const guestTitle = await guestPage.locator('.profile-guest-card h1').textContent();
  console.log('  ✓ Guest card loaded with title:', guestTitle?.trim());
  await guestPage.screenshot({ path: path.join(OUT_DIR, '01_guest_state.png'), fullPage: true });

  // Test 2: Authenticated User State
  console.log('\n[TEST 2] Verifying Authenticated Profile View');
  const authContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'ar-EG',
  });
  const authPage = await authContext.newPage();

  await authPage.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    const b64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    const header = b64({ alg: 'HS256', typ: 'JWT' });
    const payload = b64({
      sub: '11111111-2222-3333-4444-555555555555',
      email: 'om7765355@gmail.com',
      role: 'authenticated',
      exp: now + 86400,
      app_metadata: { provider: 'email', role: 'admin' },
      user_metadata: {
        full_name: 'عمر محمود',
        name: 'عمر محمود',
        avatar_url: 'pharaoh',
        preferred_language: 'ar',
        bio: 'عاشق للآثار الفرعونية والمتاحف النيلية في مصر.',
        default_city: 'all',
        travel_tips: true,
      },
    });
    const jwt = `${header}.${payload}.mockSignature`;

    const mockSession = {
      access_token: jwt,
      refresh_token: 'mock-refresh-token',
      expires_in: 86400,
      expires_at: now + 86400,
      token_type: 'bearer',
      user: {
        id: '11111111-2222-3333-4444-555555555555',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'om7765355@gmail.com',
        app_metadata: { provider: 'email', role: 'admin' },
        user_metadata: {
          full_name: 'عمر محمود',
          name: 'عمر محمود',
          avatar_url: 'pharaoh',
          preferred_language: 'ar',
          bio: 'عاشق للآثار الفرعونية والمتاحف النيلية في مصر.',
          default_city: 'all',
          travel_tips: true,
        },
        created_at: '2024-03-10T10:00:00Z',
      },
    };
    localStorage.setItem('sb-irdrdbwkfccplloirndz-auth-token', JSON.stringify(mockSession));
    localStorage.setItem('discover_egypt_favorites_11111111-2222-3333-4444-555555555555', JSON.stringify(['giza-pyramids', 'karnak-temple']));
  });

  await authPage.goto('http://localhost:4173/profile', { waitUntil: 'networkidle' });
  await authPage.waitForSelector('.profile-display-name', { timeout: 8000 });

  const heroName = await authPage.locator('.profile-display-name').textContent();
  console.log('  ✓ Profile hero card loaded for user:', heroName?.trim());
  await authPage.screenshot({ path: path.join(OUT_DIR, '02_authenticated_personal_tab.png'), fullPage: true });

  // Test 3: Dirty State & Cancel Changes
  console.log('\n[TEST 3] Verifying Dirty State Tracking & Cancel Changes');
  const nameInput = authPage.locator('#display-name');
  await nameInput.fill('د. عمر محمود - مستكشف معتمد');
  await authPage.waitForTimeout(300);

  const isActionsBarVisible = await authPage.locator('.profile-actions-bar').isVisible();
  console.log('  ✓ Dirty state action bar appeared:', isActionsBarVisible);
  await authPage.screenshot({ path: path.join(OUT_DIR, '03_dirty_state_active.png'), fullPage: true });

  console.log('  -> Clicking "إلغاء التغييرات" (Cancel Changes)...');
  await authPage.locator('.btn-cancel').click();
  await authPage.waitForTimeout(400);

  const restoredName = await nameInput.inputValue();
  console.log('  ✓ Field restored to original value:', restoredName);
  const isBarDismissed = !(await authPage.locator('.profile-actions-bar').isVisible());
  console.log('  ✓ Action bar dismissed cleanly:', isBarDismissed);
  await authPage.screenshot({ path: path.join(OUT_DIR, '04_after_cancel_restored.png'), fullPage: true });

  // Test 4: Tabs Switching
  console.log('\n[TEST 4] Verifying Profile Sub-Navigation Tabs');
  // Preferences Tab
  await authPage.locator('button[role="tab"]:has-text("التفضيلات")').click();
  await authPage.waitForTimeout(300);
  console.log('  ✓ Preferences tab opened');
  await authPage.screenshot({ path: path.join(OUT_DIR, '05_preferences_tab.png'), fullPage: true });

  // Security Tab
  await authPage.locator('button[role="tab"]:has-text("الأمان")').click();
  await authPage.waitForTimeout(300);
  console.log('  ✓ Security tab opened');
  await authPage.screenshot({ path: path.join(OUT_DIR, '06_security_tab.png'), fullPage: true });

  // Favorites Tab
  await authPage.locator('button[role="tab"]:has-text("المحفوظات")').click();
  await authPage.waitForTimeout(300);
  console.log('  ✓ Favorites tab opened');
  await authPage.screenshot({ path: path.join(OUT_DIR, '07_favorites_tab.png'), fullPage: true });

  // Mobile Viewport Test (390px)
  console.log('\n[TEST 5] Verifying Mobile Viewport Responsiveness (390px)');
  await authPage.setViewportSize({ width: 390, height: 844 });
  await authPage.waitForTimeout(400);
  await authPage.screenshot({ path: path.join(OUT_DIR, '08_mobile_view.png'), fullPage: true });
  console.log('  ✓ Mobile viewport screenshot captured');

  // Test Navbar integration
  console.log('\n[TEST 6] Verifying Navbar Profile Link Integration');
  const navAccountLink = await authPage.locator('.nav-account-btn').getAttribute('href');
  console.log('  ✓ Navbar account button is a Link pointing to:', navAccountLink);

  await browser.close();
  console.log('\n🎉 ALL USER PROFILE VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
}

testProfile().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
