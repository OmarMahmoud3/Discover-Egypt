const { chromium, devices } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');

const iPhone = devices['iPhone 15'];
const BASE_URL = 'http://localhost:5174';

async function diagnose() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ ...iPhone, locale: 'ar-EG' });
  const page = await context.newPage();

  console.log('=== Diagnosing Home Page ===');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const homeOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return (rect.right > doc.clientWidth + 1 || rect.left < -1) && !el.closest('[style*="overflow-x: auto"], [style*="overflow-x: scroll"], .category-scroll-container');
      })
      .map(el => ({
        tag: el.tagName,
        class: el.className,
        outerHTML: el.outerHTML.slice(0, 150),
        rect: { left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width },
      }));
  });
  console.log('Home non-scrollable overflow:', homeOverflow);

  console.log('=== Diagnosing Favorites Page ===');
  await page.goto(`${BASE_URL}/favorites`, { waitUntil: 'networkidle' });
  const favOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return (rect.right > doc.clientWidth + 1 || rect.left < -1) && !el.closest('[style*="overflow-x: auto"], [style*="overflow-x: scroll"]');
      })
      .map(el => ({
        tag: el.tagName,
        class: el.className,
        outerHTML: el.outerHTML.slice(0, 150),
        rect: { left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width },
      }));
  });
  console.log('Favorites non-scrollable overflow:', favOverflow);

  await browser.close();
}

diagnose().catch(console.error);
