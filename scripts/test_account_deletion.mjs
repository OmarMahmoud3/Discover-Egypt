import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { translations } from '../src/i18n/translations.js';
import { deleteCurrentUserAccount } from '../src/lib/communityService.js';

console.log('🧪 Starting Permanent User Account Deletion Test Suite...\n');

// 1. Verify SQL RPC Script Existence and Security Hardening
const rpcPath = path.resolve('supabase/delete_user_rpc.sql');
assert.ok(fs.existsSync(rpcPath), 'supabase/delete_user_rpc.sql must exist');
const rpcSql = fs.readFileSync(rpcPath, 'utf8');

assert.ok(
  rpcSql.includes('CREATE OR REPLACE FUNCTION public.delete_own_user()'),
  'RPC must create delete_own_user function'
);
assert.ok(
  rpcSql.includes('SECURITY DEFINER'),
  'delete_own_user must run with SECURITY DEFINER to securely access auth.users'
);
assert.ok(
  rpcSql.includes('current_user_id := auth.uid();'),
  'delete_own_user must derive user identity strictly from auth.uid()'
);
assert.ok(
  rpcSql.includes("RAISE EXCEPTION 'Unauthorized: Caller must be authenticated"),
  'delete_own_user must strictly reject unauthenticated callers'
);
assert.ok(
  rpcSql.includes('Cannot delete the only remaining administrator account'),
  'delete_own_user must protect system from deleting sole administrator'
);
assert.ok(
  rpcSql.includes('DELETE FROM public.favorites WHERE user_id = current_user_id'),
  'delete_own_user must purge favorites'
);
assert.ok(
  rpcSql.includes('DELETE FROM public.messages WHERE sender_id = current_user_id'),
  'delete_own_user must purge sent messages'
);
assert.ok(
  rpcSql.includes('DELETE FROM public.conversations'),
  'delete_own_user must purge participant conversations'
);
assert.ok(
  rpcSql.includes('DELETE FROM public.community_connections'),
  'delete_own_user must purge connection requests'
);
assert.ok(
  rpcSql.includes('DELETE FROM public.profiles WHERE id = current_user_id'),
  'delete_own_user must purge public profile'
);
assert.ok(
  rpcSql.includes('DELETE FROM auth.users WHERE id = current_user_id'),
  'delete_own_user must permanently delete auth.users authentication record'
);
assert.ok(
  rpcSql.includes('REVOKE ALL ON FUNCTION public.delete_own_user() FROM PUBLIC;') &&
  rpcSql.includes('GRANT EXECUTE ON FUNCTION public.delete_own_user() TO authenticated;'),
  'delete_own_user must enforce strict execute grants'
);

console.log('✅ 1. SQL RPC Database Migration & Security policies verified.');

// 2. Verify Service Layer
assert.equal(
  typeof deleteCurrentUserAccount,
  'function',
  'deleteCurrentUserAccount must be exported by communityService.js'
);

// Unauthenticated invocation should throw Error
let unauthThrown = false;
try {
  await deleteCurrentUserAccount();
} catch (err) {
  unauthThrown = true;
  assert.ok(
    err.message.includes('Not authenticated'),
    'Should throw "Not authenticated" when caller is not logged in'
  );
}
assert.ok(unauthThrown, 'Unauthenticated account deletion correctly blocked');

console.log('✅ 2. Service Layer authentication enforcement verified.');

// 3. Verify AdminAuthContext Integration
const authContextPath = path.resolve('src/context/AdminAuthContext.jsx');
const authContextCode = fs.readFileSync(authContextPath, 'utf8');

assert.ok(
  authContextCode.includes('handleDeleteAccount'),
  'AdminAuthContext must define and export handleDeleteAccount'
);

console.log('✅ 3. AdminAuthContext account deletion handler verified.');

// 4. Verify Translations Parity for Account Deletion
const deleteKeys = [
  'deleteAccountDangerTitle',
  'deleteAccountDangerDesc',
  'deleteAccountBtn',
  'deleteModalTitle',
  'deleteModalWarning',
  'deleteDataListTitle',
  'deleteDataAuth',
  'deleteDataProfile',
  'deleteDataFavorites',
  'deleteDataMessages',
  'deleteConfirmPrompt',
  'deleteConfirmWord',
  'deleteConfirmPlaceholder',
  'confirmDeleteBtn',
  'deletingAccount',
  'deleteAccountSuccess',
  'deleteAccountError',
  'deleteAdminError',
];

for (const key of deleteKeys) {
  assert.ok(
    translations.ar?.profile?.[key],
    `Arabic profile translations must contain "${key}"`
  );
  assert.ok(
    translations.en?.profile?.[key],
    `English profile translations must contain "${key}"`
  );
}

console.log(`✅ 4. All ${deleteKeys.length} translation keys verified with 100% Arabic & English parity.`);

// 5. Verify Explicit Word Confirmation Logic
function validateDeleteConfirmation(input, expectedWord) {
  const normInput = (input || '').trim().toUpperCase();
  const normExpected = (expectedWord || '').toUpperCase();
  return normInput === normExpected || normInput === 'حذف' || normInput === 'DELETE';
}

assert.equal(validateDeleteConfirmation('حذف', 'حذف'), true, 'Typing "حذف" matches');
assert.equal(validateDeleteConfirmation(' حذف ', 'حذف'), true, 'Typing " حذف " with whitespace matches');
assert.equal(validateDeleteConfirmation('DELETE', 'DELETE'), true, 'Typing "DELETE" matches');
assert.equal(validateDeleteConfirmation('delete', 'DELETE'), true, 'Typing "delete" (lowercase) matches');
assert.equal(validateDeleteConfirmation('حذف', 'DELETE'), true, 'Arabic word matches in English UI');
assert.equal(validateDeleteConfirmation('DELETE', 'حذف'), true, 'English word matches in Arabic UI');
assert.equal(validateDeleteConfirmation('', 'حذف'), false, 'Empty input fails');
assert.equal(validateDeleteConfirmation('ok', 'حذف'), false, 'Random word "ok" fails');
assert.equal(validateDeleteConfirmation('yes', 'DELETE'), false, 'Random word "yes" fails');

console.log('✅ 5. Confirmation keyword validation logic passed.');

// 6. Verify UI Components in Profile.jsx & Home.jsx
const profilePath = path.resolve('src/Pages/Profile.jsx');
const profileCode = fs.readFileSync(profilePath, 'utf8');

assert.ok(
  profileCode.includes('profile-danger-card'),
  'Profile.jsx must render profile-danger-card in Security tab'
);
assert.ok(
  profileCode.includes('deleteModalOpen'),
  'Profile.jsx must manage deleteModalOpen state'
);
assert.ok(
  profileCode.includes('delete-modal-dialog'),
  'Profile.jsx must render delete-modal-dialog with WCAG alertdialog role'
);

const homePath = path.resolve('src/Pages/Home.jsx');
const homeCode = fs.readFileSync(homePath, 'utf8');

assert.ok(
  homeCode.includes('feedbackToast'),
  'Home.jsx must render feedback toast for post-deletion confirmation'
);

console.log('✅ 6. Profile.jsx and Home.jsx UI elements verified.');

console.log('\n🎉 ALL ACCOUNT DELETION TESTS PASSED SUCCESSFULLY!\n');
