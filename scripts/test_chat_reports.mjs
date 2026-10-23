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
  assert(adminReportsContent.includes('res?.supabaseError'), 'AdminReports.jsx checks res.supabaseError');
  assert(adminReportsContent.includes('42501'), 'AdminReports.jsx handles 42501 permission denied RLS error');
  assert(adminReportsContent.includes('42P01'), 'AdminReports.jsx handles 42P01 table missing error');
  assert(adminReportsContent.includes('realtime:chat_reports_admin'), 'AdminReports.jsx subscribes to Supabase Realtime channel');
  assert(adminReportsContent.includes('community:report_submitted'), 'AdminReports.jsx listens to community:report_submitted window event');

  const adminCssContent = fs.readFileSync(path.resolve('src/styles/admin.css'), 'utf8');
  assert(adminCssContent.includes('.admin-badge-banned'), 'admin.css defines .admin-badge-banned');
  assert(adminCssContent.includes('.admin-evidence-transcript'), 'admin.css defines .admin-evidence-transcript');

  const communityCssContent = fs.readFileSync(path.resolve('src/styles/community.css'), 'utf8');
  assert(communityCssContent.includes('.report-modal-overlay'), 'community.css defines .report-modal-overlay');
  assert(communityCssContent.includes('.chat-banned-notice-bar'), 'community.css defines .chat-banned-notice-bar');

  // --- Group 5: The 7 Verification Checkpoints ---
  console.log('\n[GROUP 5] 7 Verification Checkpoints (Schema, RLS, Admin Trust, Errors, Realtime, Enrichment)');
  const communityCode = fs.readFileSync(path.resolve('src/lib/communityService.js'), 'utf8');
  
  // Checkpoint 1: Reports saved with status 'pending'
  assert(schemaContent.includes("status text NOT NULL DEFAULT 'pending'"), 'Checkpoint 1: chat_reports schema defaults status to pending');
  assert(schemaContent.includes("status IN ('pending', 'investigating', 'action_taken', 'dismissed')"), 'Checkpoint 1: chat_reports check constraint allows expected statuses');
  const testSub = await submitChatReport({
    reporterId: 'chk1-reporter',
    reportedUserId: 'chk1-target',
    conversationId: 'chk1-conv',
    reason: 'harassment',
    details: 'Checkpoint 1 test',
    messageIds: [],
  });
  const subReport = (await fetchReportDetails(testSub.reportId));
  assert(subReport.status === 'pending', 'Checkpoint 1: newly created report has status = pending');

  // Checkpoint 2: Query does not exclude reports by date or accidental filters
  assert(communityCode.includes("query = query.order('created_at', { ascending: false })"), 'Checkpoint 2: fetchAdminReports orders by created_at DESC');
  assert(communityCode.includes("if (status && status !== 'all')"), 'Checkpoint 2: fetchAdminReports does not filter out reports when status is all');
  const allReportsRes = await fetchAdminReports({ status: 'all', page: 1, perPage: 50 });
  assert(Array.isArray(allReportsRes.reports) && allReportsRes.reports.length > 0, 'Checkpoint 2: fetchAdminReports returns list without restrictive date drops');

  // Checkpoints 3 & 4: RLS policy and server-side trusted is_admin()
  assert(schemaContent.includes('CREATE OR REPLACE FUNCTION public.is_admin()'), 'Checkpoint 3/4: public.is_admin() helper defined');
  assert(schemaContent.includes('SECURITY DEFINER'), 'Checkpoint 3/4: is_admin() runs with SECURITY DEFINER to bypass recursion');
  assert(schemaContent.includes("auth.jwt() -> 'app_metadata' ->> 'role'"), 'Checkpoint 4: is_admin() checks server-controlled app_metadata');
  assert(schemaContent.includes("'om7765355@gmail.com'"), 'Checkpoint 4: is_admin() recognizes designated admin emails');
  assert(schemaContent.includes('UPDATE public.profiles'), 'Checkpoint 4: Schema automatically provisions role = admin for designated admin emails');
  assert(schemaContent.includes('CREATE POLICY "Admins can view all reports"'), 'Checkpoint 3: Admin SELECT policy exists for chat_reports');
  assert(schemaContent.includes('public.is_admin()'), 'Checkpoint 3: chat_reports RLS relies on public.is_admin()');

  // Checkpoint 5: Exposing Supabase error instead of hiding it
  assert(communityCode.includes('supabaseError = {'), 'Checkpoint 5: fetchAdminReports captures supabaseError object');
  assert(communityCode.includes('console.error(\'fetchAdminReports Supabase query error:\''), 'Checkpoint 5: logs query error visibly to console');
  assert(adminReportsContent.includes('setError(formattedMsg)'), 'Checkpoint 5: AdminReports.jsx displays formatted error message to admin');

  // Checkpoint 6: Realtime and instant client updates
  assert(communityCode.includes('community:report_submitted'), 'Checkpoint 6: communityService dispatches community:report_submitted');
  assert(schemaContent.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports'), 'Checkpoint 6: Schema adds chat_reports to supabase_realtime publication');

  // Checkpoint 7: Linked tables RLS & resilient profile enrichment
  assert(schemaContent.includes('CREATE POLICY "Admins can read all profiles"'), 'Checkpoint 7: Admins can read all profiles policy exists in schema');
  assert(schemaContent.includes('CREATE POLICY "Admins can view all conversations"'), 'Checkpoint 7: Admins can view all conversations policy exists in schema');
  assert(schemaContent.includes('CREATE POLICY "Admins can view all messages"'), 'Checkpoint 7: Admins can view all messages policy exists in schema');
  assert(communityCode.includes('display_name: \'مستكشف مصري\''), 'Checkpoint 7: Safe fallback enrichment prevents hiding reports if profile lookup fails');

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

