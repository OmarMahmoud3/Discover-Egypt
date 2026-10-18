import { useState, useEffect, useCallback, useTransition } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import { useAdminAuth } from '../../context/AdminAuthContext';
import AdminHeader from '../../Components/admin/AdminHeader';
import ConfirmDialog from '../../Components/admin/ConfirmDialog';

export default function AdminUsers() {
  const { onToggleSidebar } = useOutletContext();
  const { ta, isArabic } = useAdminTranslation();
  const { profile: currentAdminProfile, session, refreshProfile } = useAdminAuth();
  const [, startTransition] = useTransition();

  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAuthUsers, setTotalAuthUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [edgeFunctionAvailable, setEdgeFunctionAvailable] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Copy User ID to clipboard
  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      showToast(ta('admin.idCopied'), 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy ID:', err);
    }
  };

  // Fetch users through Supabase Edge Function (admin-list-users or admin-users)
  // or resilient database fallback
  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const payload = {
        action: 'list_users',
        page,
        perPage,
        search: search.trim(),
        roleFilter,
      };

      // 1. Try 'admin-list-users'
      let edgeRes = await supabase.functions.invoke('admin-list-users', { body: payload });

      // 2. If 404, try 'admin-users' as fallback
      if (edgeRes.error && (edgeRes.error?.context?.status === 404 || edgeRes.error?.name === 'FunctionsHttpError')) {
        edgeRes = await supabase.functions.invoke('admin-users', { body: payload });
      }

      // If Edge Function succeeded, use real Auth-backed data
      if (!edgeRes.error && edgeRes.data && Array.isArray(edgeRes.data.users)) {
        setUsers(edgeRes.data.users);
        setTotalCount(edgeRes.data.total ?? edgeRes.data.users.length);
        setTotalAuthUsers(edgeRes.data.totalAuthUsers ?? edgeRes.data.total ?? edgeRes.data.users.length);
        setTotalPages(edgeRes.data.totalPages ?? 1);
        setEdgeFunctionAvailable(true);
        return;
      }

      // Mark Edge Function unavailable if both returned 404
      const is404 = edgeRes.error?.context?.status === 404 ||
        edgeRes.error?.message?.includes('404') ||
        edgeRes.error?.name === 'FunctionsHttpError';

      if (is404 || edgeFunctionAvailable === false) {
        setEdgeFunctionAvailable(false);
      }

      // Direct database query fallback
      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_language, role, created_at', { count: 'exact' });

      if (roleFilter === 'admin' || roleFilter === 'user') {
        query = query.eq('role', roleFilter);
      } else if (roleFilter === 'unassigned') {
        query = query.is('role', null);
      }

      if (search.trim()) {
        const term = search.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
        if (isUuid) {
          query = query.or(`display_name.ilike.%${term}%,id.eq.${term}`);
        } else {
          query = query.ilike('display_name', `%${term}%`);
        }
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      const { data: profileData, count, error: profileErr } = await query;
      if (profileErr) throw profileErr;

      const mappedUsers = (profileData || []).map((p) => {
        const isCurrent = p.id === session?.user?.id;
        return {
          id: p.id,
          email: isCurrent ? (session?.user?.email || '') : '',
          created_at: p.created_at,
          confirmed_at: isCurrent ? (session?.user?.confirmed_at || session?.user?.email_confirmed_at || null) : null,
          is_confirmed: isCurrent ? Boolean(session?.user?.confirmed_at || session?.user?.email_confirmed_at) : false,
          display_name: p.display_name || null,
          avatar_url: p.avatar_url || null,
          preferred_language: p.preferred_language || 'ar',
          role: p.role || null,
          has_profile: true,
        };
      });

      setUsers(mappedUsers);
      setTotalCount(count ?? mappedUsers.length);
      setTotalAuthUsers(count ?? mappedUsers.length);
      setTotalPages(Math.ceil((count ?? mappedUsers.length) / perPage) || 1);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err?.message || ta('admin.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, perPage, search, roleFilter, edgeFunctionAvailable, session, ta]);

  // Initial load
  useEffect(() => {
    let active = true;
    const execute = async () => {
      if (active) {
        await fetchUsers();
      }
    };
    execute();
    return () => {
      active = false;
    };
  }, [fetchUsers]);

  // Reset to page 1 on search or filter change
  const handleSearchChange = (val) => {
    startTransition(() => {
      setSearch(val);
      setPage(1);
    });
  };

  const handleRoleFilterChange = (val) => {
    setRoleFilter(val);
    setPage(1);
  };

  // Safe Role Change Handler
  const handleRoleChange = (targetUser) => {
    const isSelf = targetUser.id === currentAdminProfile?.id || targetUser.id === session?.user?.id;

    // Guard 1: Prevent Self-Demotion
    if (isSelf) {
      showToast(ta('admin.cannotDemoteSelf'), 'error');
      return;
    }

    const isTargetAdmin = targetUser.role === 'admin';
    const newRole = isTargetAdmin ? 'user' : 'admin';

    // Guard 2: Prevent Demoting Last Remaining Admin
    if (isTargetAdmin) {
      const activeAdminsInList = users.filter((u) => u.role === 'admin');
      if (activeAdminsInList.length <= 1 && totalCount <= 1) {
        showToast(ta('admin.cannotDemoteLastAdmin'), 'error');
        return;
      }
    }

    const displayName = targetUser.display_name || targetUser.email || targetUser.id.slice(0, 8);

    setConfirmDialog({
      open: true,
      title: ta('admin.confirmRoleChange'),
      message: isTargetAdmin
        ? ta('admin.confirmDemoteMsg').replace('{name}', displayName)
        : ta('admin.confirmPromoteMsg').replace('{name}', displayName),
      variant: newRole === 'admin' ? 'warning' : 'info',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          let updatedSuccessfully = false;
          let lastError = null;

          // Strategy 1: Stored Procedure RPC (admin_update_user_role)
          try {
            const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_update_user_role', {
              target_user_id: targetUser.id,
              new_role: newRole,
            });

            if (!rpcErr && (rpcData?.success || rpcData === true)) {
              updatedSuccessfully = true;
            } else if (rpcErr) {
              lastError = rpcErr;
            }
          } catch (rpcCatchErr) {
            lastError = rpcCatchErr;
          }

          // Strategy 2: Direct database update or upsert into public.profiles
          if (!updatedSuccessfully) {
            try {
              const { data: updateData, error: updateErr } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', targetUser.id)
                .select();

              if (!updateErr && updateData && updateData.length > 0) {
                updatedSuccessfully = true;
              } else {
                const { data: upsertData, error: upsertErr } = await supabase
                  .from('profiles')
                  .upsert(
                    {
                      id: targetUser.id,
                      role: newRole,
                      display_name: targetUser.display_name || targetUser.email?.split('@')[0] || 'User',
                    },
                    { onConflict: 'id' }
                  )
                  .select();

                if (!upsertErr && upsertData && upsertData.length > 0) {
                  updatedSuccessfully = true;
                } else if (upsertErr || updateErr) {
                  lastError = upsertErr || updateErr;
                }
              }
            } catch (dbCatchErr) {
              lastError = dbCatchErr;
            }
          }

          // Strategy 3: Supabase Edge Functions (admin-list-users / admin-users)
          if (!updatedSuccessfully && edgeFunctionAvailable !== false) {
            try {
              let updateRes = await supabase.functions.invoke('admin-list-users', {
                body: {
                  action: 'update_user_role',
                  targetUserId: targetUser.id,
                  newRole,
                },
              });

              let errorMsg = null;
              if (updateRes.error) {
                try {
                  const errorJson = await updateRes.error.context?.json();
                  if (errorJson?.error) errorMsg = errorJson.error;
                } catch {
                  // ignore
                }

                const fallbackRes = await supabase.functions.invoke('admin-users', {
                  body: {
                    action: 'update_user_role',
                    targetUserId: targetUser.id,
                    newRole,
                  },
                });

                if (!fallbackRes.error && !fallbackRes.data?.error) {
                  updatedSuccessfully = true;
                } else {
                  lastError = new Error(errorMsg || fallbackRes.error?.message || ta('admin.roleUpdateFailed'));
                }
              } else if (!updateRes.data?.error) {
                updatedSuccessfully = true;
              } else {
                lastError = new Error(updateRes.data?.error);
              }
            } catch (edgeCatchErr) {
              lastError = edgeCatchErr;
            }
          }

          if (!updatedSuccessfully && lastError) {
            throw lastError;
          }

          // Optimistically update local state immediately
          setUsers((prev) =>
            prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole, has_profile: true } : u))
          );

          showToast(
            newRole === 'admin'
              ? (isArabic ? 'تمت ترقية المستخدم إلى مسؤول بنجاح' : 'User promoted to administrator successfully')
              : (isArabic ? 'تم تحويل المستخدم إلى مستخدم عادي بنجاح' : 'User changed to regular user successfully'),
            'success'
          );

          // Allow database replication to complete before refreshing
          setTimeout(async () => {
            await fetchUsers(true);
            if (isSelf) {
              await refreshProfile();
            }
          }, 500);
        } catch (err) {
          console.error('Role update error:', err);
          showToast(err?.message || ta('admin.roleUpdateFailed'), 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog({ open: false });
        }
      },
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const startIdx = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endIdx = Math.min(page * perPage, totalCount);

  return (
    <>
      <AdminHeader
        title={ta('admin.usersManagement')}
        breadcrumbs={[
          { label: ta('admin.dashboard'), to: '/admin' },
          { label: ta('admin.usersManagement') },
        ]}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Error Banner with Retry Action */}
        {error && (
          <div className="admin-error-banner" style={{ alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              error
            </span>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => fetchUsers(true)}
              className="admin-btn admin-btn-outline"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                borderColor: 'var(--error)',
                color: 'var(--error)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
              <span>{ta('admin.retry')}</span>
            </button>
          </div>
        )}

        {/* Edge Function Notice Banner */}
        {edgeFunctionAvailable === false && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(212, 166, 74, 0.12)',
              border: '1px solid rgba(212, 166, 74, 0.35)',
              color: 'var(--primary)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              lineHeight: 1.5,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#B8860B', flexShrink: 0 }}
            >
              info
            </span>
            <div style={{ flex: 1 }}>
              {ta('admin.edgeFunctionNotice')}
            </div>
          </div>
        )}

        {/* Main Users Card */}
        <div className="admin-section-card">
          {/* Section Header with Totals and Controls */}
          <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="admin-section-title" style={{ margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                    manage_accounts
                  </span>
                  {ta('admin.usersManagement')}
                </h2>
                {totalAuthUsers > 0 && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--primary-surface)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {totalAuthUsers} {ta('admin.authUsersCount')}
                  </span>
                )}
              </div>

              {/* Distinction between current page slice and total filtered */}
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {ta('admin.paginationShowing')
                  .replace('{from}', startIdx)
                  .replace('{to}', endIdx)
                  .replace('{total}', totalCount)}
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                flex: '1 1 auto',
                justifyContent: 'flex-end',
              }}
            >
              {/* Search Input */}
              <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px', minWidth: '170px' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={ta('admin.searchUsersPlaceholder')}
                  className="admin-form-input"
                  style={{
                    width: '100%',
                    paddingInlineStart: '36px',
                    paddingInlineEnd: search ? '30px' : '12px',
                    minHeight: '40px',
                    fontSize: '13px',
                  }}
                />
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineStart: '10px',
                    transform: 'translateY(-50%)',
                    fontSize: '18px',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  search
                </span>
                {search && (
                  <button
                    onClick={() => handleSearchChange('')}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      insetInlineEnd: '8px',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                    }}
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  </button>
                )}
              </div>

              {/* Role Filter Dropdown */}
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                className="admin-form-input admin-form-select"
                style={{
                  flex: '0 0 auto',
                  minWidth: '130px',
                  minHeight: '40px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">{ta('admin.allRoles')}</option>
                <option value="admin">{ta('admin.admin')}</option>
                <option value="user">{ta('admin.user')}</option>
                <option value="unassigned">{ta('admin.filterUnassigned')}</option>
              </select>

              {/* Per Page Selector */}
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="admin-form-input admin-form-select"
                style={{
                  flex: '0 0 auto',
                  minWidth: '90px',
                  minHeight: '40px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                title={ta('admin.perPage')}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchUsers(true)}
                disabled={loading || refreshing}
                className="admin-btn admin-btn-outline"
                style={{ padding: '8px 12px', minWidth: '40px', minHeight: '40px' }}
                title={ta('admin.refresh')}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '18px',
                    animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                  }}
                >
                  refresh
                </span>
              </button>
            </div>
          </div>

          {/* Table / Cards Body */}
          <div className="admin-section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="admin-skeleton admin-skeleton-card" style={{ height: '54px' }} />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <span className="material-symbols-outlined">person_off</span>
                </div>
                <h3 className="admin-empty-title">{ta('admin.noUsersFound')}</h3>
                <p className="admin-empty-desc">{ta('admin.tryDifferentSearch')}</p>
                {(search || roleFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('all');
                      setPage(1);
                    }}
                    className="admin-btn admin-btn-outline"
                    style={{ marginTop: '12px' }}
                  >
                    {ta('admin.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View (>768px) */}
                <div className="admin-table-wrap admin-table-desktop">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '56px' }}>{ta('admin.avatar')}</th>
                        <th>{ta('admin.displayName')}</th>
                        <th>{ta('admin.email')}</th>
                        <th>{ta('admin.profileId')}</th>
                        <th>{ta('admin.verificationStatus')}</th>
                        <th>{ta('admin.role')}</th>
                        <th>{ta('admin.joinDate')}</th>
                        <th style={{ textAlign: 'center' }}>{ta('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isAdminRole = u.role === 'admin';
                        const isUserRole = u.role === 'user';
                        const isCurrentAdmin = currentAdminProfile?.id === u.id || session?.user?.id === u.id;

                        return (
                          <tr key={u.id}>
                            {/* Avatar */}
                            <td>
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.display_name || 'Avatar'}
                                  className="admin-table-thumb"
                                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: isAdminRole
                                      ? 'rgba(212, 166, 74, 0.18)'
                                      : 'var(--surface-container)',
                                    color: isAdminRole ? '#B8860B' : 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '15px',
                                    border: isAdminRole ? '1.5px solid rgba(212, 166, 74, 0.4)' : '1px solid var(--border)',
                                  }}
                                >
                                  {(u.display_name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                                </div>
                              )}
                            </td>

                            {/* Display Name */}
                            <td>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {u.display_name ? (
                                  <span style={{ color: 'var(--primary)' }}>{u.display_name}</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                                    {ta('admin.noProfile')}
                                  </span>
                                )}
                                {isCurrentAdmin && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      backgroundColor: 'var(--primary-surface)',
                                      color: 'var(--primary)',
                                      fontWeight: '800',
                                      border: '1px solid rgba(18, 48, 74, 0.15)',
                                    }}
                                  >
                                    {ta('admin.youBadge')}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Email Address */}
                            <td>
                              {u.email ? (
                                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                                  {u.email}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  —
                                </span>
                              )}
                            </td>

                            {/* User ID with Copy Action */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    color: 'var(--text-muted)',
                                    maxWidth: '120px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={u.id}
                                >
                                  {u.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(u.id)}
                                  className="admin-btn-icon"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    minWidth: '26px',
                                    borderRadius: '6px',
                                  }}
                                  title={ta('admin.copyId')}
                                  aria-label={ta('admin.copyId')}
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{
                                      fontSize: '15px',
                                      color: copiedId === u.id ? 'var(--success)' : 'inherit',
                                    }}
                                  >
                                    {copiedId === u.id ? 'check' : 'content_copy'}
                                  </span>
                                </button>
                              </div>
                            </td>

                            {/* Confirmation Status Badge */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: u.is_confirmed ? 'var(--success-bg)' : '#FEF3C7',
                                  color: u.is_confirmed ? 'var(--success)' : '#92400E',
                                  border: `1px solid ${u.is_confirmed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                  {u.is_confirmed ? 'check_circle' : 'schedule'}
                                </span>
                                {u.is_confirmed ? ta('admin.confirmed') : ta('admin.unconfirmed')}
                              </span>
                            </td>

                            {/* Role Badge */}
                            <td>
                              {isAdminRole ? (
                                <span
                                  className="admin-status-badge admin-status-published"
                                  style={{
                                    backgroundColor: 'rgba(212, 166, 74, 0.16)',
                                    color: '#B8860B',
                                    borderColor: 'rgba(212, 166, 74, 0.4)',
                                    fontWeight: 800,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                    shield_person
                                  </span>
                                  {ta('admin.admin')}
                                </span>
                              ) : isUserRole ? (
                                <span className="admin-status-badge admin-status-draft" style={{ fontWeight: 600 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                    person
                                  </span>
                                  {ta('admin.user')}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    border: '1px dashed var(--border)',
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'var(--surface-low)',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                    help_outline
                                  </span>
                                  {ta('admin.noRole')}
                                </span>
                              )}
                            </td>

                            {/* Join Date */}
                            <td>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {formatDate(u.created_at)}
                              </span>
                            </td>

                            {/* Role Action Button */}
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleRoleChange(u)}
                                disabled={isCurrentAdmin || actionLoading}
                                className={`admin-btn ${
                                  isAdminRole ? 'admin-btn-outline' : 'admin-btn-gold'
                                }`}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  opacity: isCurrentAdmin ? 0.45 : 1,
                                  cursor: isCurrentAdmin ? 'not-allowed' : 'pointer',
                                }}
                                title={
                                  isCurrentAdmin
                                    ? ta('admin.cannotDemoteSelf')
                                    : isAdminRole
                                    ? ta('admin.demoteToUser')
                                    : ta('admin.promoteToAdmin')
                                }
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                  {isAdminRole ? 'arrow_downward' : 'upgrade'}
                                </span>
                                <span>
                                  {isAdminRole ? ta('admin.demoteToUser') : ta('admin.promoteToAdmin')}
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (<768px) */}
                <div className="admin-mobile-cards" style={{ padding: '12px' }}>
                  {users.map((u) => {
                    const isAdminRole = u.role === 'admin';
                    const isUserRole = u.role === 'user';
                    const isCurrentAdmin = currentAdminProfile?.id === u.id || session?.user?.id === u.id;

                    return (
                      <div
                        key={u.id}
                        className="admin-mobile-card"
                        style={{
                          border: isAdminRole ? '1.5px solid rgba(212, 166, 74, 0.4)' : undefined,
                        }}
                      >
                        <div className="admin-mobile-card-header">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.display_name || 'Avatar'}
                              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                backgroundColor: isAdminRole ? 'rgba(212, 166, 74, 0.18)' : 'var(--surface-container)',
                                color: isAdminRole ? '#B8860B' : 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '800',
                                fontSize: '15px',
                              }}
                            >
                              {(u.display_name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.display_name || (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 500 }}>
                                    {ta('admin.noProfile')}
                                  </span>
                                )}
                              </span>
                              {isCurrentAdmin && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--primary-surface)',
                                    color: 'var(--primary)',
                                    fontWeight: '800',
                                    flexShrink: 0,
                                  }}
                                >
                                  {ta('admin.youBadge')}
                                </span>
                              )}
                            </div>
                            {u.email && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.email}
                              </div>
                            )}
                          </div>

                          {/* Role Badge */}
                          {isAdminRole ? (
                            <span
                              className="admin-status-badge admin-status-published"
                              style={{
                                backgroundColor: 'rgba(212, 166, 74, 0.16)',
                                color: '#B8860B',
                                borderColor: 'rgba(212, 166, 74, 0.4)',
                                flexShrink: 0,
                              }}
                            >
                              {ta('admin.admin')}
                            </span>
                          ) : isUserRole ? (
                            <span className="admin-status-badge admin-status-draft" style={{ flexShrink: 0 }}>
                              {ta('admin.user')}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px dashed var(--border)',
                                color: 'var(--text-muted)',
                                flexShrink: 0,
                              }}
                            >
                              {ta('admin.noRole')}
                            </span>
                          )}
                        </div>

                        <div className="admin-mobile-card-body">
                          {/* Confirmation Status */}
                          <div className="admin-mobile-card-row">
                            <span className="admin-mobile-card-label">{ta('admin.verificationStatus')}</span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: u.is_confirmed ? 'var(--success)' : '#92400E',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                {u.is_confirmed ? 'check_circle' : 'schedule'}
                              </span>
                              {u.is_confirmed ? ta('admin.confirmed') : ta('admin.unconfirmed')}
                            </span>
                          </div>

                          {/* User ID */}
                          <div className="admin-mobile-card-row">
                            <span className="admin-mobile-card-label">{ta('admin.profileId')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                {u.id.slice(0, 10)}...{u.id.slice(-4)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyId(u.id)}
                                className="admin-btn-icon"
                                style={{ width: '24px', height: '24px', minWidth: '24px' }}
                                aria-label={ta('admin.copyId')}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                  {copiedId === u.id ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Registration Date */}
                          <div className="admin-mobile-card-row">
                            <span className="admin-mobile-card-label">{ta('admin.joinDate')}</span>
                            <span>{formatDate(u.created_at)}</span>
                          </div>
                        </div>

                        <div className="admin-mobile-card-actions">
                          <button
                            onClick={() => handleRoleChange(u)}
                            disabled={isCurrentAdmin || actionLoading}
                            className={`admin-btn ${
                              isAdminRole ? 'admin-btn-outline' : 'admin-btn-gold'
                            }`}
                            style={{
                              width: '100%',
                              minHeight: '44px',
                              justifyContent: 'center',
                              opacity: isCurrentAdmin ? 0.45 : 1,
                              cursor: isCurrentAdmin ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              {isAdminRole ? 'arrow_downward' : 'upgrade'}
                            </span>
                            <span>
                              {isAdminRole ? ta('admin.demoteToUser') : ta('admin.promoteToAdmin')}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderTop: '1px solid var(--border)',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {ta('admin.pageOf')
                        .replace('{page}', page)
                        .replace('{totalPages}', totalPages)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className="admin-btn admin-btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                          chevron_right
                        </span>
                        <span>{ta('admin.previous')}</span>
                      </button>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                          .map((p, idx, arr) => {
                            const prevP = arr[idx - 1];
                            const showEllipsis = prevP && p - prevP > 1;

                            return (
                              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {showEllipsis && (
                                  <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
                                )}
                                <button
                                  onClick={() => setPage(p)}
                                  className={`admin-btn ${
                                    page === p ? 'admin-btn-primary' : 'admin-btn-outline'
                                  }`}
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    padding: 0,
                                    fontSize: '13px',
                                  }}
                                >
                                  {p}
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className="admin-btn admin-btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <span>{ta('admin.next')}</span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                          chevron_left
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={ta('admin.confirm')}
        cancelLabel={ta('admin.cancel')}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
        loading={actionLoading}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div
          className={`admin-toast ${
            toast.type === 'error' ? 'admin-toast-error' : 'admin-toast-success'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
