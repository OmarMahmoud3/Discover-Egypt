const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('audit-screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320px', width: 320, height: 600 },
  { name: '360px', width: 360, height: 640 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1280px', width: 1280, height: 800 },
];

async function runTests() {
  console.log('--- STARTING USER MANAGEMENT & RESPONSIVE VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  // 1. Check Unauthenticated Access to /admin/users
  console.log('\n[TEST I]: Testing unauthenticated access to /admin/users');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1500));
  const pageText = await page.evaluate(() => document.body.innerText);
  const isProtected = pageText.includes('بوابة إدارة المنصة') || pageText.includes('Admin Portal Access') || pageText.includes('تسجيل دخول المسؤول');
  console.log(`Protected Route verification: ${isProtected ? 'PASS (Properly restricted to verified admins)' : 'FAIL'}`);

  // 2. Check Viewport Responsiveness and Horizontal Overflow on /admin/users
  console.log('\n[TEST M]: Checking Viewport Responsiveness & Overflow on /admin/users');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth || document.body.scrollWidth > doc.clientWidth,
      };
    });
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): client=${overflow.clientWidth}, scroll=${overflow.scrollWidth}, overflow=${overflow.hasOverflow ? 'FAIL' : 'PASS (0px overflow)'}`);
  }

  // 3. Check Viewport Responsiveness on Home, Explore, and Login
  console.log('\n[TEST L]: Checking existing features (Home, Explore, Login)');
  for (const route of ['/', '/explore', '/login']) {
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
    const hasNav = await page.$('nav') !== null || await page.$('.navbar') !== null || await page.$('.auth-modal-shell') !== null;
    console.log(`Route ${route} loaded successfully: ${hasNav ? 'PASS' : 'FAIL'}`);
  }

  await browser.close();
  console.log('\n--- VERIFICATION FINISHED ---');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
