import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLACES_DATA } from '../data/placesData';
import { supabase } from '../lib/supabase';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

function GalleryViewer({ place, placeName }) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const gallery = place.gallery && place.gallery.length > 0 ? place.gallery : [
    { title: place.name, badge: 'المعلم', url: place.image, alt: place.name }
  ];

  const currentImage = gallery[selectedImgIndex]?.url || place.image;
  const currentTitle = gallery[selectedImgIndex]?.title || placeName;

  return (
    <section
      key={place.id}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        backgroundColor: 'var(--primary-dark)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: 'clamp(240px, 48vh, 420px)' }}>
        <img
          src={currentImage}
          alt={gallery[selectedImgIndex]?.alt || placeName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.3s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(18, 48, 74, 0.92) 0%, rgba(18, 48, 74, 0.25) 50%, transparent 100%)',
          }}
        />

        {/* Top Badges */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            insetInlineEnd: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            zIndex: 2,
          }}
        >
          {(place.badges || []).map((badge, idx) => (
            <div
              key={idx}
              className={idx === 0 ? 'badge badge-unesco' : 'badge badge-wonder'}
              style={{ fontSize: '12px' }}
            >
              <span
                className="material-symbols-outlined material-filled"
                style={{ fontSize: '15px', color: idx === 0 ? 'var(--secondary)' : 'var(--gold-dark)' }}
              >
                {idx === 0 ? 'verified' : 'auto_awesome'}
              </span>
              <span>{badge}</span>
            </div>
          ))}
        </div>

        {/* Bottom Image Caption & Dots */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(18, 48, 74, 0.85)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--gold)' }}>
              photo_camera
            </span>
            <span>
              {gallery.length > 1 ? `${selectedImgIndex + 1} / ${gallery.length}` : '1 / 1'}
            </span>
            <span style={{ opacity: 0.5 }}>—</span>
            <span style={{ color: 'var(--beige)' }}>{currentTitle}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {gallery.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImgIndex(idx)}
                style={{
                  width: '36px',
                  height: '36px',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-label={`Show photo ${idx + 1}`}
              >
                <span
                  style={{
                    display: 'block',
                    width: idx === selectedImgIndex ? '20px' : '10px',
                    height: '10px',
                    borderRadius: '9999px',
                    backgroundColor: idx === selectedImgIndex ? 'var(--gold)' : 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    transition: 'all 0.2s ease',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PlaceDetails() {
  const { id } = useParams();
  const placeId = id || 'giza-pyramids';

  const [supabasePlace, setSupabasePlace] = useState(null);
  const [loadingSupabase, setLoadingSupabase] = useState(true);
  const [hasCheckedSupabase, setHasCheckedSupabase] = useState(false);

  const { isFavorite, toggleFavorite, showToast } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceLocation, getPlaceDescription, getPlaceGateInfo } = useLanguage();

  // Find static place as immediate fallback
  const staticPlace = PLACES_DATA.find((p) => p.id === placeId || p.slug === placeId || p.alias === placeId);

  // Check Supabase database so administrative edits take precedence
  useEffect(() => {
    let isMounted = true;
    supabase
      .from('places')
      .select('*')
      .or(`id.eq.${placeId},slug.eq.${placeId}`)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        setLoadingSupabase(false);
        setHasCheckedSupabase(true);
        if (!error && data) {
          const galleryItems = Array.isArray(data.gallery) && data.gallery.length > 0
            ? data.gallery.map((img) => typeof img === 'string' ? { url: img, title: data.name, alt: data.name } : img)
            : [{ url: data.image_url || staticPlace?.image, title: data.name, alt: data.name }];

          setSupabasePlace({
            id: data.id,
            name: data.name,
            name_en: data.name_en || data.name,
            nameEn: data.name_en || data.name,
            city: data.city || (isArabic ? 'مصر' : 'Egypt'),
            city_en: data.city_en || data.city || 'Egypt',
            cityEn: data.city_en || data.city || 'Egypt',
            cityKey: (data.city_en || data.city || '').toLowerCase(),
            category: data.category || (isArabic ? 'معلم سياحي' : 'Attraction'),
            category_en: data.category_en || data.category || 'Attraction',
            categoryEn: data.category_en || data.category || 'Attraction',
            rating: staticPlace?.rating || 4.9,
            reviewCount: staticPlace?.reviewCount || '1,450',
            image: data.image_url || staticPlace?.image,
            gallery: galleryItems,
            historicalText: data.description || staticPlace?.historicalText || (isArabic ? 'معلم سياحي وتراثي متميز في جمهورية مصر العربية.' : 'A distinguished tourism and heritage site in Egypt.'),
            historicalTextEn: data.description_en || data.description || staticPlace?.historicalTextEn || 'A distinguished tourism and heritage site in Egypt.',
            location: staticPlace?.location || (isArabic ? `${data.city || 'مصر'}، جمهورية مصر العربية` : `${data.city_en || data.city || 'Egypt'}, Egypt`),
            locationEn: staticPlace?.locationEn || `${data.city_en || data.city || 'Egypt'}, Egypt`,
            gateInfo: staticPlace?.gateInfo || (isArabic ? 'يُنصح بالحجز عبر البوابة الرسمية' : 'Bookings advised through official gate'),
            gateInfoEn: staticPlace?.gateInfoEn || 'Bookings advised through official gate',
            mapsUrl: data.latitude && data.longitude ? `https://maps.google.com/?q=${data.latitude},${data.longitude}` : (staticPlace?.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(data.name_en || data.name)}`),
            badges: staticPlace?.badges || (isArabic ? ['معلم موثق', 'تراث وطني'] : ['Documented Landmark', 'National Heritage']),
            badgesEn: staticPlace?.badgesEn || ['Documented Landmark', 'National Heritage'],
            quickInfo: staticPlace?.quickInfo || {
              hours: '08:00 ص – 05:00 م',
              hoursEn: '08:00 AM – 05:00 PM',
              season: 'طوال العام',
              seasonEn: 'Year-round',
              duration: 'ساعتان مقترحة',
              durationEn: '2 hours suggested',
              payment: 'دفع إلكتروني بالبطاقات',
              paymentEn: 'Electronic card payment only',
            },
            metrics: staticPlace?.metrics || [
              { label: isArabic ? 'التقييم' : 'Rating', value: '4.9 ★', sub: isArabic ? 'تقييم الزوار' : 'Visitor rating' },
              { label: isArabic ? 'المدينة' : 'City', value: isArabic ? (data.city || 'مصر') : (data.city_en || 'Egypt'), sub: isArabic ? 'الموقع' : 'Location' },
            ],
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingSupabase(false);
          setHasCheckedSupabase(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [placeId, staticPlace, isArabic]);

  // Prioritize Supabase admin edits over static placeholder
  const place = supabasePlace || staticPlace || PLACES_DATA[0];

  // Loading state for dynamic lookup
  if (!staticPlace && loadingSupabase) {
    return (
      <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  // Not Found fallback if ID was explicitly provided and does not exist in PLACES_DATA or Supabase
  if (!staticPlace && hasCheckedSupabase && !place) {
    return (
      <div style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--gold-dark)', marginBottom: '16px' }}>
          explore_off
        </span>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)', marginBottom: '12px' }}>
          {isArabic ? 'المعلم غير موجود' : 'Destination Not Found'}
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '440px', marginBottom: '24px', lineHeight: 1.6 }}>
          {isArabic
            ? 'عذراً، لم نتمكن من العثور على المعلم المطلوب. قد يكون تم نقله أو أن الرابط غير صحيح.'
            : 'Sorry, we could not find the destination you requested. It may have been moved or the URL is incorrect.'}
        </p>
        <Link to="/explore" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', textDecoration: 'none' }}>
          <span className="material-symbols-outlined icon-flip-ltr">arrow_forward</span>
          <span>{isArabic ? 'استكشف المعالم الأخرى' : 'Explore All Destinations'}</span>
        </Link>
      </div>
    );
  }

  // Resolved place object

  const activePlace = place;
  const saved = isFavorite(place.id);
  const placeName = getPlaceName(place);

  // Web Share API
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${placeName} — Discover Egypt`,
        text: isArabic
          ? `استكشف عظمة ${placeName} على منصة اكتشف مصر للسياحة والتراث`
          : `Explore the majesty of ${placeName} on the Discover Egypt platform`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast(t('details.shareCopiedToast'));
    }
  };

  const metrics = isArabic ? activePlace.metrics : (activePlace.metricsEn || activePlace.metrics);
  const quickInfo = activePlace.quickInfo || {};
  const hours = isArabic ? quickInfo.hours : (quickInfo.hoursEn || quickInfo.hours);
  const hoursSub = isArabic ? quickInfo.hoursSub : (quickInfo.hoursSubEn || quickInfo.hoursSub);
  const season = isArabic ? quickInfo.season : (quickInfo.seasonEn || quickInfo.season);
  const seasonSub = isArabic ? quickInfo.seasonSub : (quickInfo.seasonSubEn || quickInfo.seasonSub);
  const duration = isArabic ? quickInfo.duration : (quickInfo.durationEn || quickInfo.duration);
  const durationSub = isArabic ? quickInfo.durationSub : (quickInfo.durationSubEn || quickInfo.durationSub);
  const payment = isArabic ? quickInfo.payment : (quickInfo.paymentEn || quickInfo.payment);
  const paymentSub = isArabic ? quickInfo.paymentSub : (quickInfo.paymentSubEn || quickInfo.paymentSub);

  return (
    <div className="place-details-page" style={{ backgroundColor: 'var(--surface)', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Sub-Header Breadcrumb & Action Bar */}
      <div className="place-details-subheader">
        <div
          className="container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <Link
              to="/explore"
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}
              title={t('details.back')}
            >
              <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '18px' }}>
                arrow_forward
              </span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', minWidth: 0, overflow: 'hidden' }}>
              <Link to="/explore" style={{ color: 'var(--text-light)', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {t('nav.explore')}
              </Link>
              <span style={{ color: 'var(--text-light)', flexShrink: 0 }}>/</span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {placeName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleShare}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
              title={t('details.share')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                share
              </span>
            </button>
            <button
              onClick={() => toggleFavorite(place.id, placeName)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: saved ? 'var(--secondary-surface)' : 'var(--surface)',
                border: saved ? '1px solid var(--secondary)' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: saved ? 'var(--secondary)' : 'var(--primary)',
              }}
              title={saved ? t('details.savedInFavorites') : t('details.addToFavorites')}
            >
              <span
                className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`}
                style={{ fontSize: '18px' }}
              >
                {saved ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '24px' }}>
        {/* Full-width Archival Gallery */}
        <GalleryViewer key={placeId} place={place} placeName={placeName} />

        {/* Dual-Column Editorial Layout */}
        <div className="monograph-grid">
          {/* Main Monograph Column */}
          <div>
            {/* Title & Metadata */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--secondary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  location_on
                </span>
                <span>{getPlaceLocation(place)}</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(28px, 4vw, 38px)',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  lineHeight: 1.25,
                  marginBottom: '14px',
                  letterSpacing: '-0.02em',
                }}
              >
                {placeName}
              </h1>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--gold-surface)',
                    border: '1px solid var(--gold)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--primary)',
                    fontWeight: 800,
                  }}
                >
                  <span className="material-symbols-outlined material-filled" style={{ fontSize: '16px', color: 'var(--gold-dark)' }}>
                    star
                  </span>
                  <span>{place.rating}</span>
                </div>
                <span>•</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {place.reviewCount} {t('details.verifiedReviews')}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--secondary)', fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    verified_user
                  </span>
                  {t('details.verifiedSite')}
                </span>
              </div>
            </div>

            {/* Historical Narrative (Travel Journalism Style) */}
            <article
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-card)',
                padding: 'clamp(20px, 3.5vw, 32px)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '28px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--secondary)' }}>
                  history_edu
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                  {t('details.historySectionTitle')}
                </h2>
              </div>

              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.85,
                  textAlign: isArabic ? 'justify' : 'left',
                  marginBottom: '24px',
                }}
              >
                {getPlaceDescription(place)}
              </p>

              {/* Architectural Metrics */}
              {metrics && metrics.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {metrics.map((metric, idx) => (
                    <div key={idx} style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 900,
                          color: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--secondary)' : 'var(--gold-dark)',
                          lineHeight: 1.2,
                        }}
                      >
                        {metric.value}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            {/* Field Guidelines & Practical Tips */}
            {place.tips && place.tips.length > 0 && (
              <section
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-card)',
                  padding: 'clamp(20px, 3.5vw, 32px)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '28px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--primary)' }}>
                    tips_and_updates
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                    {t('details.guidelinesTitle')}
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {place.tips.map((tip, idx) => {
                    const tipTitle = isArabic ? tip.title : (tip.titleEn || tip.title);
                    const tipDesc = isArabic ? tip.desc : (tip.descEn || tip.desc);

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: idx === 0 ? 'var(--surface-container)' : idx === 1 ? 'var(--secondary-surface)' : 'var(--gold-surface)',
                            color: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--secondary)' : 'var(--gold-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            {tip.icon}
                          </span>
                        </div>
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                            {tipTitle}
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.6, margin: 0 }}>
                            {tipDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Column: "Field Notes & Visitor Briefing" */}
          <div>
            <aside className="field-notes-panel" style={{ position: 'sticky', top: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>
                  menu_book
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
                  {isArabic ? 'إرشادات الزيارة الميدانية' : 'Field Notes & Briefing'}
                </span>
              </div>

              {/* 4 Briefing Blocks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
                {/* Hours */}
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '2px' }}>
                    {t('details.workingHours')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>{hours}</div>
                  <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 600 }}>{hoursSub}</div>
                </div>

                {/* Best Season */}
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '2px' }}>
                    {t('details.bestSeason')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>{season}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{seasonSub}</div>
                </div>

                {/* Duration */}
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '2px' }}>
                    {t('details.suggestedDuration')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>{duration}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{durationSub}</div>
                </div>

                {/* Payment */}
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '2px' }}>
                    {t('details.paymentMethod')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>{payment}</div>
                  <div style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 700 }}>{paymentSub}</div>
                </div>
              </div>

              {/* Geographic Gate Info */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginBottom: '18px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
                  {isArabic ? 'بوابات الوصول ومواقف السيارات' : 'Access Gate & Arrival'}
                </div>
                <div>{getPlaceGateInfo(place)}</div>
              </div>

              {/* Map Route Launcher */}
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ width: '100%', marginBottom: '10px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  directions
                </span>
                <span>{t('details.routeBtn')}</span>
              </a>

              {/* Bookmark In Sidebar */}
              <button
                type="button"
                onClick={() => toggleFavorite(place.id, placeName)}
                className="btn-outline"
                style={{ width: '100%' }}
              >
                <span className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`} style={{ fontSize: '18px', color: saved ? 'var(--secondary)' : 'inherit' }}>
                  {saved ? 'bookmark' : 'bookmark_border'}
                </span>
                <span>{saved ? t('details.savedBtn') : t('details.saveBtn')}</span>
              </button>
            </aside>
          </div>
        </div>

        {/* Nearby Historic Attractions */}
        {place.nearby && place.nearby.length > 0 && (
          <section style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <div>
                <div className="editorial-tag" style={{ marginBottom: '4px' }}>
                  <span>{t('details.within20km')}</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                  {t('details.nearbyTitle')}
                </h2>
              </div>
            </div>

            <div className="nearby-places-grid">
              {place.nearby.map((near, idx) => {
                const nearName = isArabic ? near.name : (near.nameEn || near.name);
                const nearDesc = isArabic ? near.desc : (near.descEn || near.desc);
                const nearDist = isArabic ? near.dist : (near.distEn || near.dist);
                const nearTime = isArabic ? near.time : (near.timeEn || near.time);

                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', height: '140px' }}>
                      <img
                        src={near.image}
                        alt={nearName}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          insetInlineEnd: '8px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(18, 48, 74, 0.88)',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {nearDist}
                      </div>
                    </div>

                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 6px' }}>
                          {nearName}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                          {nearDesc}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '14px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 600 }}>
                          {nearTime}
                        </span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Bottom Floating Action Bar for Mobile */}
      <div
        className="place-details-bar"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          zIndex: 85,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          padding: '10px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={() => toggleFavorite(place.id, placeName)}
            style={{
              height: '44px',
              padding: '0 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: saved ? 'var(--secondary-surface)' : 'var(--surface)',
              border: saved ? '1px solid var(--secondary)' : '1px solid var(--border)',
              color: saved ? 'var(--secondary)' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            <span
              className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`}
              style={{ fontSize: '18px' }}
            >
              {saved ? 'bookmark' : 'bookmark_border'}
            </span>
            <span>{saved ? t('details.savedBtn') : t('details.saveBtn')}</span>
          </button>

          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              flex: 1,
              height: '44px',
              padding: '0 18px',
              fontSize: '13px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              near_me
            </span>
            <span>{t('details.liveGpsBtn')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
