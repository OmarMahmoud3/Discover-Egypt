import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLACES_DATA } from '../data/placesData';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage } from '../context/LanguageContext';

function GalleryViewer({ place, placeName }) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const gallery = place.gallery && place.gallery.length > 0 ? place.gallery : [
    { title: place.name, badge: 'المعلم', url: place.image, alt: place.name }
  ];

  const currentImage = gallery[selectedImgIndex]?.url || place.image;

  return (
    <section
      key={place.id}
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        backgroundColor: 'var(--primary-dark)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '380px', maxHeight: '52vh' }}>
        <img
          src={currentImage}
          alt={gallery[selectedImgIndex]?.alt || placeName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.35s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(18, 48, 74, 0.95) 0%, rgba(18, 48, 74, 0.3) 50%, transparent 100%)',
          }}
        />

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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: idx === 0 ? 'rgba(255, 255, 255, 0.92)' : 'rgba(243, 233, 210, 0.95)',
                backdropFilter: 'blur(8px)',
                color: idx === 0 ? 'var(--primary)' : '#78350F',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
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

        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(18, 48, 74, 0.75)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--gold)' }}>
              photo_camera
            </span>
            <span>
              {gallery.length > 1 ? `${selectedImgIndex + 1} / ${gallery.length}` : '1 / 1'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {gallery.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImgIndex(idx)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  backgroundColor: idx === selectedImgIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: idx === selectedImgIndex ? '0 0 0 3px rgba(255,255,255,0.18)' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                aria-label={`Show photo ${idx + 1}`}
              />
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
  const place = PLACES_DATA.find((p) => p.id === placeId) || PLACES_DATA[0];

  const { isFavorite, toggleFavorite, showToast } = useFavorites();
  const { t, isArabic, getPlaceName, getPlaceLocation, getPlaceDescription, getPlaceGateInfo } = useLanguage();
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

  const metrics = isArabic ? place.metrics : (place.metricsEn || place.metrics);
  const quickInfo = place.quickInfo || {};
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
      {/* Sub-Header Navigation */}
      <div
        style={{
          position: 'sticky',
          top: '70px',
          zIndex: 80,
          backgroundColor: 'rgba(248, 250, 253, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 16px',
        }}
      >
        <div
          className="container-narrow"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/explore"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'var(--surface-low)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
              title={t('details.back')}
            >
              <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '20px' }}>
                arrow_forward
              </span>
            </Link>
            <h1
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: 'var(--primary)',
                margin: 0,
                maxWidth: '240px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {placeName}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleShare}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'var(--surface-low)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
              title={t('details.share')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                share
              </span>
            </button>
            <button
              onClick={() => toggleFavorite(place.id, placeName)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: saved ? 'var(--secondary-surface)' : 'var(--surface-low)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: saved ? 'var(--secondary)' : 'var(--text-muted)',
              }}
              title={saved ? t('details.savedInFavorites') : t('details.addToFavorites')}
            >
              <span
                className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`}
                style={{ fontSize: '20px' }}
              >
                {saved ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="container-narrow" style={{ marginTop: '16px' }}>
        <GalleryViewer key={placeId} place={place} placeName={placeName} />

        {/* Title & Quick Summary */}
        <section style={{ padding: '24px 8px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--secondary)',
              fontSize: '14px',
              fontWeight: '700',
              marginBottom: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              location_on
            </span>
            <span>{getPlaceLocation(place)}</span>
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: '800',
              color: 'var(--primary)',
              lineHeight: 1.3,
              marginBottom: '10px',
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
                backgroundColor: 'var(--surface-container)',
                padding: '4px 10px',
                borderRadius: '8px',
                color: 'var(--primary)',
                fontWeight: '800',
              }}
            >
              <span
                className="material-symbols-outlined material-filled"
                style={{ fontSize: '16px', color: 'var(--gold)' }}
              >
                star
              </span>
              <span>{place.rating}</span>
            </div>
            <span>•</span>
            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
              {place.reviewCount} {t('details.verifiedReviews')}
            </span>
            <span>•</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--secondary)',
                fontWeight: '700',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                verified_user
              </span>
              {t('details.verifiedSite')}
            </span>
          </div>
        </section>

        {/* 2x2 Quick Info Grid */}
        <section style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Hours */}
            <div
              style={{
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--secondary-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--secondary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    schedule
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('details.workingHours')}</span>
              </div>
              <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--primary)' }}>
                {hours}
              </p>
              <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '600', marginTop: '4px' }}>
                {hoursSub}
              </span>
            </div>

            {/* Best Season */}
            <div
              style={{
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--surface-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    calendar_month
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('details.bestSeason')}</span>
              </div>
              <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--primary)' }}>
                {season}
              </p>
              <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '600', marginTop: '4px' }}>
                {seasonSub}
              </span>
            </div>

            {/* Duration */}
            <div
              style={{
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--gold-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gold-dark)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    timer
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('details.suggestedDuration')}</span>
              </div>
              <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--primary)' }}>
                {duration}
              </p>
              <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '600', marginTop: '4px' }}>
                {durationSub}
              </span>
            </div>

            {/* Payment Method */}
            <div
              style={{
                padding: '16px',
                borderRadius: '18px',
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--secondary-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--secondary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    credit_card
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('details.paymentMethod')}</span>
              </div>
              <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--primary)' }}>
                {payment}
              </p>
              <span style={{ fontSize: '12px', color: 'var(--error)', fontWeight: '700', marginTop: '4px' }}>
                {paymentSub}
              </span>
            </div>
          </div>
        </section>

        {/* Historical Narrative & Metric Pills */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--secondary)' }}>
              history_edu
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
              {t('details.historySectionTitle')}
            </h2>
          </div>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              lineHeight: 1.85,
              textAlign: isArabic ? 'justify' : 'left',
              marginBottom: '20px',
            }}
          >
            {getPlaceDescription(place)}
          </p>

          {/* Metric Pills */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              paddingTop: '8px',
            }}
          >
            {metrics?.map((metric, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 8px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--surface-low)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: '900',
                    color: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--secondary)' : 'var(--gold-dark)',
                    lineHeight: 1.2,
                  }}
                >
                  {metric.value}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Field Guidelines & Heritage Tips */}
        {place.tips && place.tips.length > 0 && (
          <section
            style={{
              backgroundColor: 'var(--surface-low)',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--primary)' }}>
                tips_and_updates
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                {t('details.guidelinesTitle')}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {place.tips.map((tip, idx) => {
                const tipTitle = isArabic ? tip.title : (tip.titleEn || tip.title);
                const tipDesc = isArabic ? tip.desc : (tip.descEn || tip.desc);

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px',
                      borderRadius: '14px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
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
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                        {tipTitle}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.6 }}>
                        {tipDesc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Interactive Map & GPS Route Launcher */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--secondary)' }}>
                explore
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                {t('details.locationTitle')}
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-light)', fontFamily: "'Inter', sans-serif" }}>
              {place.coordinates}
            </span>
          </div>

          {/* Map Preview Graphic */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '180px',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '14px',
              background: 'linear-gradient(135deg, #0F766E 0%, #12304A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.15,
                backgroundImage: 'radial-gradient(#F3E9D2 1.5px, transparent 1.5px)',
                backgroundSize: '20px 20px',
              }}
            />

            <div style={{ textAlign: 'center', zIndex: 2 }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                  border: '2px solid var(--gold)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--gold)' }}>
                  pin_drop
                </span>
              </div>
              <span style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '14px' }}>
                {placeName}
              </span>
            </div>

            {/* Floating Gate Info Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                backgroundColor: 'rgba(18, 48, 74, 0.88)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                padding: '8px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--secondary-light)' }}>
                  near_me
                </span>
                <span>{getPlaceGateInfo(place)}</span>
              </div>
            </div>
          </div>

          {/* Direct Directions Action */}
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>
              directions
            </span>
            <span>{t('details.routeBtn')}</span>
          </a>
        </section>

        {/* Nearby Historic Attractions */}
        {place.nearby && place.nearby.length > 0 && (
          <section style={{ marginBottom: '36px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>
                {t('details.nearbyTitle')}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '700' }}>
                {t('details.within20km')}
              </span>
            </div>

            <div
              className="no-scrollbar"
              style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}
            >
              {place.nearby.map((near, idx) => {
                const nearName = isArabic ? near.name : (near.nameEn || near.name);
                const nearDesc = isArabic ? near.desc : (near.descEn || near.desc);
                const nearDist = isArabic ? near.dist : (near.distEn || near.dist);
                const nearTime = isArabic ? near.time : (near.timeEn || near.time);

                return (
                  <div
                    key={idx}
                    style={{
                      flexShrink: 0,
                      width: '270px',
                      borderRadius: '18px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', height: '120px' }}>
                      <img
                        src={near.image}
                        alt={nearName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          insetInlineEnd: '8px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(18, 48, 74, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                        }}
                      >
                        {nearDist}
                      </div>
                    </div>

                    <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {nearName}
                        </h3>
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            marginTop: '6px',
                            lineHeight: 1.5,
                          }}
                        >
                          {nearDesc}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--surface-low)',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '600' }}>
                          {nearTime}
                        </span>
                        <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                          arrow_back
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

      {/* Sticky Bottom Floating Action Bar */}
      <div
        className="place-details-bar"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          zIndex: 85,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(18, 48, 74, 0.08)',
          boxShadow: '0 -4px 20px rgba(18, 48, 74, 0.08)',
          padding: '12px 16px',
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
          {/* Save Toggle */}
          <button
            onClick={() => toggleFavorite(place.id, placeName)}
            style={{
              height: '48px',
              padding: '0 16px',
              borderRadius: '14px',
              backgroundColor: saved ? 'var(--secondary-surface)' : 'var(--surface-container)',
              color: saved ? 'var(--secondary)' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: '700',
              fontSize: '14px',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <span
              className={`material-symbols-outlined ${saved ? 'material-filled' : ''}`}
              style={{ fontSize: '20px' }}
            >
              {saved ? 'bookmark' : 'bookmark_border'}
            </span>
            <span>{saved ? t('details.savedBtn') : t('details.saveBtn')}</span>
          </button>

          {/* Live GPS Directions */}
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              flex: 1,
              height: '48px',
              padding: '0 20px',
              fontSize: '14px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              near_me
            </span>
            <span>{t('details.liveGpsBtn')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
