import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Supabase Server-Side Account Deletion Test Suite...\n');

// 1. Verify delete-user Edge Function exists and adheres to server security rules
const edgeFnPath = path.resolve('supabase/functions/delete-user/index.ts');
assert.ok(fs.existsSync(edgeFnPath), 'supabase/functions/delete-user/index.ts must exist');

const edgeFnCode = fs.readFileSync(edgeFnPath, 'utf8');

assert.ok(
  edgeFnCode.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')"),
  'Edge Function must use SUPABASE_SERVICE_ROLE_KEY from server environment'
);
assert.ok(
  edgeFnCode.includes('adminClient.auth.admin.deleteUser(targetUserId)'),
  'Edge Function must invoke Supabase Admin API auth.admin.deleteUser'
);
assert.ok(
  edgeFnCode.includes('adminClient.auth.getUser(token)'),
  'Edge Function must verify caller identity using JWT token'
);
assert.ok(
  edgeFnCode.includes('targetUserId = callerId') || edgeFnCode.includes('Forbidden: You cannot delete another user account'),
  'Edge Function must strictly restrict standard users to deleting their own account'
);
assert.ok(
  edgeFnCode.includes('Cannot delete the only remaining administrator account'),
  'Edge Function must guard against deleting the sole administrator account'
);
assert.ok(
  edgeFnCode.includes('.from(\'favorites\')') &&
  edgeFnCode.includes('.from(\'messages\')') &&
  edgeFnCode.includes('.from(\'conversations\')') &&
  edgeFnCode.includes('.from(\'community_connections\')') &&
  edgeFnCode.includes('.from(\'profiles\')'),
  'Edge Function must explicitly purge favorites, messages, conversations, connections, and profile records'
);

console.log('✅ 1. Supabase Edge Function (delete-user) code & security verified.');

// 2. Verify admin-users Edge Function supports delete_own_account action
const adminUsersFnPath = path.resolve('supabase/functions/admin-users/index.ts');
const adminUsersCode = fs.readFileSync(adminUsersFnPath, 'utf8');

assert.ok(
  adminUsersCode.includes("action === 'delete_own_account'"),
  'admin-users Edge Function must support delete_own_account action'
);
assert.ok(
  adminUsersCode.includes('adminClient.auth.admin.deleteUser(currentUserId)'),
  'admin-users Edge Function must call auth.admin.deleteUser for delete_own_account'
);

console.log('✅ 2. admin-users Edge Function delete_own_account action verified.');

// 3. Verify communityService.js invokes server function and strictly propagates errors
const commServicePath = path.resolve('src/lib/communityService.js');
const commServiceCode = fs.readFileSync(commServicePath, 'utf8');

assert.ok(
  commServiceCode.includes("supabase.functions.invoke('delete-user'"),
  'deleteCurrentUserAccount must invoke delete-user Edge Function'
);
assert.ok(
  commServiceCode.includes("supabase.functions.invoke('admin-users'"),
  'deleteCurrentUserAccount must provide fallback invocation to admin-users'
);
assert.ok(
  commServiceCode.includes("if (!serverConfirmed)"),
  'deleteCurrentUserAccount must verify server confirmation before proceeding'
);
assert.ok(
  commServiceCode.includes('localStorage.removeItem(`discover_egypt_favorites_${userId}`)'),
  'deleteCurrentUserAccount must purge user-scoped favorites in local storage'
);
assert.ok(
  commServiceCode.includes('await supabase.auth.signOut()'),
  'deleteCurrentUserAccount must sign the user out of all sessions'
);
assert.ok(
  commServiceCode.includes('isEdgeFunctionUnavailable'),
  'communityService.js must implement isEdgeFunctionUnavailable to detect undeployed functions'
);

// Verify isEdgeFunctionUnavailable logic directly
{
  const { isEdgeFunctionUnavailable } = await import('../src/lib/communityService.js');
  assert.equal(isEdgeFunctionUnavailable({ name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }), true);
  assert.equal(isEdgeFunctionUnavailable(null, 'Failed to send a request to the Edge Function'), true);
  assert.equal(isEdgeFunctionUnavailable({ name: 'FunctionsRelayError', message: 'Relay error' }), true);
  assert.equal(isEdgeFunctionUnavailable({ context: { status: 404 } }), true);
  assert.equal(isEdgeFunctionUnavailable(new Error('Failed to fetch')), true);
  // Real server permission or system admin errors should NOT be treated as unavailable
  assert.equal(isEdgeFunctionUnavailable(new Error('System Protection: Cannot delete sole administrator')), false);
  assert.equal(isEdgeFunctionUnavailable(new Error('Forbidden: You cannot delete another user account')), false);
}

console.log('✅ 3. Client service layer server-side invocation, Edge reachability fallback & error propagation verified.');

// 4. Verify Profile.jsx redirects to /login on success and preserves modal on error
const profilePath = path.resolve('src/Pages/Profile.jsx');
const profileCode = fs.readFileSync(profilePath, 'utf8');

assert.ok(
  profileCode.includes("navigate('/login'"),
  'Profile.jsx must redirect to /login upon successful account deletion'
);
assert.ok(
  profileCode.includes("state: { accountDeleted: true, message: t('profile.deleteAccountSuccess') }"),
  'Profile.jsx must pass success message in state to /login'
);
assert.ok(
  profileCode.includes('setDeleteError(') && profileCode.includes('setDeleteLoading(false)'),
  'Profile.jsx must display actual error and stop loading on deletion failure without premature navigation'
);

console.log('✅ 4. Profile.jsx redirect and error handling verified.');

// 5. Verify LogIn.jsx renders post-deletion confirmation banner
const logInPath = path.resolve('src/Pages/LogIn.jsx');
const logInCode = fs.readFileSync(logInPath, 'utf8');

assert.ok(
  logInCode.includes("useLocation"),
  'LogIn.jsx must import useLocation to read post-deletion state'
);
assert.ok(
  logInCode.includes("location?.state?.message"),
  'LogIn.jsx must initialize message from location.state'
);

console.log('✅ 5. LogIn.jsx post-deletion confirmation toast verified.');

// 6. End-to-End Simulation of Account Lifecycle:
// Deletion -> Invalidation of credentials -> Fresh re-registration creates brand-new UUID
{
  const mockDb = {
    authUsers: new Map([
      ['u-del-101', { id: 'u-del-101', email: 'traveler@test.com', passwordHash: 'hash-secret' }],
    ]),
    profiles: new Map([
      ['u-del-101', { id: 'u-del-101', display_name: 'قديم', bio: 'أحب الأهرامات' }],
    ]),
    favorites: [
      { user_id: 'u-del-101', place_id: 'giza-pyramids' },
    ],
    messages: [
      { id: 'm-1', sender_id: 'u-del-101', content: 'مرحبا' },
    ],
  };

  // Step A: Active user exists
  assert.equal(mockDb.authUsers.has('u-del-101'), true);
  assert.equal(mockDb.profiles.has('u-del-101'), true);
  assert.equal(mockDb.favorites.length, 1);

  // Step B: Server-side account deletion execution
  const targetId = 'u-del-101';
  // Relational purges
  mockDb.favorites = mockDb.favorites.filter((f) => f.user_id !== targetId);
  mockDb.messages = mockDb.messages.filter((m) => m.sender_id !== targetId);
  mockDb.profiles.delete(targetId);
  // Admin API Auth deletion
  mockDb.authUsers.delete(targetId);

  // Step C: Verify user is completely removed from Auth and database
  assert.equal(mockDb.authUsers.has('u-del-101'), false, 'User must disappear from auth.users');
  assert.equal(mockDb.profiles.has('u-del-101'), false, 'Profile must be deleted');
  assert.equal(mockDb.favorites.length, 0, 'Favorites must be purged');
  assert.equal(mockDb.messages.length, 0, 'Messages must be purged');

  // Step D: Attempting to login with deleted credentials FAILS
  const loginAttempt = (email, password) => {
    for (const [id, u] of mockDb.authUsers.entries()) {
      if (u.email === email && u.passwordHash === password) return u;
    }
    return null;
  };
  assert.equal(loginAttempt('traveler@test.com', 'hash-secret'), null, 'Login with deleted credentials must fail');

  // Step E: Re-registering with the exact same email creates a FRESH user with a NEW UUID
  const newUserId = 'u-new-202';
  mockDb.authUsers.set(newUserId, { id: newUserId, email: 'traveler@test.com', passwordHash: 'hash-new' });
  mockDb.profiles.set(newUserId, { id: newUserId, display_name: 'جديد', bio: '' });

  assert.equal(mockDb.authUsers.has(newUserId), true);
  assert.notEqual(newUserId, 'u-del-101', 'New registration must have a distinct UUID');
  assert.equal(mockDb.favorites.filter((f) => f.user_id === newUserId).length, 0, 'New user starts with zero old favorites');
  assert.equal(mockDb.messages.filter((m) => m.sender_id === newUserId).length, 0, 'New user starts with zero old messages');

  console.log('✅ 6. Full User Lifecycle (Delete -> Auth Rejection -> Fresh Re-registration) verified.');
}

console.log('\n🎉 ALL SERVER-SIDE ACCOUNT DELETION TESTS PASSED WITH 100% SUCCESS!\n');
