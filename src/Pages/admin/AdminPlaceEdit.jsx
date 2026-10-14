import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
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
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchPlace = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: fetchErr } = await supabase
          .from('places')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchErr) throw fetchErr;
        if (isMounted) setPlace(data);
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
  }, [id, isEdit]);

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
          { label: ta('admin.dashboard'), path: '/admin' },
          { label: ta('admin.places'), path: '/admin/places' },
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
