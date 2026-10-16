import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import '../../styles/admin.css';

/**
 * AdminRoute — Protected route wrapper.
 * - Loading → shows branded spinner
 * - Not authenticated or Not admin → renders 404 Not Found error page
 * - Admin → renders children
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isReady, loading, roleLoading } = useAdminAuth();
  const { ta, dir } = useAdminTranslation();

  // Loading state — verify session & role before rendering
  if (!isReady || loading || roleLoading) {
    return (
      <div
        dir={dir}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--secondary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '14px' }}>
          {ta('admin.checkingAuth') || 'جاري التحقق...'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Case 1: User is not authenticated -> Provide clear Admin Login prompt
  if (!isAuthenticated) {
    return (
      <div
        dir={dir}
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '40px 28px',
            boxShadow: '0 20px 48px rgba(18, 48, 74, 0.12)',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: 'rgba(212, 166, 74, 0.15)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#B8860B' }}>
              admin_panel_settings
            </span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
            {dir === 'rtl' ? 'بوابة إدارة المنصة' : 'Admin Portal Access'}
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            {dir === 'rtl'
              ? 'يتطلب الوصول إلى لوحة تحكم اكتشف مصر تسجيل الدخول بحساب مسؤول مصرح له.'
              : 'Access to the Discover Egypt management dashboard requires logging in with an authorized admin account.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/login"
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '12px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
              <span>{dir === 'rtl' ? 'تسجيل دخول المسؤول' : 'Sign In as Admin'}</span>
            </Link>

            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-low)',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              <span>{dir === 'rtl' ? 'العودة للرئيسية' : 'Return to Home'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: User is authenticated but NOT an admin -> Access Restricted
  if (!isAdmin) {
    return (
      <div
        dir={dir}
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '40px 28px',
            boxShadow: '0 20px 48px rgba(18, 48, 74, 0.12)',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--error)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              lock_person
            </span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
            {dir === 'rtl' ? 'غير مصرح بالدخول' : 'Access Restricted'}
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            {dir === 'rtl'
              ? 'حسابك مسجل بنجاح، ولكنه لا يملك الصلاحيات الإدارية الكافية للوصول إلى لوحة تحكم المنصة.'
              : 'You are signed in, but your account does not have sufficient administrator privileges to access this dashboard.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/"
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '12px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>home</span>
              <span>{dir === 'rtl' ? 'العودة للرئيسية' : 'Return to Home'}</span>
            </Link>

            <Link
              to="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-low)',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>switch_account</span>
              <span>{dir === 'rtl' ? 'تبديل الحساب' : 'Switch Account'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin verified → render protected content
  return children;
}

