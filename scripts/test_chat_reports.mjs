/**
 * Discover Egypt — Chat Moderation & User Reporting Automated Test Suite
 * Validates:
 * 1. SQL Schema integrity, tables, constraints, RLS policies, and RPC functions
 * 2. Community & Admin translation keys parity (Arabic & English)
 * 3. communityService reporting & moderation exports and validation logic
 * 4. Banning guards & self-reporting prevention
 * 5. Component existence & integration (ReportModal, AdminReports, ChatDrawer, AdminSidebar, App.jsx)
 */

import fs from 'fs';
import path from 'path';
import { translations } from '../src/i18n/translations.js';
import { adminTranslations } from '../src/i18n/adminTranslations.js';
import {
  submitChatReport,
  fetchAdminReports,
  fetchReportDetails,
  adminModerateReport,
  adminSetUserBanStatus,
  fetchAdminAuditLogs,
  getUserBanInfo,
  isUserLocallyBanned,
  REPORT_REASONS,
  REPORT_STATUSES,
} from '../src/lib/communityService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runChatReportsTests() {
  console.log('\n======================================================');
  console.log('  RUNNING CHAT MODERATION & REPORTING TEST SUITE');
  console.log('======================================================\n');

  // --- Group 1: SQL Schema & Security Hardening ---
  console.log('[GROUP 1] Database Schema, Constraints & RPC Verification');
  const schemaPath = path.resolve('supabase/chat_reports_and_moderation_schema.sql');
  assert(fs.existsSync(schemaPath), 'supabase/chat_reports_and_moderation_schema.sql exists');

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  assert(schemaContent.includes('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned'), 'Extends profiles with is_banned column');
  assert(schemaContent.includes('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason'), 'Extends profiles with ban_reason column');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.chat_reports'), 'Creates public.chat_reports table');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.chat_report_evidence'), 'Creates public.chat_report_evidence table');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.admin_audit_logs'), 'Creates public.admin_audit_logs table');
  assert(schemaContent.includes('CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id)'), 'Enforces no_self_report constraint');
  assert(schemaContent.includes('ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY'), 'RLS enabled on chat_reports');
  assert(schemaContent.includes('ALTER TABLE public.chat_report_evidence ENABLE ROW LEVEL SECURITY'), 'RLS enabled on chat_report_evidence');
  assert(schemaContent.includes('ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY'), 'RLS enabled on admin_audit_logs');
  assert(schemaContent.includes('CREATE OR REPLACE FUNCTION public.submit_chat_report'), 'submit_chat_report RPC function defined');
  assert(schemaContent.includes('CREATE OR REPLACE FUNCTION public.admin_moderate_report'), 'admin_moderate_report RPC function defined');
  assert(schemaContent.includes('CREATE OR REPLACE FUNCTION public.admin_set_user_ban_status'), 'admin_set_user_ban_status RPC function defined');
  assert(schemaContent.includes('SECURITY DEFINER'), 'RPC functions use SECURITY DEFINER for safe server execution');

  // --- Group 2: Translation Dictionaries & Parity ---
  console.log('\n[GROUP 2] Translation Dictionaries & Key Parity');
  const requiredCommunityKeys = [
    'reportUser',
    'reportUserTitle',
    'reportUserSubtitle',
    'reportReasonLabel',
    'reportReasonPlaceholder',
    'reportDetailsLabel',
    'reportDetailsPlaceholder',
    'reportEvidenceLabel',
    'reportEvidenceDesc',
    'reportPrivacyNotice',
    'submitReportBtn',
    'submittingReport',
    'reportSuccessTitle',
    'reportSuccessDesc',
    'reportSuccessBtn',
    'reportError',
    'bannedNotice',
  ];

  requiredCommunityKeys.forEach((key) => {
    assert(Boolean(translations.ar?.community?.[key]), `Arabic translation key translations.ar.community.${key} exists`);
    assert(Boolean(translations.en?.community?.[key]), `English translation key translations.en.community.${key} exists`);
  });

  const requiredAdminKeys = [
    'reports',
    'reportsTitle',
    'reportsSubtitle',
    'totalReports',
    'pendingReview',
    'investigating',
    'actionTaken',
    'dismissed',
    'searchReports',
    'reporter',
    'reportedUser',
    'reason',
    'evidenceCount',
    'reviewReport',
    'reportDetailsTitle',
    'noReportsYet',
    'frozenEvidenceNotice',
    'evidenceMessagesList',
    'statusUpdateTitle',
    'adminNotes',
    'saveStatusBtn',
    'banUserBtn',
    'unbanUserBtn',
    'confirmBanTitle',
    'confirmBanMsg',
    'confirmUnbanTitle',
    'auditHistoryTitle',
    'userBannedBadge',
    'userActiveBadge',
  ];

  requiredAdminKeys.forEach((key) => {
    assert(Boolean(adminTranslations.ar?.admin?.[key]), `Arabic admin translation key adminTranslations.ar.admin.${key} exists`);
    assert(Boolean(adminTranslations.en?.admin?.[key]), `English admin translation key adminTranslations.en.admin.${key} exists`);
  });

  // --- Group 3: Service Exports & Business Logic ---
  console.log('\n[GROUP 3] CommunityService Moderation Exports & Validation Logic');
  assert(typeof submitChatReport === 'function', 'submitChatReport is exported as a function');
  assert(typeof fetchAdminReports === 'function', 'fetchAdminReports is exported as a function');
  assert(typeof fetchReportDetails === 'function', 'fetchReportDetails is exported as a function');
  assert(typeof adminModerateReport === 'function', 'adminModerateReport is exported as a function');
  assert(typeof adminSetUserBanStatus === 'function', 'adminSetUserBanStatus is exported as a function');
  assert(typeof fetchAdminAuditLogs === 'function', 'fetchAdminAuditLogs is exported as a function');

  assert(Array.isArray(REPORT_REASONS) && REPORT_REASONS.length === 6, 'REPORT_REASONS contains all 6 violation categories');
  assert(Array.isArray(REPORT_STATUSES) && REPORT_STATUSES.length === 4, 'REPORT_STATUSES contains all 4 standard lifecycle statuses');

  // Verify Self-Reporting Prevention
  let selfReportBlocked = false;
  try {
    await submitChatReport({
      reporterId: 'user-123',
      reportedUserId: 'user-123',
      conversationId: 'conv-123',
      reason: 'harassment',
    });
  } catch (err) {
    selfReportBlocked = err.message.includes('cannot report yourself');
  }
  assert(selfReportBlocked, 'submitChatReport strictly rejects self-reporting');

  // Verify Missing Reason Rejection
  let missingReasonBlocked = false;
  try {
    await submitChatReport({
      reporterId: 'user-1',
      reportedUserId: 'user-2',
      conversationId: 'conv-123',
      reason: '',
    });
  } catch (err) {
    missingReasonBlocked = true;
  }
  assert(missingReasonBlocked, 'submitChatReport requires a valid reason');

  // Verify Admin Ban Status Validation
  let invalidBanBlocked = false;
  try {
    await adminSetUserBanStatus({
      targetUserId: null,
      isBanned: true,
    });
  } catch {
    invalidBanBlocked = true;
  }
  assert(invalidBanBlocked, 'adminSetUserBanStatus validates required targetUserId');

  // Ban & Unban Registry Lifecycle Verification
  const testUserId = 'test-banned-user-' + Date.now();
  await adminSetUserBanStatus({
    targetUserId: testUserId,
    isBanned: true,
    banReason: 'Automated test violation',
  });

  const banInfo = getUserBanInfo(testUserId);
  assert(banInfo && banInfo.is_banned === true, 'adminSetUserBanStatus persists ban record');
  assert(banInfo && banInfo.ban_reason === 'Automated test violation', 'Ban reason preserved accurately in registry');
  assert(isUserLocallyBanned(testUserId) === true, 'isUserLocallyBanned confirms user is banned');

  await adminSetUserBanStatus({
    targetUserId: testUserId,
    isBanned: false,
  });
  assert(isUserLocallyBanned(testUserId) === false, 'adminSetUserBanStatus clears ban status when isBanned: false');

  // --- Group 4: Component Files & Route Registration ---
  console.log('\n[GROUP 4] Components, UI & Route Registration Verification');
  const reportModalFile = path.resolve('src/Components/ReportModal.jsx');
  assert(fs.existsSync(reportModalFile), 'src/Components/ReportModal.jsx exists');

  const adminReportsFile = path.resolve('src/Pages/admin/AdminReports.jsx');
  assert(fs.existsSync(adminReportsFile), 'src/Pages/admin/AdminReports.jsx exists');

  const chatDrawerContent = fs.readFileSync(path.resolve('src/Components/ChatDrawer.jsx'), 'utf8');
  assert(chatDrawerContent.includes('ReportModal'), 'ChatDrawer.jsx imports and integrates ReportModal');
  assert(chatDrawerContent.includes('chat-drawer-report-btn'), 'ChatDrawer.jsx includes report button');
  assert(chatDrawerContent.includes('isBanned'), 'ChatDrawer.jsx checks isBanned status');
  assert(chatDrawerContent.includes('chat-banned-notice-bar'), 'ChatDrawer.jsx renders banned notice banner');
  assert(chatDrawerContent.includes('isUserLocallyBanned'), 'ChatDrawer.jsx checks local ban registry');

  const adminSidebarContent = fs.readFileSync(path.resolve('src/Components/admin/AdminSidebar.jsx'), 'utf8');
  assert(adminSidebarContent.includes('/admin/reports'), 'AdminSidebar.jsx links to /admin/reports');

  const appRoutesContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
  assert(appRoutesContent.includes('AdminReports'), 'App.jsx lazily imports AdminReports');
  assert(appRoutesContent.includes('path="reports"'), 'App.jsx registers /admin/reports route');

  const adminUsersContent = fs.readFileSync(path.resolve('src/Pages/admin/AdminUsers.jsx'), 'utf8');
  assert(adminUsersContent.includes('adminSetUserBanStatus'), 'AdminUsers.jsx imports adminSetUserBanStatus');
  assert(adminUsersContent.includes('handleToggleBan'), 'AdminUsers.jsx implements handleToggleBan');
  assert(adminUsersContent.includes('userBannedBadge'), 'AdminUsers.jsx renders userBannedBadge');
  assert(adminUsersContent.includes('moderationDbNoticeTitle'), 'AdminUsers.jsx renders moderation database setup notice banner');
  assert(adminUsersContent.includes('CHAT_MODERATION_SQL'), 'AdminUsers.jsx embeds SQL setup script');

  const adminReportsContent = fs.readFileSync(adminReportsFile, 'utf8');
  assert(adminReportsContent.includes('moderationDbNoticeTitle'), 'AdminReports.jsx renders moderation database setup notice banner');
  assert(adminReportsContent.includes('CHAT_MODERATION_SQL'), 'AdminReports.jsx embeds SQL setup script');

  const adminCssContent = fs.readFileSync(path.resolve('src/styles/admin.css'), 'utf8');
  assert(adminCssContent.includes('.admin-badge-banned'), 'admin.css defines .admin-badge-banned');
  assert(adminCssContent.includes('.admin-evidence-transcript'), 'admin.css defines .admin-evidence-transcript');

  const communityCssContent = fs.readFileSync(path.resolve('src/styles/community.css'), 'utf8');
  assert(communityCssContent.includes('.report-modal-overlay'), 'community.css defines .report-modal-overlay');
  assert(communityCssContent.includes('.chat-banned-notice-bar'), 'community.css defines .chat-banned-notice-bar');

  console.log('\n------------------------------------------------------');
  console.log(`  CHAT REPORTS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`${failed} chat report tests failed!`);
  }
}

// Execute test suite
runChatReportsTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

