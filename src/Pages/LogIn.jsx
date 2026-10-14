import { useState } from 'react';
import { supabase } from '../lib/supabase';
import BrandLogo from '../Components/BrandLogo';
import { useLanguage } from '../context/LanguageContext';

export default function LogIn({ session, onClose }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { t, isArabic } = useLanguage();

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
          }, 1500);
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
        }, 1200);
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
        maxWidth: '460px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: 'clamp(20px, 5vw, 36px) clamp(16px, 4vw, 28px)',
        boxShadow: '0 20px 48px rgba(18, 48, 74, 0.2)',
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
            top: '18px',
            insetInlineEnd: '18px',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-low)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            close
          </span>
        </button>
      )}

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <BrandLogo size="medium" layout="vertical" />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {t('auth.sub')}
        </p>
      </div>

      {session ? (
        /* Logged In View */
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '9999px',
              backgroundColor: 'var(--secondary-surface)',
              color: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '2px solid var(--secondary)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
              account_circle
            </span>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
            {t('auth.welcomeBack')}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {displayName}
          </p>

          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: '14px',
              backgroundColor: 'var(--surface-low)',
              fontSize: '13px',
              textAlign: isArabic ? 'right' : 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('auth.emailLabel')}</span>
              <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{session.user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('auth.accountStatus')}</span>
              <span style={{ color: 'var(--success)', fontWeight: '700' }}>{t('auth.activeStatus')}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error)',
              fontWeight: '700',
              fontSize: '14px',
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
          >
            {t('auth.logoutBtn')}
          </button>
        </div>
      ) : (
        /* Auth Form (Login / Signup) */
        <div>
          {/* Mode Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--surface-low)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '20px',
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
                padding: '9px',
                borderRadius: '10px',
                backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '14px',
                boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
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
                padding: '9px',
                borderRadius: '10px',
                backgroundColor: mode === 'signup' ? '#FFFFFF' : 'transparent',
                color: mode === 'signup' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '14px',
                boxShadow: mode === 'signup' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
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
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--border)',
              color: 'var(--primary)',
              fontWeight: '700',
              fontSize: '14px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-low)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              width="20"
              height="20"
            />
            <span>{t('auth.googleBtn')}</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '16px 0',
              color: 'var(--text-light)',
              fontSize: '12px',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            <span>{t('auth.orWithEmail')}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
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
                    maxWidth: '100%',
                    minHeight: '48px',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border)',
                    fontSize: '14px',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
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
                  maxWidth: '100%',
                  minHeight: '48px',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
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
                  maxWidth: '100%',
                  minHeight: '48px',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  fontSize: '14px',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--error-bg)',
                  color: 'var(--error)',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginTop: '4px',
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
                padding: '12px',
                fontSize: '15px',
                marginTop: '8px',
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
