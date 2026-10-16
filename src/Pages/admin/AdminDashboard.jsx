import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import { PLACES_DATA } from '../../data/placesData';
import AdminHeader from '../../Components/admin/AdminHeader';
import StatCard from '../../Components/admin/StatCard';

/**
 * AdminDashboard — Overview page with real database stats and recent places.
 */
export default function AdminDashboard() {
  const { onToggleSidebar } = useOutletContext();
  const { ta, isArabic } = useAdminTranslation();

  const [stats, setStats] = useState({
    totalPlaces: null,
    publishedPlaces: null,
    draftPlaces: null,
    totalUsers: null,
    totalFavorites: null,
  });
  const [recentPlaces, setRecentPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch places and related stats
      const [placesRes, usersRes, favsRes] = await Promise.all([
        supabase
          .from('places')
          .select('id, name, name_en, slug, city, category, image_url, is_published, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('favorites').select('user_id', { count: 'exact', head: true }),
      ]);

      const dbPlaces = (placesRes.data && Array.isArray(placesRes.data)) ? placesRes.data : [];
      const dbIds = new Set(dbPlaces.map((p) => p.id));

      const defaultPlaces = PLACES_DATA.map((p) => ({
        id: p.id,
        name: p.name,
        name_en: p.nameEn || p.name,
        slug: p.slug || p.id,
        city: p.city || p.locationShort || 'مصر',
        category: p.category,
        image_url: p.image,
        is_published: true,
        created_at: null,
        isDefault: true,
      }));

      // Combine Supabase places with unsynced default places
      const mergedPlaces = [
        ...dbPlaces,
        ...defaultPlaces.filter((p) => !dbIds.has(p.id)),
      ];

      const publishedCount = mergedPlaces.filter((p) => p.is_published !== false).length;
      const draftCount = mergedPlaces.length - publishedCount;

      setStats({
        totalPlaces: mergedPlaces.length,
        publishedPlaces: publishedCount,
        draftPlaces: draftCount,
        totalUsers: usersRes?.count ?? 0,
        totalFavorites: favsRes?.count ?? 0,
      });

      setRecentPlaces(mergedPlaces.slice(0, 5));
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <AdminHeader
        title={ta('admin.overviewTitle')}
        onToggleSidebar={onToggleSidebar}
        breadcrumbs={[
          { label: ta('admin.dashboard') },
          { label: ta('admin.overviewTitle') },
        ]}
      />

      <div className="admin-content">
        {error && (
          <div className="admin-error-banner">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            {error}
            <button
              onClick={fetchStats}
              className="admin-btn admin-btn-ghost"
              style={{ marginInlineStart: 'auto' }}
            >
              {ta('admin.refresh')}
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <StatCard
            icon="location_on"
            value={stats.totalPlaces}
            label={ta('admin.totalPlaces')}
            color="#12304A"
            bgColor="var(--primary-surface)"
            loading={loading}
          />
          <StatCard
            icon="public"
            value={stats.publishedPlaces}
            label={ta('admin.publishedPlaces')}
            color="var(--success)"
            bgColor="var(--success-bg)"
            loading={loading}
          />
          <StatCard
            icon="edit_note"
            value={stats.draftPlaces}
            label={ta('admin.draftPlaces')}
            color="#92400E"
            bgColor="#FEF3C7"
            loading={loading}
          />
          <StatCard
            icon="group"
            value={stats.totalUsers}
            label={ta('admin.totalUsers')}
            color="var(--secondary)"
            bgColor="var(--secondary-surface)"
            loading={loading}
          />
          <StatCard
            icon="favorite"
            value={stats.totalFavorites}
            label={ta('admin.totalFavorites')}
            color="var(--error)"
            bgColor="var(--error-bg)"
            loading={loading}
          />
        </div>

        {/* Recent Places */}
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2 className="admin-section-title">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>
                schedule
              </span>
              {ta('admin.recentPlaces')}
            </h2>
            <Link to="/admin/places" className="admin-btn admin-btn-ghost">
              {ta('admin.viewAll')}
              <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                arrow_back
              </span>
            </Link>
          </div>

          <div className="admin-section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="admin-skeleton admin-skeleton-card" />
                ))}
              </div>
            ) : recentPlaces.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <span className="material-symbols-outlined">add_location_alt</span>
                </div>
                <h3 className="admin-empty-title">{ta('admin.noPlacesYet')}</h3>
                <p className="admin-empty-desc">{ta('admin.noPlacesDesc')}</p>
                <Link to="/admin/places/new" className="admin-btn admin-btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                  {ta('admin.addPlace')}
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="admin-table-wrap admin-table-desktop">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{ta('admin.image')}</th>
                        <th>{ta('admin.name')}</th>
                        <th>{ta('admin.city')}</th>
                        <th>{ta('admin.category')}</th>
                        <th>{ta('admin.status')}</th>
                        <th>{ta('admin.date')}</th>
                        <th>{ta('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPlaces.map((place) => (
                        <tr key={place.id}>
                          <td>
                            {place.image_url ? (
                              <img
                                src={place.image_url}
                                alt={place.name}
                                className="admin-table-thumb"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div
                                className="admin-table-thumb"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-light)' }}>
                                  image
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{place.name}</div>
                            {place.name_en && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }} dir="ltr">
                                {place.name_en}
                              </div>
                            )}
                          </td>
                          <td>{place.city}</td>
                          <td>{place.category}</td>
                          <td>
                            <span className={`admin-badge ${place.is_published ? 'admin-badge-published' : 'admin-badge-draft'}`}>
                              {place.is_published ? ta('admin.published') : ta('admin.draft')}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {formatDate(place.created_at)}
                          </td>
                          <td>
                            <Link
                              to={`/admin/places/${place.id}`}
                              className="admin-btn-icon"
                              title={ta('admin.edit')}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="admin-mobile-cards" style={{ padding: '12px' }}>
                  {recentPlaces.map((place) => (
                    <div key={place.id} className="admin-mobile-card">
                      <div className="admin-mobile-card-header">
                        {place.image_url ? (
                          <img
                            src={place.image_url}
                            alt={place.name}
                            style={{ width: '56px', height: '42px', borderRadius: '10px', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '56px',
                              height: '42px',
                              borderRadius: '10px',
                              background: 'var(--surface-low)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-light)' }}>image</span>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{place.name}</div>
                          {place.name_en && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }} dir="ltr">{place.name_en}</div>
                          )}
                        </div>
                        <span className={`admin-badge ${place.is_published ? 'admin-badge-published' : 'admin-badge-draft'}`}>
                          {place.is_published ? ta('admin.published') : ta('admin.draft')}
                        </span>
                      </div>
                      <div className="admin-mobile-card-body">
                        <div className="admin-mobile-card-row">
                          <span className="admin-mobile-card-label">{ta('admin.city')}</span>
                          <span>{place.city}</span>
                        </div>
                        <div className="admin-mobile-card-row">
                          <span className="admin-mobile-card-label">{ta('admin.category')}</span>
                          <span>{place.category}</span>
                        </div>
                        <div className="admin-mobile-card-row">
                          <span className="admin-mobile-card-label">{ta('admin.date')}</span>
                          <span>{formatDate(place.created_at)}</span>
                        </div>
                      </div>
                      <div className="admin-mobile-card-actions">
                        <Link
                          to={`/admin/places/${place.id}`}
                          className="admin-btn admin-btn-outline"
                          style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          {ta('admin.edit')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
