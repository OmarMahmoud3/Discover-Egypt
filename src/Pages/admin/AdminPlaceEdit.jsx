import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PLACES_DATA } from '../../data/placesData';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import { isUuid } from '../../lib/uuidUtils';
import AdminHeader from '../../Components/admin/AdminHeader';
import PlaceForm from '../../Components/admin/PlaceForm';

/**
 * AdminPlaceEdit — Page for creating a new place or editing an existing one.
 */
export default function AdminPlaceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onToggleSidebar } = useOutletContext();
  const { ta } = useAdminTranslation();

  const isEdit = Boolean(id && id !== 'new');
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    let isMounted = true;
    const fetchPlace = async () => {
      setLoading(true);
      setError('');
      try {
        let loadedPlace = null;

        // 1. Try fetching from Supabase database
        let query = supabase.from('places').select('*');
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},slug.eq.${id}`);
        } else {
          query = query.eq('slug', id);
        }

        const { data, error: fetchErr } = await query.maybeSingle();

        if (!fetchErr && data) {
          loadedPlace = data;
        } else {
          // 2. Fallback to default static PLACES_DATA
          const staticMatch = PLACES_DATA.find((p) => p.id === id || p.slug === id || p.alias === id);
          if (staticMatch) {
            loadedPlace = {
              id: staticMatch.id,
              name: staticMatch.name,
              name_en: staticMatch.nameEn,
              slug: staticMatch.slug || staticMatch.id,
              city: staticMatch.city,
              category: staticMatch.category,
              description: staticMatch.historicalText || staticMatch.historicalTextEn || staticMatch.description || '',
              image_url: staticMatch.image,
              gallery: (staticMatch.gallery || []).map((g) => g.url || g),
              latitude: staticMatch.latitude || 29.9792,
              longitude: staticMatch.longitude || 31.1342,
              is_published: true,
            };
          }
        }

        if (loadedPlace && isMounted) {
          setPlace(loadedPlace);
        } else if (isMounted) {
          setError(ta('admin.placeNotFound') || 'المعلم غير موجود / Place not found');
        }
      } catch (err) {
        console.error('Error fetching place:', err);
        if (isMounted) setError(err.message || 'Failed to load place');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPlace();
    return () => {
      isMounted = false;
    };
  }, [id, isEdit, ta]);

  const handleSaved = () => {
    navigate('/admin/places');
  };

  const handleCancel = () => {
    navigate('/admin/places');
  };

  return (
    <>
      <AdminHeader
        title={isEdit ? ta('admin.editPlace') : ta('admin.addPlace')}
        breadcrumbs={[
          { label: ta('admin.dashboard'), to: '/admin' },
          { label: ta('admin.places'), to: '/admin/places' },
          { label: isEdit ? (place?.name || ta('admin.editPlace')) : ta('admin.addPlace') },
        ]}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="admin-content">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--secondary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p>{ta('admin.loading') || 'جاري التحميل...'}</p>
          </div>
        ) : error ? (
          <div className="admin-table-empty">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error)' }}>
              error
            </span>
            <p style={{ color: 'var(--error)' }}>{error}</p>
            <button
              onClick={() => navigate('/admin/places')}
              className="admin-btn admin-btn-outline"
              style={{ marginTop: '16px' }}
            >
              {ta('admin.back') || 'العودة'}
            </button>
          </div>
        ) : (
          <PlaceForm
            place={place}
            onSave={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </div>
    </>
  );
}
