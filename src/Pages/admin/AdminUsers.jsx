import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import { useAdminAuth } from '../../context/AdminAuthContext';
import AdminHeader from '../../Components/admin/AdminHeader';
import ConfirmDialog from '../../Components/admin/ConfirmDialog';

export default function AdminUsers() {
  const { onToggleSidebar } = useOutletContext();
  const { ta, isArabic } = useAdminTranslation();
  const { profile: currentAdminProfile } = useAdminAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_language, role, created_at')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err?.message || ta('admin.loadError'));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, ta]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const nameMatch = (u.display_name || '').toLowerCase().includes(term);
    const idMatch = (u.id || '').toLowerCase().includes(term);
    const roleMatch = (u.role || '').toLowerCase().includes(term);
    return nameMatch || idMatch || roleMatch;
  });

  const handleRoleChange = (user) => {
    const isTargetAdmin = user.role === 'admin';
    const newRole = isTargetAdmin ? 'user' : 'admin';

    setConfirmDialog({
      open: true,
      title: isArabic ? 'تغيير صلاحية المستخدم' : 'Change User Role',
      message: isArabic
        ? `هل أنت متأكد من تغيير دور "${user.display_name || user.id}" إلى (${newRole === 'admin' ? 'مسؤول Admin' : 'مستخدم عادي User'})؟`
        : `Are you sure you want to change the role of "${user.display_name || user.id}" to (${newRole})?`,
      variant: newRole === 'admin' ? 'warning' : 'info',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', user.id);

          if (updateErr) throw updateErr;

          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
          );
          showToast(
            isArabic
              ? `تم تحديث صلاحية المستخدم إلى ${newRole}`
              : `User role updated to ${newRole}`
          );
        } catch (err) {
          console.error('Role update error:', err);
          showToast(err?.message || ta('admin.operationFailed'), 'error');
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

  return (
    <>
      <AdminHeader
        title={ta('admin.users')}
        breadcrumbs={[
          { label: ta('admin.dashboard'), path: '/admin' },
          { label: ta('admin.users') },
        ]}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="admin-content">
        {error && (
          <div className="admin-error-banner">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              error
            </span>
            {error}
            <button
              onClick={fetchUsers}
              className="admin-btn admin-btn-ghost"
              style={{ marginInlineStart: 'auto' }}
            >
              {ta('admin.refresh')}
            </button>
          </div>
        )}

        <div className="admin-section-card">
          {/* Header & Controls */}
          <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="admin-section-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                  group
                </span>
                {ta('admin.usersManagement')}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {isArabic ? 'إدارة حسابات وصلاحيات المسجلين في النظام' : 'Manage registered user accounts & roles'}
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isArabic ? 'بحث بالاسم أو المعرّف...' : 'Search by name or ID...'}
                  className="admin-input"
                  style={{ width: '220px', paddingInlineStart: '34px' }}
                />
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    [isArabic ? 'right' : 'left']: '10px',
                    transform: 'translateY(-50%)',
                    fontSize: '18px',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  search
                </span>
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="admin-input"
                style={{ width: '140px' }}
              >
                <option value="all">{isArabic ? 'جميع الأدوار' : 'All Roles'}</option>
                <option value="admin">{ta('admin.admin')}</option>
                <option value="user">{ta('admin.user')}</option>
              </select>

              <button
                onClick={fetchUsers}
                className="admin-btn admin-btn-outline"
                style={{ padding: '8px 12px' }}
                title={ta('admin.refresh')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  refresh
                </span>
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div className="admin-section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="admin-skeleton admin-skeleton-card" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <span className="material-symbols-outlined">person_off</span>
                </div>
                <h3 className="admin-empty-title">
                  {search ? (isArabic ? 'لا توجد نتائج مطابقة' : 'No matching users') : (isArabic ? 'لا يوجد مستخدمون مسجلون' : 'No users registered yet')}
                </h3>
                <p className="admin-empty-desc">
                  {search
                    ? (isArabic ? 'جرب البحث بكلمة أخرى' : 'Try searching with a different term')
                    : (isArabic ? 'سيظهر المستخدمون هنا عند تسجيل حسابات جديدة في الموقع' : 'Users will appear here when accounts are created')}
                </p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{ta('admin.avatar')}</th>
                      <th>{ta('admin.displayName')}</th>
                      <th>{ta('admin.role')}</th>
                      <th>{ta('admin.preferredLang')}</th>
                      <th>{ta('admin.joinDate')}</th>
                      <th>{ta('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isAdminRole = u.role === 'admin';
                      const isCurrentAdmin = currentAdminProfile?.id === u.id;

                      return (
                        <tr key={u.id}>
                          <td>
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.display_name || 'Avatar'}
                                className="admin-table-thumb"
                                style={{ borderRadius: '50%' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  backgroundColor: isAdminRole
                                    ? 'rgba(212, 166, 74, 0.16)'
                                    : 'var(--surface-container)',
                                  color: isAdminRole ? 'var(--gold)' : 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '700',
                                  fontSize: '14px',
                                }}
                              >
                                {(u.display_name?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.display_name || (isArabic ? 'بدون اسم' : 'Unnamed User')}</span>
                              {isCurrentAdmin && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--primary-surface)',
                                    color: 'var(--primary)',
                                    fontWeight: '700',
                                  }}
                                >
                                  {isArabic ? 'أنت' : 'You'}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {u.id}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`admin-status-badge ${
                                isAdminRole ? 'admin-status-published' : 'admin-status-draft'
                              }`}
                              style={
                                isAdminRole
                                  ? {
                                      backgroundColor: 'rgba(212, 166, 74, 0.14)',
                                      color: '#B8860B',
                                      borderColor: 'rgba(212, 166, 74, 0.3)',
                                    }
                                  : undefined
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                {isAdminRole ? 'shield_person' : 'person'}
                              </span>
                              {isAdminRole ? ta('admin.admin') : ta('admin.user')}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>
                              {u.preferred_language || 'ar'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              {formatDate(u.created_at)}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleRoleChange(u)}
                              disabled={isCurrentAdmin || actionLoading}
                              className="admin-btn admin-btn-outline"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                opacity: isCurrentAdmin ? 0.5 : 1,
                                cursor: isCurrentAdmin ? 'not-allowed' : 'pointer',
                              }}
                              title={
                                isCurrentAdmin
                                  ? (isArabic ? 'لا يمكنك تغيير صلاحيتك الخاصة' : 'Cannot change your own role')
                                  : undefined
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                swap_horiz
                              </span>
                              <span>
                                {isAdminRole
                                  ? (isArabic ? 'تحويل لمستخدم' : 'Demote to User')
                                  : (isArabic ? 'ترقية لمسؤول' : 'Promote to Admin')}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
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

      {/* Toast */}
      {toast && (
        <div
          className={`admin-toast ${
            toast.type === 'error' ? 'admin-toast-error' : 'admin-toast-success'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}
    </>
  );
}
