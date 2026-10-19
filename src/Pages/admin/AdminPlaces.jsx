import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PLACES_DATA } from '../../data/placesData';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import { isUuid } from '../../lib/uuidUtils';
import AdminHeader from '../../Components/admin/AdminHeader';
import ConfirmDialog from '../../Components/admin/ConfirmDialog';

const PAGE_SIZE = 12;

/**
 * AdminPlaces — Full places management with search, filter, sort, paginate,
 * publish/unpublish, and delete functionality.
 */
export default function AdminPlaces() {
  const { onToggleSidebar } = useOutletContext();
  const { ta, isArabic } = useAdminTranslation();
  const navigate = useNavigate();

  // Data state
  const [places, setPlaces] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name'
  const [page, setPage] = useState(0);

  // Distinct cities / categories for filter dropdowns
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Default curated places from website
  const DEFAULT_PLACES = useMemo(() => {
    return PLACES_DATA.map((p) => ({
      id: p.id,
      name: p.name,
      name_en: p.nameEn || p.name,
      slug: p.id,
      city: p.city,
      category: p.category,
      image_url: p.image,
      is_published: true,
      created_at: '2024-01-01T00:00:00.000Z',
      is_default: true,
    }));
  }, []);

  // Fetch places (merges Supabase data with website default places)
  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Fetch Supabase places
      const { data: dbPlaces, error: fetchError } = await supabase
        .from('places')
        .select('id, name, name_en, slug, city, category, image_url, is_published, created_at');

      if (fetchError) throw fetchError;

      const supabaseList = Array.isArray(dbPlaces) ? dbPlaces : [];

      // 2. Merge: Supabase records take priority over default static records
      const merged = [...supabaseList];
      DEFAULT_PLACES.forEach((def) => {
        if (!merged.some((sp) => sp.id === def.id || sp.slug === def.slug)) {
          merged.push(def);
        }
      });

      // 3. Apply search & filters
      let filtered = merged;

      if (search.trim()) {
        const term = search.trim().toLowerCase();
        filtered = filtered.filter((p) =>
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.name_en && p.name_en.toLowerCase().includes(term)) ||
          (p.city && p.city.toLowerCase().includes(term)) ||
          (p.slug && p.slug.toLowerCase().includes(term))
        );
      }

      if (cityFilter) {
        filtered = filtered.filter((p) => p.city === cityFilter);
      }

      if (categoryFilter) {
        filtered = filtered.filter((p) => p.category === categoryFilter);
      }

      if (statusFilter === 'published') {
        filtered = filtered.filter((p) => p.is_published === true);
      } else if (statusFilter === 'draft') {
        filtered = filtered.filter((p) => p.is_published === false);
      }

      // 4. Sort
      if (sortBy === 'name') {
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
      } else {
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }

      setTotalCount(filtered.length);

      // 5. Paginate
      const from = page * PAGE_SIZE;
      const paginated = filtered.slice(from, from + PAGE_SIZE);
      setPlaces(paginated);

      // 6. Distinct cities & categories
      const distinctCities = [...new Set(merged.map((p) => p.city).filter(Boolean))].sort();
      const distinctCategories = [...new Set(merged.map((p) => p.category).filter(Boolean))].sort();
      setCities(distinctCities);
      setCategories(distinctCategories);
    } catch (err) {
      console.error('Error fetching places:', err);
      setError(err?.message || 'Failed to load places');
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, categoryFilter, statusFilter, sortBy, page, DEFAULT_PLACES]);

  // One-click batch sync all default places into Supabase database
  const handleSyncDefaults = async () => {
    setActionLoading(true);
    try {
      const { data: existingRows, error: checkError } = await supabase
        .from('places')
        .select('id, slug');

      if (checkError) throw checkError;

      const existingBySlug = new Map((existingRows || []).map((r) => [r.slug, r.id]));

      const rowsToUpsert = PLACES_DATA.map((p) => {
        const slug = p.slug || p.id;
        const existingId = existingBySlug.get(slug);
        const row = {
          name: p.name,
          name_en: p.nameEn || p.name,
          slug,
          city: p.city,
          category: p.category,
          description: p.description || p.historicalText || p.historicalTextEn || p.name,
          image_url: p.image,
          gallery: (p.gallery || []).map((g) => g.url || g),
          latitude: p.latitude || 29.9792,
          longitude: p.longitude || 31.1342,
          is_published: true,
        };
        if (existingId) {
          row.id = existingId;
        }
        return row;
      });

      const { error } = await supabase.from('places').upsert(rowsToUpsert);
      if (error) throw error;

      showToast(
        isArabic
          ? 'تمت مزامنة جميع المعالم الأساسية مع قاعدة البيانات بنجاح'
          : 'All default website places synced to database successfully',
        'success'
      );
      await fetchPlaces();
    } catch (err) {
      console.error('Sync error:', err);
      showToast(err?.message || 'Failed to sync places', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchPlaces();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchPlaces]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

  // Publish / Unpublish
  const handleTogglePublish = (place) => {
    const willPublish = !place.is_published;
    setConfirmDialog({
      open: true,
      title: willPublish ? ta('admin.confirmPublish') : ta('admin.confirmUnpublish'),
      message: willPublish
        ? ta('admin.confirmPublishMsg', { name: place.name })
        : ta('admin.confirmUnpublishMsg', { name: place.name }),
      variant: willPublish ? 'info' : 'warning',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          let targetId = isUuid(place?.id) ? place.id : null;

          if (!targetId) {
            const lookupSlug = place.slug || place.id;
            const { data: dbRecord } = await supabase
              .from('places')
              .select('id')
              .eq('slug', lookupSlug)
              .maybeSingle();
            if (dbRecord?.id) {
              targetId = dbRecord.id;
            }
          }

          if (targetId) {
            const { error } = await supabase
              .from('places')
              .update({ is_published: willPublish })
              .eq('id', targetId);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('places')
              .insert({
                name: place.name,
                name_en: place.name_en || null,
                slug: place.slug || place.id,
                city: place.city,
                category: place.category,
                description: place.description || place.name,
                image_url: place.image_url || null,
                is_published: willPublish,
              });

            if (error) throw error;
          }

          showToast(willPublish ? ta('admin.placePublished') : ta('admin.placeUnpublished'));
          fetchPlaces();
        } catch (err) {
          showToast(err.message || ta('admin.operationFailed'), 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog({ open: false });
        }
      },
    });
  };

  // Delete
  const handleDelete = (place) => {
    setConfirmDialog({
      open: true,
      title: ta('admin.confirmDelete'),
      message: ta('admin.confirmDeleteMsg', { name: place.name }),
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          let targetId = isUuid(place?.id) ? place.id : null;

          if (!targetId) {
            const lookupSlug = place.slug || place.id;
            const { data: dbRecord } = await supabase
              .from('places')
              .select('id')
              .eq('slug', lookupSlug)
              .maybeSingle();
            if (dbRecord?.id) {
              targetId = dbRecord.id;
            }
          }

          if (targetId) {
            const { error } = await supabase
              .from('places')
              .delete()
              .eq('id', targetId);

            if (error) throw error;
          }

          showToast(ta('admin.placeDeleted'));
          fetchPlaces();
        } catch (err) {
          showToast(err.message || ta('admin.operationFailed'), 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog({ open: false });
        }
      },
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCityFilter('');
    setCategoryFilter('');
    setStatusFilter('');
    setSortBy('date');
    setPage(0);
  };

  const hasActiveFilters = search || cityFilter || categoryFilter || statusFilter;

  return (
    <>
      <AdminHeader
        title={ta('admin.placesManagement')}
        onToggleSidebar={onToggleSidebar}
        breadcrumbs={[
          { label: ta('admin.dashboard'), to: '/admin' },
          { label: ta('admin.places') },
        ]}
      />

      <div className="admin-content">
        {error && (
          <div className="admin-error-banner">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            {error}
          </div>
        )}

        <div className="admin-section-card">
          {/* Filters */}
          <div className="admin-filters-bar">
            <input
              type="search"
              className="admin-search-input"
              placeholder={ta('admin.searchPlaces')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />

            <select
              className="admin-filter-select"
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">{ta('admin.allCities')}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              className="admin-filter-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">{ta('admin.allCategories')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">{ta('admin.allStatuses')}</option>
              <option value="published">{ta('admin.published')}</option>
              <option value="draft">{ta('admin.draft')}</option>
            </select>

            <select
              className="admin-filter-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(0);
              }}
              style={{ minWidth: '140px' }}
            >
              <option value="date">{ta('admin.sortByDate')}</option>
              <option value="name">{ta('admin.sortByName')}</option>
            </select>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="admin-btn admin-btn-ghost">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt_off</span>
                {ta('admin.clearFilters')}
              </button>
            )}

            <button onClick={fetchPlaces} className="admin-btn-icon" title={ta('admin.refresh')}>
              <span className="material-symbols-outlined">refresh</span>
            </button>

            <button
              onClick={handleSyncDefaults}
              className="admin-btn admin-btn-outline"
              disabled={actionLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title={isArabic ? 'رفع ومزامنة جميع المعالم الأساسية إلى قاعدة البيانات' : 'Sync All Default Places to Database'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--gold-dark)' }}>cloud_sync</span>
              <span>{isArabic ? 'مزامنة المعالم الأساسية' : 'Sync Default Places'}</span>
            </button>

            <Link to="/admin/places/new" className="admin-btn admin-btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              {ta('admin.addPlace')}
            </Link>
          </div>

          {/* Count indicator */}
          {!loading && (
            <div style={{ padding: '10px 20px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {ta('admin.showing', { count: places.length, total: totalCount })}
            </div>
          )}

          {/* Table — Desktop */}
          {loading ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="admin-skeleton admin-skeleton-card" />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">
                <span className="material-symbols-outlined">search_off</span>
              </div>
              <h3 className="admin-empty-title">
                {hasActiveFilters ? (isArabic ? 'لا توجد نتائج' : 'No results') : ta('admin.noPlacesYet')}
              </h3>
              <p className="admin-empty-desc">
                {hasActiveFilters
                  ? (isArabic ? 'جرب تغيير معايير البحث' : 'Try different search criteria')
                  : ta('admin.noPlacesDesc')}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="admin-btn admin-btn-outline">
                  {ta('admin.clearFilters')}
                </button>
              ) : (
                <Link to="/admin/places/new" className="admin-btn admin-btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                  {ta('admin.addPlace')}
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
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
                    {places.map((place) => (
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
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-light)' }}>
                                image
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{place.name}</span>
                            {place.is_default && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--gold-surface)',
                                  color: 'var(--gold-dark)',
                                  border: '1px solid rgba(212, 166, 74, 0.4)',
                                  fontWeight: 700,
                                }}
                              >
                                {isArabic ? 'معلم أساسي' : 'Default'}
                              </span>
                            )}
                          </div>
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
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => navigate(`/admin/places/${place.id}`)}
                              className="admin-btn-icon"
                              title={ta('admin.edit')}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              onClick={() => handleTogglePublish(place)}
                              className="admin-btn-icon"
                              title={place.is_published ? ta('admin.unpublish') : ta('admin.publish')}
                              style={{
                                borderColor: place.is_published ? '#FEF3C7' : 'var(--secondary-surface)',
                                background: place.is_published ? '#FFFBEB' : 'var(--secondary-surface)',
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ color: place.is_published ? '#92400E' : 'var(--success)' }}>
                                {place.is_published ? 'unpublished' : 'public'}
                              </span>
                            </button>
                            {place.slug && (
                              <Link
                                to={`/places/${place.slug}`}
                                target="_blank"
                                className="admin-btn-icon"
                                title={ta('admin.preview')}
                              >
                                <span className="material-symbols-outlined">open_in_new</span>
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(place)}
                              className="admin-btn-icon"
                              title={ta('admin.delete')}
                              style={{ borderColor: 'rgba(220,38,38,0.15)', background: 'var(--error-bg)' }}
                            >
                              <span className="material-symbols-outlined" style={{ color: 'var(--error)' }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="admin-mobile-cards" style={{ padding: '12px' }}>
                {places.map((place) => (
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
                      <button
                        onClick={() => navigate(`/admin/places/${place.id}`)}
                        className="admin-btn admin-btn-outline"
                        style={{ flex: 1 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                        {ta('admin.edit')}
                      </button>
                      <button
                        onClick={() => handleTogglePublish(place)}
                        className="admin-btn admin-btn-outline"
                        style={{ flex: 1 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          {place.is_published ? 'unpublished' : 'public'}
                        </span>
                        {place.is_published ? ta('admin.unpublish') : ta('admin.publish')}
                      </button>
                      <button
                        onClick={() => handleDelete(place)}
                        className="admin-btn admin-btn-danger"
                        style={{ flex: 0 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                      chevron_right
                    </span>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let pageNum = i;
                    if (totalPages > 7) {
                      if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 7 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`admin-pagination-btn ${page === pageNum ? 'active' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <span className="material-symbols-outlined icon-flip-ltr" style={{ fontSize: '16px' }}>
                      chevron_left
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={ta('admin.confirm')}
        cancelLabel={ta('admin.cancel')}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
        loading={actionLoading}
      />

      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type === 'error' ? 'admin-toast-error' : 'admin-toast-success'}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}
    </>
  );
}
