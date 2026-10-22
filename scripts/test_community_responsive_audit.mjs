import { chromium } from 'file:///C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/4b5d7016-579f-47c9-9ea6-a5316dc93c31/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Real user session to test requests, conversations, and chat drawer
const TEST_USER = {
  id: '8e797373-9bdc-48e3-ad4e-2bf9aece84a0',
  email: 'mostafa@discoveregypt.com',
  name: 'مصطفى',
  avatar_url: 'pyramid',
  interests: ['الآثار الفرعونية', 'جولات النيل والفلوكة'],
};

function injectSession(page) {
  return page.evaluate((u) => {
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
    localStorage.removeItem('sb-irdrdbwkfccplloirndz-auth-token');
    localStorage.setItem('discover_egypt_test_session', JSON.stringify(sessionData));

    // Ensure mock conversation and incoming request exist for complete UI rendering
    const mockReqs = [
      {
        id: 'req-audit-1',
        sender_id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
        receiver_id: u.id,
        purpose: 'travel_buddy',
        message: 'مرحباً يا مصطفى، أود التنسيق معك لزيارة معابد الأقصر والكرنك والتصوير الفوتوغرافي!',
        status: 'pending',
        created_at: new Date().toISOString(),
        sender: {
          id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
          display_name: 'Omar Mahmoud',
          avatar_url: 'pharaoh',
          city: 'الأقصر والقاهرة',
        },
      },
    ];
    const mockConvs = [
      {
        id: 'conv-audit-1',
        participant1_id: '8e797373-9bdc-48e3-ad4e-2bf9aece84a0',
        participant2_id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
        last_message_text: 'أهلاً بك يا عمر! مرحباً بالتأكيد، يسعدني التنسيق معك.',
        last_message_at: new Date().toISOString(),
        otherUser: {
          id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
          display_name: 'Omar Mahmoud',
          avatar_url: 'pharaoh',
          city: 'الأقصر والقاهرة',
        },
      },
    ];
    const mockMsgs = [
      {
        id: 'msg-1',
        conversation_id: 'conv-audit-1',
        sender_id: '8e797373-9bdc-48e3-ad4e-2bf9aece84a0',
        content: 'أهلاً بك يا عمر! مرحباً بالتأكيد، يسعدني التنسيق معك لزيارة معابد الأقصر والكرنك.',
        created_at: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-audit-1',
        sender_id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
        content: 'رائع جداً يا مصطفى! ما رأيك نلتقي عند طريق الكباش صباح السبت القادم؟',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('discover_egypt_community_requests', JSON.stringify(mockReqs));
    localStorage.setItem('discover_egypt_community_conversations', JSON.stringify(mockConvs));
    localStorage.setItem('discover_egypt_community_messages', JSON.stringify(mockMsgs));
  }, TEST_USER);
}

const VIEWPORTS = [
  { name: 'Small Mobile (360x740)', width: 360, height: 740, isMobile: true },
  { name: 'iPhone SE (375x667)', width: 375, height: 667, isMobile: true },
  { name: 'iPhone 13/14 (390x844)', width: 390, height: 844, isMobile: true },
  { name: 'Tablet (768x1024)', width: 768, height: 1024, isMobile: false },
  { name: 'Desktop (1280x800)', width: 1280, height: 800, isMobile: false },
];

async function run() {
  console.log('===============================================================');
  console.log('  COMMUNITY MULTI-SCREEN RESPONSIVE & OVERFLOW AUDIT');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.name} [${vp.width}x${vp.height}] ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        locale: 'ar-EG',
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
      await injectSession(page);
      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });

      // 1. Audit Explorers Directory Tab
      console.log('  1. Auditing Explorers Directory...');
      const expOverflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          clientWidth: docEl.clientWidth,
          hasOverflow: docEl.scrollWidth > docEl.clientWidth,
        };
      });
      console.log(`     -> ScrollWidth: ${expOverflow.scrollWidth}px, ClientWidth: ${expOverflow.clientWidth}px`);
      if (expOverflow.hasOverflow) {
        throw new Error(`Explorers directory horizontal overflow on ${vp.name}! ${expOverflow.scrollWidth} > ${expOverflow.clientWidth}`);
      }

      // 2. Audit Requests Tab
      console.log('  2. Auditing Connection Requests Tab...');
      const requestsTab = page.locator('.community-tab-btn', { hasText: 'طلبات التواصل' });
      await requestsTab.click();
      await page.waitForTimeout(400);

      const reqOverflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          clientWidth: docEl.clientWidth,
          hasOverflow: docEl.scrollWidth > docEl.clientWidth,
        };
      });
      console.log(`     -> ScrollWidth: ${reqOverflow.scrollWidth}px, ClientWidth: ${reqOverflow.clientWidth}px`);
      if (reqOverflow.hasOverflow) {
        throw new Error(`Requests tab horizontal overflow on ${vp.name}! ${reqOverflow.scrollWidth} > ${reqOverflow.clientWidth}`);
      }

      // 3. Audit Conversations & Chat Drawer
      console.log('  3. Auditing Conversations & Chat Drawer...');
      const convTab = page.locator('.community-tab-btn', { hasText: 'المحادثات' });
      await convTab.click();
      await page.waitForTimeout(400);

      const convOverflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          clientWidth: docEl.clientWidth,
          hasOverflow: docEl.scrollWidth > docEl.clientWidth,
        };
      });
      console.log(`     -> ScrollWidth: ${convOverflow.scrollWidth}px, ClientWidth: ${convOverflow.clientWidth}px`);
      if (convOverflow.hasOverflow) {
        throw new Error(`Conversations tab horizontal overflow on ${vp.name}! ${convOverflow.scrollWidth} > ${convOverflow.clientWidth}`);
      }

      // Open Chat Drawer
      const openChatBtn = page.locator('.conversation-card .accept-btn').first();
      await openChatBtn.click();
      await page.waitForSelector('.chat-drawer-container');
      await page.waitForTimeout(400);

      const chatDrawerMetrics = await page.evaluate(() => {
        const drawer = document.querySelector('.chat-drawer-container');
        const input = document.querySelector('.chat-input-field');
        const sendBtn = document.querySelector('.chat-send-btn');
        const rect = drawer ? drawer.getBoundingClientRect() : null;
        const inputStyle = input ? window.getComputedStyle(input) : null;
        const sendStyle = sendBtn ? window.getComputedStyle(sendBtn) : null;
        return {
          drawerWidth: rect ? rect.width : 0,
          drawerHeight: rect ? rect.height : 0,
          inputFontSize: inputStyle ? inputStyle.fontSize : null,
          sendBtnHeight: sendStyle ? sendStyle.height : null,
          windowInnerWidth: window.innerWidth,
          windowInnerHeight: window.innerHeight,
        };
      });

      console.log(`     -> Chat Drawer Size: ${Math.round(chatDrawerMetrics.drawerWidth)}x${Math.round(chatDrawerMetrics.drawerHeight)}px (Window: ${chatDrawerMetrics.windowInnerWidth}x${chatDrawerMetrics.windowInnerHeight})`);
      console.log(`     -> Input font-size: ${chatDrawerMetrics.inputFontSize} (16px avoids iOS auto-zoom)`);

      // Save screenshot for small mobile, tablet, and desktop
      if (vp.width === 360) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '27_mobile_360_chat_drawer.png') });
        console.log('     ✓ Saved screenshot: 27_mobile_360_chat_drawer.png');
      } else if (vp.width === 390) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '28_iphone_390_chat_drawer.png') });
        console.log('     ✓ Saved screenshot: 28_iphone_390_chat_drawer.png');
      } else if (vp.width === 768) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '29_tablet_768_chat_drawer.png') });
        console.log('     ✓ Saved screenshot: 29_tablet_768_chat_drawer.png');
      }

      await context.close();
      console.log(`  ✓ ${vp.name} Passed with 0 Horizontal Overflow!`);
    }

    console.log('\n===============================================================');
    console.log('  ✅ ALL MULTI-SCREEN RESPONSIVE AUDIT CHECKS PASSED!');
    console.log('===============================================================\n');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ Responsive Audit Failed:', err);
  process.exit(1);
});
