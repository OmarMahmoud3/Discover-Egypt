import puppeteer from 'puppeteer-core';

async function testModals() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // 1. Open drawer
  const menuBtn = await page.$('.mobile-menu-btn');
  if (menuBtn) {
    await menuBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: 'audit-screenshots/drawer-375px.png' });
    const closeBtn = await page.$('#mobile-drawer button');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // 2. Open search modal
  const searchBtn = await page.$('.nav-action-btn');
  if (searchBtn) {
    await searchBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: 'audit-screenshots/search-modal-375px.png' });
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));
  }

  // 3. Open login modal via onOpenAuth button in bottom nav
  const buttons = await page.$$('.mobile-bottom-nav button');
  if (buttons.length > 0) {
    await buttons[0].click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: 'audit-screenshots/login-modal-375px.png' });
  }

  await browser.close();
  console.log('Modals test script completed successfully');
}

testModals().catch((err) => {
  console.error(err);
  process.exit(1);
});
