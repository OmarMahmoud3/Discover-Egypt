import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminTranslation } from '../../lib/useAdminTranslation';

/**
 * PlaceForm — Add/Edit form for places.
 * Validates inputs, checks slug uniqueness, handles save.
 */
export default function PlaceForm({ place = null, onSave, onCancel }) {
  const { ta, isArabic } = useAdminTranslation();
  const isEdit = !!place;

  const [form, setForm] = useState({
    name: place?.name || '',
    name_en: place?.name_en || '',
    slug: place?.slug || '',
    city: place?.city || '',
    category: place?.category || '',
    description: place?.description || '',
    image_url: place?.image_url || '',
    gallery: (place?.gallery || []).join('\n'),
    latitude: place?.latitude ?? '',
    longitude: place?.longitude ?? '',
    is_published: place?.is_published ?? false,
  });

  const [errors, setErrors] = useState({});
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const slugCheckTimer = useRef(null);

  // Generate slug from Arabic name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Auto-generate slug from name if not editing
  const handleNameChange = (value) => {
    setForm((prev) => {
      const updated = { ...prev, name: value };
      if (!isEdit && !prev.slugManuallyEdited) {
        // For English-friendly slugs, use name_en if available, otherwise transliterate
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleEnNameChange = (value) => {
    setForm((prev) => {
      const updated = { ...prev, name_en: value };
      // If we have English name, prefer it for slug generation
      if (!isEdit && value && !prev.slugManuallyEdited) {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return updated;
    });
  };

  const handleSlugChange = (value) => {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    setForm((prev) => ({ ...prev, slug: cleaned, slugManuallyEdited: true }));
  };

  // Debounced slug uniqueness check
  useEffect(() => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);

    if (!form.slug || form.slug.length < 2) {
      slugCheckTimer.current = setTimeout(() => {
        setSlugStatus(null);
      }, 0);
      return () => {
        if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
      };
    }

    // Skip check if editing and slug hasn't changed
    if (isEdit && form.slug === place?.slug) {
      slugCheckTimer.current = setTimeout(() => {
        setSlugStatus('available');
      }, 0);
      return () => {
        if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
      };
    }

    slugCheckTimer.current = setTimeout(async () => {
      setSlugStatus('checking');
      try {
        const { data, error } = await supabase
          .from('places')
          .select('id')
          .eq('slug', form.slug)
          .maybeSingle();

        if (error) {
          setSlugStatus(null);
          return;
        }

        if (data && (!isEdit || data.id !== place?.id)) {
          setSlugStatus('taken');
        } else {
          setSlugStatus('available');
        }
      } catch {
        setSlugStatus(null);
      }
    }, 400);

    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    };
  }, [form.slug, isEdit, place?.slug, place?.id]);

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = ta('admin.fieldRequired');
    if (!form.slug.trim()) newErrors.slug = ta('admin.fieldRequired');
    if (slugStatus === 'taken') newErrors.slug = ta('admin.slugExists');
    if (!form.city.trim()) newErrors.city = ta('admin.fieldRequired');
    if (!form.category.trim()) newErrors.category = ta('admin.fieldRequired');
    if (!form.description.trim()) newErrors.description = ta('admin.fieldRequired');

    if (form.latitude !== '' && form.latitude !== null) {
      const lat = parseFloat(form.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = ta('admin.invalidLatitude');
      }
    }
    if (form.longitude !== '' && form.longitude !== null) {
      const lon = parseFloat(form.longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        newErrors.longitude = ta('admin.invalidLongitude');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');

    if (!validate()) return;
    if (slugStatus === 'checking') return; // Wait for slug check

    setSaving(true);

    try {
      // Build data payload — only include columns that exist
      const galleryArray = form.gallery
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);

      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        slug: form.slug.trim(),
        city: form.city.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() || null,
        gallery: galleryArray.length > 0 ? galleryArray : null,
        latitude: form.latitude !== '' ? parseFloat(form.latitude) : null,
        longitude: form.longitude !== '' ? parseFloat(form.longitude) : null,
        is_published: form.is_published,
      };

      let result;
      if (isEdit) {
        result = await supabase
          .from('places')
          .update(payload)
          .eq('id', place.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('places')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        // Handle specific errors
        if (result.error.message?.includes('unique') || result.error.code === '23505') {
          setErrors({ slug: ta('admin.slugExists') });
          setSaveError(ta('admin.slugExists'));
        } else {
          setSaveError(result.error.message || ta('admin.saveFailed'));
        }
        return;
      }

      onSave?.(result.data, isEdit);
    } catch (err) {
      setSaveError(err.message || ta('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {saveError && (
        <div className="admin-error-banner">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
          {saveError}
        </div>
      )}

      {/* Name Fields */}
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label className="admin-form-label">
            {ta('admin.arabicName')} <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            className={`admin-form-input ${errors.name ? 'error' : ''}`}
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="مثال: أهرامات الجيزة"
            dir="rtl"
          />
          {errors.name && <div className="admin-form-error">{errors.name}</div>}
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">
            {ta('admin.englishName')} <span className="admin-form-label-optional">({ta('admin.optional')})</span>
          </label>
          <input
            type="text"
            className="admin-form-input"
            value={form.name_en}
            onChange={(e) => handleEnNameChange(e.target.value)}
            placeholder="e.g. Giza Pyramids"
            dir="ltr"
          />
        </div>
      </div>

      {/* Slug */}
      <div className="admin-form-group">
        <label className="admin-form-label">
          {ta('admin.slug')} <span style={{ color: 'var(--error)' }}>*</span>
          <span className="admin-form-label-optional" style={{ marginInlineStart: '8px' }}>
            {ta('admin.slugHint')}
          </span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className={`admin-form-input ${errors.slug ? 'error' : ''}`}
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="giza-pyramids"
            dir="ltr"
            style={{ fontFamily: 'monospace' }}
          />
          {slugStatus && (
            <span
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                insetInlineEnd: '12px',
                fontSize: '12px',
                fontWeight: 700,
                color:
                  slugStatus === 'available' ? 'var(--success)' :
                  slugStatus === 'taken' ? 'var(--error)' :
                  'var(--text-muted)',
              }}
            >
              {slugStatus === 'checking' && ta('admin.slugChecking')}
              {slugStatus === 'available' && '✓'}
              {slugStatus === 'taken' && '✗ ' + ta('admin.slugExists')}
            </span>
          )}
        </div>
        {errors.slug && <div className="admin-form-error">{errors.slug}</div>}
      </div>

      {/* City & Category */}
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label className="admin-form-label">
            {ta('admin.city')} <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            className={`admin-form-input ${errors.city ? 'error' : ''}`}
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder={isArabic ? 'مثال: القاهرة' : 'e.g. Cairo'}
          />
          {errors.city && <div className="admin-form-error">{errors.city}</div>}
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">
            {ta('admin.category')} <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            className={`admin-form-input ${errors.category ? 'error' : ''}`}
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            placeholder={isArabic ? 'مثال: آثار وتاريخ' : 'e.g. Monuments'}
          />
          {errors.category && <div className="admin-form-error">{errors.category}</div>}
        </div>
      </div>

      {/* Description */}
      <div className="admin-form-group">
        <label className="admin-form-label">
          {ta('admin.description')} <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <textarea
          className={`admin-form-input admin-form-textarea ${errors.description ? 'error' : ''}`}
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder={isArabic ? 'أدخل وصفاً تفصيلياً للمكان...' : 'Enter a detailed description...'}
          rows={4}
        />
        {errors.description && <div className="admin-form-error">{errors.description}</div>}
      </div>

      {/* Main Image URL */}
      <div className="admin-form-group">
        <label className="admin-form-label">
          {ta('admin.mainImageUrl')} <span className="admin-form-label-optional">({ta('admin.optional')})</span>
        </label>
        <input
          type="url"
          className="admin-form-input"
          value={form.image_url}
          onChange={(e) => updateField('image_url', e.target.value)}
          placeholder="https://example.com/image.jpg"
          dir="ltr"
        />
        {form.image_url && (
          <div style={{ marginTop: '8px' }}>
            <img
              src={form.image_url}
              alt="Preview"
              style={{
                width: '120px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
          {ta('admin.imageUploadNote')}
        </p>
      </div>

      {/* Gallery */}
      <div className="admin-form-group">
        <label className="admin-form-label">
          {ta('admin.galleryUrls')} <span className="admin-form-label-optional">({ta('admin.optional')})</span>
        </label>
        <textarea
          className="admin-form-input admin-form-textarea"
          value={form.gallery}
          onChange={(e) => updateField('gallery', e.target.value)}
          placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg"
          dir="ltr"
          rows={3}
        />
      </div>

      {/* Coordinates */}
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label className="admin-form-label">
            {ta('admin.latitude')} <span className="admin-form-label-optional">({ta('admin.optional')})</span>
          </label>
          <input
            type="number"
            step="any"
            className={`admin-form-input ${errors.latitude ? 'error' : ''}`}
            value={form.latitude}
            onChange={(e) => updateField('latitude', e.target.value)}
            placeholder="29.9792"
            dir="ltr"
          />
          {errors.latitude && <div className="admin-form-error">{errors.latitude}</div>}
        </div>

        <div className="admin-form-group">
          <label className="admin-form-label">
            {ta('admin.longitude')} <span className="admin-form-label-optional">({ta('admin.optional')})</span>
          </label>
          <input
            type="number"
            step="any"
            className={`admin-form-input ${errors.longitude ? 'error' : ''}`}
            value={form.longitude}
            onChange={(e) => updateField('longitude', e.target.value)}
            placeholder="31.1342"
            dir="ltr"
          />
          {errors.longitude && <div className="admin-form-error">{errors.longitude}</div>}
        </div>
      </div>

      {/* Publication Status */}
      <div className="admin-form-group">
        <label className="admin-form-label">{ta('admin.publicationStatus')}</label>
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              border: `1.5px solid ${form.is_published ? 'var(--secondary)' : 'var(--border)'}`,
              background: form.is_published ? 'var(--secondary-surface)' : '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              flex: '1 1 180px',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="radio"
              checked={form.is_published}
              onChange={() => updateField('is_published', true)}
              style={{ accentColor: 'var(--secondary)' }}
            />
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--success)' }}>
              public
            </span>
            {ta('admin.publishImmediately')}
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              border: `1.5px solid ${!form.is_published ? 'var(--gold)' : 'var(--border)'}`,
              background: !form.is_published ? 'var(--gold-surface)' : '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              flex: '1 1 180px',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="radio"
              checked={!form.is_published}
              onChange={() => updateField('is_published', false)}
              style={{ accentColor: 'var(--gold)' }}
            />
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#92400E' }}>
              edit_note
            </span>
            {ta('admin.saveAsDraft')}
          </label>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          paddingTop: '20px',
          borderTop: '1px solid var(--border)',
          marginTop: '8px',
        }}
      >
        {onCancel && (
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={onCancel}
            disabled={saving}
            style={{ minHeight: '44px' }}
          >
            {ta('admin.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={saving || slugStatus === 'checking'}
          style={{ minHeight: '44px' }}
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 0.8s linear infinite' }}>
                progress_activity
              </span>
              {ta('admin.saving')}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
              {ta('admin.save')}
            </>
          )}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
