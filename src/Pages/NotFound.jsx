import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function NotFound() {
  const { isArabic, dir } = useLanguage();

  return (
    <div
      dir={dir}
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '48px 32px',
          boxShadow: '0 10px 40px rgba(18, 48, 74, 0.08)',
          border: '1px solid rgba(18, 48, 74, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Animated Badge / Icon */}
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            backgroundColor: 'rgba(212, 166, 74, 0.14)',
            color: 'var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            border: '2px solid rgba(212, 166, 74, 0.3)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>
            travel_explore
          </span>
        </div>

        {/* 404 Header */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '900',
            lineHeight: 1,
            color: 'var(--primary)',
            letterSpacing: '0.04em',
            marginBottom: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--primary)',
            marginBottom: '12px',
          }}
        >
          {isArabic ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-muted)',
            lineHeight: 1.8,
            marginBottom: '32px',
            maxWidth: '420px',
          }}
        >
          {isArabic
            ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها. قد يكون الرابط خاطئاً أو لم تعد الصفحة متوفرة.'
            : 'Sorry, the page you are looking for does not exist or has been moved. The link might be incorrect.'}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              home
            </span>
            <span>{isArabic ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>

          <Link to="/explore" className="btn-outline">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              explore
            </span>
            <span>{isArabic ? 'استكشف المعالم' : 'Explore Places'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
