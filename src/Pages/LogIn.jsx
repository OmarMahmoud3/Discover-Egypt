import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BrandLogo from '../Components/BrandLogo';
import { useLanguage } from '../context/LanguageContext';

export default function LogIn({ session, onClose }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { t, isArabic } = useLanguage();

  // If user is already authenticated on /login route, automatically redirect to home
  useEffect(() => {
    if (session && window.location.pathname.toLowerCase().includes('/login')) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
        navigate('/');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session, onClose, navigate]);

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(t('auth.googleErrorPrefix') + err.message);
    }
  };

  // Submit email/password form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          setMessage(t('auth.successSignupLogged'));
          setTimeout(() => {
            if (onClose) onClose();
            navigate('/');
          }, 800);
        } else {
          setMessage(t('auth.successSignupConfirm'));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage(t('auth.successLogin'));
        setTimeout(() => {
          if (onClose) onClose();
          navigate('/');
        }, 800);
      }
    } catch (err) {
      setError(err.message || (isArabic ? 'حدث خطأ أثناء المعالجة' : 'An error occurred during authentication'));
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
    } else {
      setMessage(t('auth.successLogout'));
    }
  };

  const displayName = session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    '';

  return (
    <div
      className="auth-modal-shell"
      style={{
        width: '100%',
        maxWidth: '440px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-card)',
        padding: 'clamp(20px, 4.5vw, 36px) clamp(16px, 3.5vw, 30px)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        margin: '0 auto',
        position: 'relative',
        minWidth: 0,
      }}
    >
      {/* Close button if rendered in modal */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label={t('nav.closeModal')}
          title={t('nav.closeModal')}
          style={{
            position: 'absolute',
            top: '14px',
            insetInlineEnd: '14px',
            width: '38px',
            height: '38px',
            minWidth: '38px',
            minHeight: '38px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>
      )}

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <BrandLogo size="medium" layout="vertical" />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {t('auth.sub')}
        </p>
      </div>

      {session ? (
        /* Logged In View */
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--secondary-surface)',
              color: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              border: '1px solid var(--secondary)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              account_circle
            </span>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
            {t('auth.welcomeBack')}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {displayName}
          </p>

          <div
            style={{
              marginTop: '18px',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: '13px',
              textAlign: isArabic ? 'right' : 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('auth.emailLabel')}</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{session.user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('auth.accountStatus')}</span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{t('auth.activeStatus')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                navigate('/');
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                travel_explore
              </span>
              <span>{isArabic ? 'الانتقال إلى الموقع' : 'Go to Website'}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid rgba(185, 28, 28, 0.2)',
                cursor: 'pointer',
              }}
            >
              {t('auth.logoutBtn')}
            </button>
          </div>
        </div>
      ) : (
        /* Auth Form (Login / Signup) */
        <div>
          {/* Mode Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              padding: '3px',
              marginBottom: '18px',
            }}
          >
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'login' ? 'var(--primary)' : 'transparent',
                color: mode === 'login' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t('auth.loginTab')}
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
                setMessage('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'signup' ? 'var(--primary)' : 'transparent',
                color: mode === 'signup' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t('auth.signupTab')}
            </button>
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '13px',
              marginBottom: '14px',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              width="18"
              height="18"
            />
            <span>{t('auth.googleBtn')}</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '14px 0',
              color: 'var(--text-light)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span>{t('auth.orWithEmail')}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              minWidth: 0,
            }}
          >
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                  {t('auth.fullNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    minHeight: '42px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    fontSize: '14px',
                    color: 'var(--primary)',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                style={{
                  width: '100%',
                  minHeight: '42px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '14px',
                  color: 'var(--primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                {t('auth.passwordLabel')}
              </label>
              <input
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
                style={{
                  width: '100%',
                  minHeight: '42px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '14px',
                  color: 'var(--primary)',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--error-bg)',
                  color: 'var(--error)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                ✓ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '14px',
                marginTop: '4px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <span>
                {loading
                  ? t('auth.loadingText')
                  : mode === 'login'
                  ? t('auth.loginSubmitBtn')
                  : t('auth.signupSubmitBtn')}
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
