import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PlacesMap.css';
import { useLanguage } from '../context/LanguageContext';
import { isValidCoordinate } from '../lib/geoUtils';

// Fix standard Leaflet default marker icons for Vite production build
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Custom category pin icon generator
 * Generates branded Discover Egypt pins (Nile Navy & Pharaonic Gold)
 */
function createCustomPin(categoryKey, isSelected = false) {
  const isNatureOrBeach = categoryKey === 'nature' || categoryKey === 'beach';
  
  const bgFill = isSelected ? '#D4A64A' : (isNatureOrBeach ? '#0F766E' : '#12304A');
  const borderCol = isSelected ? '#FFFFFF' : '#D4A64A';
  const pinSize = isSelected ? 38 : 32;

  const html = `
    <div class="custom-map-pin ${isSelected ? 'pin-selected' : ''}" style="width: ${pinSize}px; height: ${pinSize}px;">
      <svg viewBox="0 0 36 36" width="${pinSize}" height="${pinSize}">
        <path d="M18 3 C10.5 3 4.5 9 4.5 16.5 C4.5 24.5 18 34 18 34 C18 34 31.5 24.5 31.5 16.5 C31.5 9 25.5 3 18 3 Z" 
              fill="${bgFill}" 
              stroke="${borderCol}" 
              stroke-width="2" 
              filter="drop-shadow(0 2px 4px rgba(18,48,74,0.35))" />
        <circle cx="18" cy="15" r="5.5" fill="#FFFFFF" opacity="0.95"/>
        <circle cx="18" cy="15" r="2.8" fill="${isSelected ? '#12304A' : '#D4A64A'}"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-custom-pin-container',
    html,
    iconSize: [pinSize, pinSize + 6],
    iconAnchor: [pinSize / 2, pinSize + 4],
    popupAnchor: [0, -(pinSize + 2)],
  });
}

/**
 * Helper to auto-fit map bounds when destinations change or when a place is selected
 */
function MapAutoBounds({ places, selectedPlaceId }) {
  const map = useMap();

  useEffect(() => {
    if (!places || places.length === 0) return;

    if (selectedPlaceId) {
      const target = places.find(
        (p) => String(p.id) === String(selectedPlaceId) || p.slug === selectedPlaceId
      );
      if (target && isValidCoordinate(target.latitude, target.longitude)) {
        map.flyTo([Number(target.latitude), Number(target.longitude)], 13, {
          duration: 1.2,
        });
        return;
      }
    }

    if (places.length === 1) {
      map.setView([Number(places[0].latitude), Number(places[0].longitude)], 11);
      return;
    }

    const bounds = L.latLngBounds(
      places.map((p) => [Number(p.latitude), Number(p.longitude)])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 13,
      });
    }
  }, [places, selectedPlaceId, map]);

  return null;
}

/**
 * Helper component that forces Leaflet to recalculate container geometry
 * preventing blank/partial tiles when rendered conditionally or resized
 */
function MapResizeWatcher() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 80);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);

    const container = map.getContainer();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(container);
    }

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

/**
 * Controller component for programmatically moving map to user location
 */
function MapLocationFlyer({ userPos }) {
  const map = useMap();

  useEffect(() => {
    if (userPos) {
      map.flyTo([userPos.lat, userPos.lng], 14, { duration: 1.5 });
    }
  }, [userPos, map]);

  return null;
}

/**
 * PlacesMap — Reusable Interactive Map for Discover Egypt
 *
 * Props:
 * - places: Array of destinations
 * - selectedPlaceId: string | number
 * - onSelectPlace: (place) => void
 * - height: CSS height string (default: clamp(340px, 62vh, 680px))
 * - showUserLocation: boolean (default: true)
 * - showResetButton: boolean (default: true)
 */
export default function PlacesMap({
  places = [],
  selectedPlaceId = null,
  onSelectPlace = null,
  height = null,
  showUserLocation = true,
  showResetButton = true,
  className = '',
}) {
  const { t, isArabic, getPlaceName, getPlaceCity, getPlaceCategory, getPlaceDescription } = useLanguage();
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState(null);
  const messageTimeoutRef = useRef(null);

  // Egypt approximate geographical center
  const defaultCenter = [26.8206, 30.8025];
  const defaultZoom = 6;

  // Filter only valid coordinate places
  const validPlaces = useMemo(() => {
    return places.filter((p) => p && isValidCoordinate(p.latitude, p.longitude));
  }, [places]);

  const showFeedback = useCallback((msg, type = 'info') => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setLocationMessage({ text: msg, type });
    messageTimeoutRef.current = setTimeout(() => {
      setLocationMessage(null);
    }, 4000);
  }, []);

  // Handle explicit user geolocation request
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showFeedback(t('map.locationDenied'), 'error');
      return;
    }

    setLocating(true);
    showFeedback(t('map.myLocationSearching'), 'info');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy,
        });
        showFeedback(t('map.myLocationFound'), 'success');
      },
      (error) => {
        setLocating(false);
        console.warn('Geolocation notice:', error);
        showFeedback(t('map.locationDenied'), 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div
      className={`places-map-wrapper ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
      style={height ? { '--places-map-custom-height': height } : undefined}
    >
      {/* Geolocation & Action Status Toast */}
      {locationMessage && (
        <div
          className={`places-map-toast places-map-toast-${locationMessage.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {locationMessage.type === 'error'
              ? 'error'
              : locationMessage.type === 'success'
              ? 'check_circle'
              : 'my_location'}
          </span>
          <span>{locationMessage.text}</span>
        </div>
      )}

      {validPlaces.length === 0 ? (
        <div className="places-map-empty">
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--gold)' }}>
            map
          </span>
          <h3>{t('map.noCoordinates')}</h3>
          <p>{t('map.noResults')}</p>
        </div>
      ) : (
        <div className="places-map-container-relative">
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={false}
            className="places-map"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Standard OpenStreetMap Tile Layer with Required Attribution */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Resize & Bounds Synchronizers */}
            <MapResizeWatcher />
            <MapAutoBounds places={validPlaces} selectedPlaceId={selectedPlaceId} />
            {userLocation && <MapLocationFlyer userPos={userLocation} />}

            {/* User Location Pulsing Marker */}
            {userLocation && (
              <>
                <CircleMarker
                  center={[userLocation.lat, userLocation.lng]}
                  radius={userLocation.accuracy ? Math.min(Math.max(userLocation.accuracy / 10, 14), 40) : 18}
                  pathOptions={{
                    fillColor: '#3B82F6',
                    fillOpacity: 0.18,
                    color: '#2563EB',
                    weight: 1.5,
                  }}
                />
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={L.divIcon({
                    className: 'user-location-pin',
                    html: `
                      <div class="user-pulse-outer">
                        <div class="user-pulse-core"></div>
                      </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                  })}
                >
                  <Popup>
                    <div className="places-map-user-popup" dir={isArabic ? 'rtl' : 'ltr'}>
                      <strong>{t('map.myLocation')}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748B' }}>
                        {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Destination Markers */}
            {validPlaces.map((place) => {
              const isSelected = selectedPlaceId && (String(place.id) === String(selectedPlaceId) || place.slug === selectedPlaceId);
              const name = getPlaceName(place);
              const city = getPlaceCity(place);
              const category = getPlaceCategory(place);
              const description = getPlaceDescription(place);
              const targetUrl = `/places/${place.slug || place.id}`;
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.latitude)},${encodeURIComponent(place.longitude)}`;
              const pinIcon = createCustomPin(place.categoryKey || place.category, isSelected);

              return (
                <Marker
                  key={place.id || place.slug}
                  position={[Number(place.latitude), Number(place.longitude)]}
                  icon={pinIcon}
                  eventHandlers={{
                    click: () => {
                      if (onSelectPlace) {
                        onSelectPlace(place);
                      }
                    },
                  }}
                >
                  <Popup className="places-map-popup-window" maxWidth={310} minWidth={240}>
                    <article className="places-map-popup-card" dir={isArabic ? 'rtl' : 'ltr'}>
                      {(place.image || place.image_url) && (
                        <div className="places-map-popup-img-wrap">
                          <img
                            src={place.image || place.image_url}
                            alt={name}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="places-map-popup-badge">{city}</span>
                        </div>
                      )}

                      <div className="places-map-popup-content">
                        <div className="places-map-popup-tags">
                          <span className="places-map-popup-cat">{category}</span>
                        </div>

                        <h4 className="places-map-popup-title">{name}</h4>

                        {description && (
                          <p className="places-map-popup-desc">
                            {description}
                          </p>
                        )}

                        <div className="places-map-popup-actions">
                          <Link
                            to={targetUrl}
                            className="places-map-popup-link btn-primary"
                          >
                            <span>{t('map.viewDetails')}</span>
                            <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '15px' }}>
                              arrow_forward
                            </span>
                          </Link>

                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="places-map-popup-directions"
                            title={t('map.openDirections')}
                            aria-label={t('map.openDirections')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              directions
                            </span>
                          </a>
                        </div>
                      </div>
                    </article>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Action Controls inside map viewport */}
          <div className="places-map-floating-controls" dir={isArabic ? 'rtl' : 'ltr'}>
            {showUserLocation && (
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="places-map-control-btn"
                title={t('map.myLocation')}
                aria-label={t('map.myLocation')}
              >
                <span className={`material-symbols-outlined ${locating ? 'spinning' : ''}`} style={{ fontSize: '20px' }}>
                  {locating ? 'sync' : 'my_location'}
                </span>
              </button>
            )}

            {showResetButton && validPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUserLocation(null);
                  if (onSelectPlace) onSelectPlace(null);
                }}
                className="places-map-control-btn"
                title={t('map.resetView')}
                aria-label={t('map.resetView')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  restart_alt
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
