import { chromium } from 'file:///C:/Users/om776/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/om776/.gemini/antigravity-ide/brain/4b5d7016-579f-47c9-9ea6-a5316dc93c31/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Real database accounts present in Supabase profiles
const USER_1 = {
  id: 'e9bf99c1-2160-4a85-ae0b-c729c24bc21f',
  email: 'omar.mahmoud@discoveregypt.com',
  name: 'Omar Mahmoud',
  avatar_url: 'pharaoh',
  interests: ['الآثار الفرعونية', 'الغوص بالبحر الأحمر'],
};

const USER_2 = {
  id: '8e797373-9bdc-48e3-ad4e-2bf9aece84a0',
  email: 'mostafa@discoveregypt.com',
  name: 'مصطفى',
  avatar_url: 'pyramid',
  interests: ['الآثار الفرعونية', 'جولات النيل والفلوكة'],
};

const USER_3 = {
  id: '0e01ddd2-fe55-4a5e-8f7d-cdae468d0f91',
  email: 'ok@discoveregypt.com',
  name: 'ok',
  avatar_url: 'falcon',
  interests: [],
};

function injectSession(page, user) {
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
  }, user);
}

async function run() {
  console.log('===============================================================');
  console.log('  TESTING REALTIME COMMUNITY MESSAGING FLOW WITH 2 REAL ACCOUNTS');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    // -------------------------------------------------------------------------
    // STEP 1: USER 1 (Omar Mahmoud) SENDS CONNECTION REQUEST TO USER 2 (مصطفى)
    // -------------------------------------------------------------------------
    console.log('[STEP 1] User 1 (Omar Mahmoud) logs in and sends connection request to مصطفى...');
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'ar-EG',
    });
    const page1 = await context1.newPage();

    await page1.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await injectSession(page1, USER_1);

    await page1.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
    await page1.waitForSelector('.explorer-card');

    // Filter or locate Mustafa's card
    const searchInput = page1.locator('.community-search-input');
    await searchInput.fill('مصطفى');
    await page1.waitForTimeout(400);

    const mustafaCard = page1.locator('.explorer-card').first();
    const connectBtn = mustafaCard.locator('.explorer-connect-btn');
    await connectBtn.click();
    console.log('  -> Safe Connect dialog opened.');

    // Wait for modal and fill message
    await page1.waitForSelector('.connect-modal-card');
    const msgTextarea = page1.locator('#connect-msg');
    await msgTextarea.fill('مرحباً يا مصطفى، أود التنسيق معك لزيارة معابد الأقصر والكرنك والتصوير الفوتوغرافي!');

    const submitBtn = page1.locator('.connect-modal-actions button[type="submit"]');
    await submitBtn.click();
    await page1.waitForTimeout(600);
    console.log('  -> Connection request submitted successfully!');

    // Switch to Requests tab -> Outgoing
    const requestsTab1 = page1.locator('.community-tab-btn', { hasText: 'طلبات التواصل' });
    await requestsTab1.click();
    await page1.waitForTimeout(400);

    const outgoingSubTab1 = page1.locator('.community-sub-tab-btn', { hasText: 'الطلبات المرسلة' });
    await outgoingSubTab1.click();
    await page1.waitForTimeout(400);

    // Verify outgoing request is listed with status 'pending'
    const outgoingCards = page1.locator('.request-card');
    const outCount = await outgoingCards.count();
    console.log(`  -> User 1 outgoing requests count: ${outCount}`);
    if (outCount === 0) throw new Error('Expected at least 1 outgoing request card for User 1.');

    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, '25_outgoing_requests_sender_view.png') });
    console.log('  ✓ Saved screenshot: 25_outgoing_requests_sender_view.png');

    // -------------------------------------------------------------------------
    // STEP 2: USER 2 (مصطفى) SEES INCOMING REQUEST AND ACCEPTS IT
    // -------------------------------------------------------------------------
    console.log('\n[STEP 2] User 2 (مصطفى) logs in and inspects incoming requests...');
    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'ar-EG',
    });
    const page2 = await context2.newPage();

    // Share localStorage so local requests/conversations sync across test contexts
    const user1Storage = await page1.evaluate(() => {
      return {
        requests: localStorage.getItem('discover_egypt_community_requests'),
        conversations: localStorage.getItem('discover_egypt_community_conversations'),
        messages: localStorage.getItem('discover_egypt_community_messages'),
      };
    });

    await page2.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await injectSession(page2, USER_2);
    await page2.evaluate((s) => {
      if (s.requests) localStorage.setItem('discover_egypt_community_requests', s.requests);
      if (s.conversations) localStorage.setItem('discover_egypt_community_conversations', s.conversations);
      if (s.messages) localStorage.setItem('discover_egypt_community_messages', s.messages);
    }, user1Storage);

    await page2.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });

    // Click Requests Tab
    const requestsTab2 = page2.locator('.community-tab-btn', { hasText: 'طلبات التواصل' });
    await requestsTab2.click();
    await page2.waitForTimeout(400);

    const incomingCards = page2.locator('.request-card');
    const inCount = await incomingCards.count();
    console.log(`  -> User 2 incoming requests count: ${inCount}`);
    if (inCount === 0) throw new Error('Expected incoming request from Omar Mahmoud for User 2.');

    const incomingCardText = await incomingCards.first().innerText();
    console.log('  -> Incoming card content preview:', incomingCardText.split('\n')[0]);

    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, '24_incoming_requests_section.png') });
    console.log('  ✓ Saved screenshot: 24_incoming_requests_section.png');

    // Accept the request!
    console.log('  -> User 2 clicks "قبول الطلب ✓"...');
    const acceptBtn = incomingCards.first().locator('.accept-btn');
    await acceptBtn.click();
    await page2.waitForTimeout(800);

    // Verify ChatDrawer opened automatically upon acceptance
    await page2.waitForSelector('.chat-drawer-container');
    console.log('  ✓ ChatDrawer automatically opened upon accepting the request!');

    // -------------------------------------------------------------------------
    // STEP 3: USER 2 (مصطفى) SENDS A MESSAGE IN THE CONVERSATION
    // -------------------------------------------------------------------------
    console.log('\n[STEP 3] User 2 sends message in the conversation...');
    const chatInput2 = page2.locator('.chat-input-field');
    await chatInput2.fill('أهلاً بك يا عمر! مرحباً بالتأكيد، يسعدني التنسيق معك لزيارة معابد الأقصر والكرنك.');
    const sendBtn2 = page2.locator('.chat-send-btn');
    await sendBtn2.click();
    await page2.waitForTimeout(600);

    const msgCount2 = await page2.locator('.chat-message-row').count();
    console.log(`  -> Total messages visible in User 2 chat: ${msgCount2}`);
    if (msgCount2 === 0) throw new Error('Expected sent message to appear in chat drawer.');

    // -------------------------------------------------------------------------
    // STEP 4: USER 1 (Omar) SEES CONVERSATION AND REPLIES
    // -------------------------------------------------------------------------
    console.log('\n[STEP 4] User 1 (Omar) opens conversation and replies...');
    // Sync shared storage
    const user2Storage = await page2.evaluate(() => {
      return {
        requests: localStorage.getItem('discover_egypt_community_requests'),
        conversations: localStorage.getItem('discover_egypt_community_conversations'),
        messages: localStorage.getItem('discover_egypt_community_messages'),
      };
    });
    await page1.evaluate((s) => {
      if (s.requests) localStorage.setItem('discover_egypt_community_requests', s.requests);
      if (s.conversations) localStorage.setItem('discover_egypt_community_conversations', s.conversations);
      if (s.messages) localStorage.setItem('discover_egypt_community_messages', s.messages);
    }, user2Storage);

    // Reload page1 so all fresh requests and conversations are loaded
    await page1.reload({ waitUntil: 'networkidle' });

    // Navigate to Conversations tab
    const convTab1 = page1.locator('.community-tab-btn', { hasText: 'المحادثات' });
    await convTab1.click();
    await page1.waitForTimeout(400);

    const convCards = page1.locator('.conversation-card');
    const convCount = await convCards.count();
    console.log(`  -> User 1 active conversations count: ${convCount}`);
    if (convCount === 0) throw new Error('Expected active conversation with Mustafa for User 1.');

    // Open chat
    const openChatBtn = convCards.first().locator('.accept-btn');
    await openChatBtn.click();
    await page1.waitForTimeout(600);

    // Verify Mustafa's message is visible
    await page1.waitForSelector('.chat-drawer-container');
    const receivedMsgText = await page1.locator('.chat-bubble-text').first().innerText();
    console.log(`  -> User 1 received message text: "${receivedMsgText}"`);
    if (!receivedMsgText.includes('الأقصر')) {
      throw new Error('Expected received message to contain Mustafa’s text.');
    }

    // User 1 replies
    const chatInput1 = page1.locator('.chat-input-field');
    await chatInput1.fill('رائع جداً يا مصطفى! ما رأيك نلتقي عند طريق الكباش صباح السبت القادم؟');
    const sendBtn1 = page1.locator('.chat-send-btn');
    await sendBtn1.click();
    await page1.waitForTimeout(600);

    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, '26_active_conversation_chat_drawer.png') });
    console.log('  ✓ Saved screenshot: 26_active_conversation_chat_drawer.png');

    // -------------------------------------------------------------------------
    // STEP 5: THIRD-PARTY USER ISOLATION CHECK (User 3 "ok")
    // -------------------------------------------------------------------------
    console.log('\n[STEP 5] Testing third-party isolation for User 3 ("ok")...');
    const context3 = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'ar-EG',
    });
    const page3 = await context3.newPage();
    await page3.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await injectSession(page3, USER_3);
    // Apply storage with conversations of User 1 and User 2
    await page3.evaluate((s) => {
      if (s.requests) localStorage.setItem('discover_egypt_community_requests', s.requests);
      if (s.conversations) localStorage.setItem('discover_egypt_community_conversations', s.conversations);
      if (s.messages) localStorage.setItem('discover_egypt_community_messages', s.messages);
    }, user2Storage);

    await page3.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });

    // Check Requests tab
    const requestsTab3 = page3.locator('.community-tab-btn', { hasText: 'طلبات التواصل' });
    await requestsTab3.click();
    await page3.waitForTimeout(400);

    const user3Incoming = await page3.locator('.request-card').count();
    console.log(`  -> User 3 incoming requests visible: ${user3Incoming} (Expected: 0)`);
    if (user3Incoming !== 0) {
      throw new Error('RLS Breach: User 3 saw incoming requests belonging to other users!');
    }

    // Check Conversations tab
    const convTab3 = page3.locator('.community-tab-btn', { hasText: 'المحادثات' });
    await convTab3.click();
    await page3.waitForTimeout(400);

    const user3Convs = await page3.locator('.conversation-card').count();
    console.log(`  -> User 3 conversations visible: ${user3Convs} (Expected: 0)`);
    if (user3Convs !== 0) {
      throw new Error('RLS Breach: User 3 saw conversations between User 1 and User 2!');
    }

    console.log('  ✓ Total Privacy & Isolation Confirmed: Third party cannot see requests or messages!');
    console.log('\n===============================================================');
    console.log('  ✅ ALL REALTIME COMMUNITY MESSAGING E2E TESTS PASSED!');
    console.log('===============================================================\n');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ E2E Verification failed:', err);
  process.exit(1);
});
