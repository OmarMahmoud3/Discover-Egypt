import puppeteer from 'puppeteer-core';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Inject session
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const sessionData = {
      access_token: 'valid-test-token',
      refresh_token: 'valid-test-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      user: {
        id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'omar@discoveregypt.com',
        user_metadata: {
          full_name: 'Omar Mahmoud',
          name: 'Omar Mahmoud',
          avatar_url: 'pharaoh',
          interests: ['الآثار الفرعونية'],
          is_public: true,
        },
      },
    };
    localStorage.setItem('discover_egypt_test_session', JSON.stringify(sessionData));
  });

  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.explorer-card', { timeout: 10000 });
  console.log('Cards found!');

  const count = await page.$$eval('.explorer-card', el => el.length);
  console.log('Cards count:', count);

  // Click first connect button
  const connectBtn = await page.$('.explorer-connect-btn');
  if (connectBtn) {
    console.log('Found connect button, clicking...');
    await connectBtn.click();
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: 'C:/Users/om776/.gemini/antigravity-ide/brain/4b5d7016-579f-47c9-9ea6-a5316dc93c31/screenshots/23_mobile_safe_connect_modal_fixed.png' });
    console.log('Modal screenshot saved!');
  } else {
    console.warn('Connect button not found on card');
  }

  await browser.close();
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
