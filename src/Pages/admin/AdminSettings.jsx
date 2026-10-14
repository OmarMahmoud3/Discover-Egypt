import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import AdminHeader from '../../Components/admin/AdminHeader';

export default function AdminSettings() {
  const { onToggleSidebar } = useOutletContext();
  const { session, profile, handleLogout } = useAdminAuth();
  const { lang, setLanguage } = useLanguage();
  const { ta, isArabic } = useAdminTranslation();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    showToast(
      newLang === 'ar'
        ? 'تم تغيير لغة لوحة التحكم إلى العربية'
        : 'Dashboard language switched to English'
    );
  };

  const userEmail = session?.user?.email || '—';
  const displayName = profile?.display_name || session?.user?.user_metadata?.full_name || 'Admin User';
  const role = profile?.role || 'admin';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Connected';

  return (
    <>
      <AdminHeader
        title={ta('admin.settings')}
        breadcrumbs={[
          { label: ta('admin.dashboard'), path: '/admin' },
          { label: ta('admin.settings') },
        ]}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile Card */}
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2 className="admin-section-title">
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                account_circle
              </span>
              {ta('admin.adminInfo')}
            </h2>
          </div>
          <div className="admin-section-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 166, 74, 0.16)',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '800',
                  border: '2px solid rgba(212, 166, 74, 0.3)',
                }}
              >
                {displayName?.[0]?.toUpperCase() || 'A'}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {userEmail}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span
                    className="admin-status-badge admin-status-published"
                    style={{
                      backgroundColor: 'rgba(212, 166, 74, 0.14)',
                      color: '#B8860B',
                      borderColor: 'rgba(212, 166, 74, 0.3)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                      verified_user
                    </span>
                    {ta('admin.currentRole')}: {role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System & Language Preferences */}
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2 className="admin-section-title">
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>
                tune
              </span>
              {ta('admin.dashboardSettings')}
            </h2>
          </div>
          <div className="admin-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Language Selection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>
                    {ta('admin.preferredLang')}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {isArabic ? 'اختر لغة عرض الواجهة ولوحة التحكم' : 'Choose interface and dashboard display language'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleLanguageChange('ar')}
                    className={`admin-btn ${lang === 'ar' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    العربية
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`admin-btn ${lang === 'en' ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Database Connection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>
                    {isArabic ? 'قاعدة بيانات Supabase' : 'Supabase Database'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {supabaseUrl}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--success-bg)',
                      color: 'var(--success)',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success)',
                      }}
                    />
                    {isArabic ? 'متصل' : 'Connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2 className="admin-section-title" style={{ color: 'var(--error)' }}>
              <span className="material-symbols-outlined">logout</span>
              {ta('admin.logout')}
            </h2>
          </div>
          <div className="admin-section-body">
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {isArabic
                ? 'تسجيل الخروج من جلسة المسؤول الحالية. ستحتاج لتسجيل الدخول مجدداً للوصول إلى لوحة التحكم.'
                : 'Sign out of your active admin session. You will need to log back in to access the dashboard.'}
            </p>
            <button
              onClick={handleLogout}
              className="admin-btn admin-btn-outline"
              style={{
                color: 'var(--error)',
                borderColor: 'rgba(220, 38, 38, 0.3)',
                backgroundColor: 'var(--error-bg)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                logout
              </span>
              <span>{ta('admin.logout')}</span>
            </button>
          </div>
        </div>
      </div>

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
