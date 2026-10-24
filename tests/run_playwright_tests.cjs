let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  try {
    ({ chromium } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright'));
  } catch (err) {
    console.error('Playwright could not be loaded. Please install playwright locally or globally.', err?.message);
    process.exit(0);
  }
}

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'test-results', 'screenshots');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.join(__dirname, 'test-results', 'artifacts');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const requestFailures = [];

  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  page.on('pageerror', err => {
    pageErrors.push({
      message: err.message,
      stack: err.stack
    });
  });

  page.on('requestfailed', req => {
    requestFailures.push({
      url: req.url(),
      failure: req.failure()?.errorText
    });
  });

  const testReport = {
    steps: [],
    issuesFound: [],
    consoleLogs: [],
    pageErrors: [],
    requestFailures: [],
    screenshots: []
  };

  async function takeScreenshot(name, caption) {
    const filename = `${name}.png`;
    const localPath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: localPath, fullPage: false });
    
    // Copy to artifact dir for report embedding
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    try {
      fs.copyFileSync(localPath, artifactPath);
    } catch (e) {
      console.error('Failed to copy to artifact dir:', e);
    }

    testReport.screenshots.push({ name, caption, filename, localPath, artifactPath });
    console.log(`[Screenshot saved]: ${filename}`);
  }

  try {
    console.log('--- Step 1: Visiting Home Page ---');
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);
    await page.waitForTimeout(1000);
    await takeScreenshot('01_home_ar', 'الصفحة الرئيسية باللغة العربية (الافتراضية)');

    // Check raw translation keys on Home Page
    const rawKeys = await page.$$eval('*', els => {
      const issues = [];
      for (const el of els) {
        const title = el.getAttribute('title');
        const ariaLabel = el.getAttribute('aria-label');
        if (title && (title.includes('home.') || title.includes('places.') || title.includes('common.'))) {
          issues.push({ type: 'title', value: title, text: el.innerText });
        }
        if (ariaLabel && (ariaLabel.includes('home.') || ariaLabel.includes('places.') || ariaLabel.includes('common.'))) {
          issues.push({ type: 'aria-label', value: ariaLabel, text: el.innerText });
        }
      }
      return issues;
    });

    if (rawKeys.length > 0) {
      testReport.issuesFound.push({
        severity: 'Medium',
        category: 'i18n / Translation',
        title: 'مفاتيح ترجمة خام غير مترجمة في أزرار المفضلة',
        details: `تم العثور على سمات تحمل مفاتيح الترجمة كما هي: ${JSON.stringify(rawKeys)}`
      });
    }

    console.log('--- Step 2: Testing Language Switch to English ---');
    // Find language switcher button
    const langBtn = await page.locator('button:has-text("English"), button:has-text("العربية")').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(800);
      const currentDir = await page.getAttribute('div[dir]', 'dir');
      const currentLang = await page.getAttribute('div[data-lang]', 'data-lang');
      console.log(`Switched to Lang: ${currentLang}, Dir: ${currentDir}`);
      await takeScreenshot('02_home_en', 'الصفحة الرئيسية بعد التبديل للغة الإنجليزية');
      
      // Switch back to Arabic
      const arBtn = await page.locator('button:has-text("العربية"), button:has-text("Arabic")').first();
      if (await arBtn.isVisible()) {
        await arBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.warn('Language button not found');
    }

    console.log('--- Step 3: Testing Search & Quick Destination Buttons ---');
    const searchInput = page.locator('input[type="text"], input[placeholder*="ابحث"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('أهرامات');
      await page.waitForTimeout(500);
    }

    const quickCityBtn = page.locator('button:has-text("الأقصر")').first();
    if (await quickCityBtn.isVisible()) {
      await quickCityBtn.click();
      await page.waitForTimeout(600);
    }
    await takeScreenshot('03_search_filter', 'اختبار شريط البحث وأزرار الوجهات السريعة (الأقصر)');

    console.log('--- Step 4: Testing Favorite Button Toggle ---');
    const favButtons = page.locator('button:has-text("favorite"), button:has-text("favorite_border")');
    const favCount = await favButtons.count();
    console.log(`Found ${favCount} favorite buttons on page`);
    if (favCount > 0) {
      // Click first favorite button to toggle
      await favButtons.first().click();
      await page.waitForTimeout(500);
      await takeScreenshot('04_favorite_toggle', 'تبديل حالة الإضافة/الحذف من المفضلة في البطاقات');
    }

    console.log('--- Step 5: Testing Explore Page (/explore) ---');
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(800);
    await takeScreenshot('05_explore_page', 'صفحة استكشاف المعالم (/explore)');

    // Test filters on Explore page
    const filterButtons = page.locator('button:has-text("فرعونية"), button:has-text("إسلامية"), button:has-text("طبيعية")');
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
      await takeScreenshot('05b_explore_filtered', 'تطبيق تصنيف فرعونية في صفحة الاستكشاف');
    }

    console.log('--- Step 6: Testing Place Details Page (/places/giza-pyramids) ---');
    await page.goto(`${BASE_URL}/places/giza-pyramids`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(800);
    await takeScreenshot('06_place_details', 'صفحة تفاصيل المعلم (/places/giza-pyramids)');

    // Check if there is a review or rating form
    const reviewForm = page.locator('form, textarea');
    if (await reviewForm.count() > 0) {
      console.log('Found review form/textarea on details page');
    }

    console.log('--- Step 7: Testing Favorites Page (/favorites) ---');
    await page.goto(`${BASE_URL}/favorites`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(800);
    await takeScreenshot('07_favorites_page', 'صفحة الأماكن المفضلة المحفوظة (/favorites)');

    console.log('--- Step 8: Testing Auth / Login Modal ---');
    // Open login modal via navbar button
    const loginNavBtn = page.locator('button:has-text("دخول"), button:has-text("Log in"), button:has-text("تسجيل الدخول")').first();
    if (await loginNavBtn.isVisible()) {
      await loginNavBtn.click();
      await page.waitForTimeout(600);
      await takeScreenshot('08_login_modal', 'نافذة تسجيل الدخول المنبثقة (Auth Modal)');

      // Test filling in the login form with dummy data to test validation
      const emailInput = page.locator('input[type="email"]');
      const passInput = page.locator('input[type="password"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill('invalid-email');
        const submitBtn = page.locator('button[type="submit"]');
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(500);
          await takeScreenshot('08b_login_validation', 'التحقق من صحة مدخلات نموذج الدخول (Form Validation)');
        }
      }

      // Close modal specifically using the button inside .auth-modal-shell or pressing Escape / clicking backdrop
      const closeBtn = page.locator('.auth-modal-shell button').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
      
      const backdrop = page.locator('div[style*="rgba(18, 48, 74, 0.65)"]');
      if (await backdrop.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        if (await backdrop.isVisible()) {
          await page.mouse.click(10, 10);
          await page.waitForTimeout(300);
        }
      }
    }

    console.log('--- Step 9: Testing Admin Route Guard (/admin) ---');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    const adminUrl = page.url();
    console.log(`Navigated to /admin, current URL is: ${adminUrl}`);
    await takeScreenshot('09_admin_unauthorized', 'محاولة الوصول إلى لوحة الإدارة (/admin) لغير المصرح لهم');

    console.log('--- Step 10: Testing 404 Not Found Page (/nonexistent-route) ---');
    await page.goto(`${BASE_URL}/nonexistent-route`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1000);
    await takeScreenshot('10_not_found', 'صفحة الخطأ 404 (الصفحة غير موجودة)');

    // Test back home button on 404
    const backHomeBtn = page.locator('a[href="/"], button:has-text("الرئيسية"), a:has-text("الرئيسية")').first();
    if (await backHomeBtn.isVisible()) {
      await backHomeBtn.click();
      await page.waitForTimeout(1000);
    }

    console.log('--- Step 11: Testing Mobile Viewport (iPhone 14) ---');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1200);
    await takeScreenshot('11_mobile_view', 'معاينة الواجهة على الهاتف المحمول (Mobile Viewport)');

    // Test Mobile navigation drawer
    const menuBtn = page.locator('button[aria-label*="قائمة"], button[aria-label*="menu"], button:has-text("menu")').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(600);
      await takeScreenshot('12_mobile_menu_drawer', 'قائمة التنقل الجانبية للهاتف المحمول (Mobile Drawer)');
    }

  } catch (err) {
    console.error('Test execution error:', err);
    testReport.executionError = err.message;
  } finally {
    testReport.consoleLogs = consoleLogs;
    testReport.pageErrors = pageErrors;
    testReport.requestFailures = requestFailures;

    fs.writeFileSync(
      path.join(__dirname, 'test-results', 'test-summary.json'),
      JSON.stringify(testReport, null, 2),
      'utf-8'
    );

    console.log('--- Finished all tests ---');
    await browser.close();
  }
}

run().catch(console.error);
