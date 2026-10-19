const { chromium } = require('C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');

async function testImg() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  // Track failed requests
  page.on('requestfailed', req => {
    console.log('Request failed:', req.url(), req.failure()?.errorText);
  });
  page.on('response', res => {
    if (res.request().resourceType() === 'image') {
      console.log('Image response:', res.status(), res.url().slice(0, 80));
    }
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Test Images</h1>
        <img id="img1" src="https://commons.wikimedia.org/wiki/Special:FilePath/Pyramids_of_the_Giza_Necropolis.jpg?width=1200" />
        <img id="img2" src="https://commons.wikimedia.org/wiki/Special:FilePath/Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg?width=1200" />
      </body>
    </html>
  `;
  await page.setContent(html);
  await page.waitForTimeout(3000);

  const img1NaturalWidth = await page.$eval('#img1', el => el.naturalWidth);
  const img2NaturalWidth = await page.$eval('#img2', el => el.naturalWidth);
  console.log('img1 natural width:', img1NaturalWidth);
  console.log('img2 natural width:', img2NaturalWidth);

  await browser.close();
}

testImg();
