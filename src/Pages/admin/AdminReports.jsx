import { useState, useEffect, useCallback, useTransition } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAdminTranslation } from '../../lib/useAdminTranslation';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  fetchAdminReports,
  fetchReportDetails,
  adminModerateReport,
  adminSetUserBanStatus,
  getUserBanInfo,
  CHAT_MODERATION_SQL,
  checkModerationSchemaStatus,
  REPORT_REASONS,
  REPORT_STATUSES,
} from '../../lib/communityService';
import AdminHeader from '../../Components/admin/AdminHeader';
import StatCard from '../../Components/admin/StatCard';
import ConfirmDialog from '../../Components/admin/ConfirmDialog';

export default function AdminReports() {
  const { onToggleSidebar } = useOutletContext();
  const { ta, isArabic } = useAdminTranslation();
  const { profile: currentAdminProfile } = useAdminAuth();
  const [, startTransition] = useTransition();

  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Moderation Schema status & setup modal
  const [moderationDbStatus, setModerationDbStatus] = useState({ isInstalled: true });
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbCopied, setDbCopied] = useState(false);

  // Selected report for detail modal
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state inside detail modal
  const [modStatus, setModStatus] = useState('pending');
  const [modNotes, setModNotes] = useState('');
  const [modActionType, setModActionType] = useState('none');
  const [savingMod, setSavingMod] = useState(false);

  // Ban modal / dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banActionLoading, setBanActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    investigating: 0,
    action_taken: 0,
    dismissed: 0,
  });

  // Fetch reports list
  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetchAdminReports({
        status: statusFilter,
        search,
        page,
        perPage,
      });

      setReports(res.reports || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.totalPages || 1);

      // Compute quick stats across list
      const allRes = await fetchAdminReports({ status: 'all', page: 1, perPage: 1000 });
      const allList = allRes.reports || [];
      setStats({
        total: allList.length,
        pending: allList.filter((r) => r.status === 'pending').length,
        investigating: allList.filter((r) => r.status === 'investigating').length,
        action_taken: allList.filter((r) => r.status === 'action_taken').length,
        dismissed: allList.filter((r) => r.status === 'dismissed').length,
      });
    } catch (err) {
      console.error('Error loading admin reports:', err);
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search, page, perPage]);

  useEffect(() => {
    let active = true;
    checkModerationSchemaStatus().then((status) => {
      if (active) setModerationDbStatus(status);
    });
    loadReports();
    return () => {
      active = false;
    };
  }, [loadReports]);

  // Open detail modal & load full immutable evidence snapshot
  const handleOpenReport = async (reportId) => {
    setSelectedReportId(reportId);
    setDetailLoading(true);
    try {
      const details = await fetchReportDetails(reportId);
      setActiveReport(details);
      setModStatus(details.status || 'pending');
      setModNotes(details.admin_notes || '');
      setModActionType(details.action_type || 'none');
    } catch (err) {
      console.error('Error opening report detail:', err);
      showToast('Failed to load report details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseReport = () => {
    setSelectedReportId(null);
    setActiveReport(null);
  };

  // Save moderation updates (status, notes, action type)
  const handleSaveModeration = async (e) => {
    e?.preventDefault();
    if (!activeReport || savingMod) return;

    setSavingMod(true);
    try {
      await adminModerateReport({
        reportId: activeReport.id,
        status: modStatus,
        adminNotes: modNotes.trim(),
        actionType: modActionType,
        adminId: currentAdminProfile?.id,
      });

      showToast(ta('admin.statusUpdatedSuccess'), 'success');
      loadReports(true);
      // Refresh current report details
      const updated = await fetchReportDetails(activeReport.id);
      setActiveReport(updated);
    } catch (err) {
      console.error('Failed to update report status:', err);
      showToast(err?.message || 'Failed to save moderation updates', 'error');
    } finally {
      setSavingMod(false);
    }
  };

  // Trigger Ban Dialog
  const handleOpenBanDialog = () => {
    setBanReasonInput('');
    setBanDialogOpen(true);
  };

  const handleConfirmBan = async () => {
    if (!activeReport?.reported_user_id || banActionLoading) return;

    setBanActionLoading(true);
    const reason = banReasonInput.trim() || 'Violating community standards in chat';

    // Optimistically update active report and reports list
    setActiveReport((prev) =>
      prev
        ? {
            ...prev,
            status: 'action_taken',
            action_type: 'user_banned',
            reportedUser: {
              ...prev.reportedUser,
              is_banned: true,
              ban_reason: reason,
            },
          }
        : prev
    );

    setReports((prev) =>
      prev.map((r) =>
        r.id === activeReport.id || r.reported_user_id === activeReport.reported_user_id
          ? {
              ...r,
              status: r.id === activeReport.id ? 'action_taken' : r.status,
              action_type: r.id === activeReport.id ? 'user_banned' : r.action_type,
              reportedUser: {
                ...r.reportedUser,
                is_banned: true,
                ban_reason: reason,
              },
            }
          : r
      )
    );

    try {
      await adminSetUserBanStatus({
        targetUserId: activeReport.reported_user_id,
        isBanned: true,
        banReason: reason,
        reportId: activeReport.id,
        adminId: currentAdminProfile?.id,
      });

      showToast(ta('admin.banSuccess'), 'success');
      setBanDialogOpen(false);
      setModStatus('action_taken');
      setModActionType('user_banned');
      loadReports(true);
      const updated = await fetchReportDetails(activeReport.id);
      if (updated) setActiveReport(updated);
    } catch (err) {
      console.error('Error banning user:', err);
      showToast(err?.message || 'Failed to ban user', 'error');
      loadReports(true);
    } finally {
      setBanActionLoading(false);
    }
  };

  // Handle Unban
  const handleUnbanUser = () => {
    if (!activeReport?.reported_user_id) return;
    const targetName = activeReport.reportedUser?.display_name || 'User';

    setConfirmDialog({
      open: true,
      title: ta('admin.confirmUnbanTitle'),
      message: ta('admin.confirmUnbanMsg').replace('{name}', targetName),
      variant: 'info',
      onConfirm: async () => {
        setBanActionLoading(true);

        // Optimistically update active report and reports list
        setActiveReport((prev) =>
          prev
            ? {
                ...prev,
                reportedUser: {
                  ...prev.reportedUser,
                  is_banned: false,
                  ban_reason: null,
                },
              }
            : prev
        );

        setReports((prev) =>
          prev.map((r) =>
            r.reported_user_id === activeReport.reported_user_id
              ? {
                  ...r,
                  reportedUser: {
                    ...r.reportedUser,
                    is_banned: false,
                    ban_reason: null,
                  },
                }
              : r
          )
        );

        try {
          await adminSetUserBanStatus({
            targetUserId: activeReport.reported_user_id,
            isBanned: false,
            banReason: 'Ban lifted by administrator',
            reportId: activeReport.id,
            adminId: currentAdminProfile?.id,
          });

          showToast(ta('admin.unbanSuccess'), 'success');
          loadReports(true);
          const updated = await fetchReportDetails(activeReport.id);
          if (updated) setActiveReport(updated);
        } catch (err) {
          console.error('Error lifting ban:', err);
          showToast(err?.message || 'Failed to unban user', 'error');
          loadReports(true);
        } finally {
          setBanActionLoading(false);
        }
      },
    });
  };

  const getReasonLabel = (reasonKey) => {
    const item = REPORT_REASONS.find((r) => r.id === reasonKey);
    if (!item) return reasonKey;
    return `${item.icon} ${isArabic ? item.labelAr : item.labelEn}`;
  };

  const getStatusBadge = (statusKey) => {
    const item = REPORT_STATUSES.find((s) => s.id === statusKey);
    const label = item ? (isArabic ? item.labelAr : item.labelEn) : statusKey;
    return (
      <span className={`admin-badge admin-badge-${statusKey}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <AdminHeader
        title={ta('admin.reportsTitle')}
        onToggleSidebar={onToggleSidebar}
        breadcrumbs={[
          { label: ta('admin.dashboard') },
          { label: ta('admin.reports') },
        ]}
      />

      <div className="admin-content">
        {/* Toast */}
        {toast && (
          <div className={`admin-toast ${toast.type}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="admin-error-banner">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            {error}
            <button
              onClick={() => loadReports(true)}
              className="admin-btn admin-btn-ghost"
              style={{ marginInlineStart: 'auto' }}
            >
              {ta('admin.retry')}
            </button>
          </div>
        )}

        {/* Moderation & Ban Database Setup Notice Banner */}
        {moderationDbStatus.isInstalled === false && (
          <aside
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              color: '#92400E',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              lineHeight: 1.5,
              marginBottom: '16px',
            }}
            role="alert"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#D97706' }}>
                warning
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#78350F' }}>
                  {ta('admin.moderationDbNoticeTitle')}
                </strong>
                <span>{ta('admin.moderationDbNoticeDesc')}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDbModal(true)}
              className="admin-btn admin-btn-primary"
              style={{
                backgroundColor: '#D97706',
                borderColor: '#B45309',
                color: '#FFFFFF',
                fontSize: '13px',
                padding: '8px 16px',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>code</span>
              <span>{ta('admin.moderationDbNoticeBtn')}</span>
            </button>
          </aside>
        )}

        {/* Top Stats Grid */}
        <div className="admin-stats-grid">
          <StatCard
            icon="flag"
            value={stats.total}
            label={ta('admin.totalReports')}
            color="#12304A"
            bgColor="var(--primary-surface)"
            loading={loading}
          />
          <StatCard
            icon="pending_actions"
            value={stats.pending}
            label={ta('admin.pendingReview')}
            color="#D97706"
            bgColor="#FEF3C7"
            loading={loading}
          />
          <StatCard
            icon="policy"
            value={stats.investigating}
            label={ta('admin.investigating')}
            color="#2563EB"
            bgColor="#DBEAFE"
            loading={loading}
          />
          <StatCard
            icon="gavel"
            value={stats.action_taken}
            label={ta('admin.actionTaken')}
            color="var(--success)"
            bgColor="var(--success-bg)"
            loading={loading}
          />
          <StatCard
            icon="cancel"
            value={stats.dismissed}
            label={ta('admin.dismissed')}
            color="#6B7280"
            bgColor="#F3F4F6"
            loading={loading}
          />
        </div>

        {/* Reports Section Card */}
        <div className="admin-section-card">
          <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
            {/* Status Filter Tabs */}
            <div className="admin-filter-tabs">
              {[
                { id: 'all', label: ta('admin.allStatuses'), count: stats.total },
                { id: 'pending', label: ta('admin.pendingReview'), count: stats.pending },
                { id: 'investigating', label: ta('admin.investigating'), count: stats.investigating },
                { id: 'action_taken', label: ta('admin.actionTaken'), count: stats.action_taken },
                { id: 'dismissed', label: ta('admin.dismissed'), count: stats.dismissed },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    startTransition(() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    });
                  }}
                  className={`admin-filter-tab ${statusFilter === tab.id ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  <span className="admin-filter-tab-count">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginInlineStart: 'auto' }}>
              <div className="admin-search-wrap">
                <span className="material-symbols-outlined admin-search-icon">search</span>
                <input
                  type="text"
                  placeholder={ta('admin.searchReports')}
                  value={search}
                  onChange={(e) => {
                    startTransition(() => {
                      setSearch(e.target.value);
                      setPage(1);
                    });
                  }}
                  className="admin-search-input"
                  style={{ width: '280px' }}
                />
              </div>

              <button
                onClick={() => loadReports(true)}
                className="admin-btn-icon"
                title={ta('admin.refresh')}
                disabled={refreshing}
              >
                <span className={`material-symbols-outlined ${refreshing ? 'admin-spin' : ''}`}>
                  refresh
                </span>
              </button>
            </div>
          </div>

          <div className="admin-section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="admin-skeleton admin-skeleton-card" style={{ height: '56px' }} />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  <span className="material-symbols-outlined">shield_person</span>
                </div>
                <h3 className="admin-empty-title">{ta('admin.noReportsYet')}</h3>
                <p className="admin-empty-desc">{ta('admin.noReportsDesc')}</p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="admin-table-wrap admin-table-desktop">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{ta('admin.date')}</th>
                        <th>{ta('admin.reportedUser')}</th>
                        <th>{ta('admin.reporter')}</th>
                        <th>{ta('admin.reason')}</th>
                        <th>{ta('admin.evidenceCount')}</th>
                        <th>{ta('admin.status')}</th>
                        <th>{ta('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id}>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            <div>{formatDate(report.created_at)}</div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 }}>
                              {report.id.slice(0, 8)}...
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700 }}>
                                {report.reportedUser?.display_name || 'Explorer'}
                              </span>
                              {report.reportedUser?.is_banned && (
                                <span className="admin-badge admin-badge-banned">
                                  {ta('admin.userBannedBadge')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span>{report.reporter?.display_name || 'Explorer'}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>
                              {getReasonLabel(report.reason)}
                            </span>
                          </td>
                          <td>
                            <span className="admin-badge" style={{ background: '#E2E8F0', color: '#334155' }}>
                              💬 {report.evidenceCount || 0}
                            </span>
                          </td>
                          <td>{getStatusBadge(report.status)}</td>
                          <td>
                            <button
                              onClick={() => handleOpenReport(report.id)}
                              className="admin-btn admin-btn-primary admin-btn-sm"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                visibility
                              </span>
                              {ta('admin.reviewReport')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="admin-mobile-cards" style={{ padding: '12px' }}>
                  {reports.map((report) => (
                    <div key={report.id} className="admin-mobile-card">
                      <div className="admin-mobile-card-header">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>
                              {report.reportedUser?.display_name || 'Explorer'}
                            </span>
                            {report.reportedUser?.is_banned && (
                              <span className="admin-badge admin-badge-banned">
                                {ta('admin.userBannedBadge')}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="admin-mobile-card-body">
                        <div className="admin-mobile-card-row">
                          <span className="admin-mobile-card-label">{ta('admin.reporter')}</span>
                          <span>{report.reporter?.display_name || 'Explorer'}</span>
                        </div>
                        <div className="admin-mobile-card-row">
                          <span className="admin-mobile-card-label">{ta('admin.reason')}</span>
                          <span style={{ fontWeight: 600 }}>{getReasonLabel(report.reason)}</span>
                        </div>
                        <div className="admin-mobile-card-row">
                          <span className="admin-mobile-card-label">{ta('admin.evidenceCount')}</span>
                          <span>💬 {report.evidenceCount || 0}</span>
                        </div>
                      </div>
                      <div className="admin-mobile-card-actions">
                        <button
                          onClick={() => handleOpenReport(report.id)}
                          className="admin-btn admin-btn-primary"
                          style={{ width: '100%' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            visibility
                          </span>
                          {ta('admin.reviewReport')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                    >
                      {ta('admin.previous')}
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      {ta('admin.page').replace('{n}', `${page} / ${totalPages}`)}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                    >
                      {ta('admin.next')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail & Evidence Inspection Modal */}
      {selectedReportId && (
        <div className="admin-modal-overlay" onClick={handleCloseReport} role="dialog" aria-modal="true">
          <div
            className="admin-report-detail-modal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#DC2626' }}>
                  shield_with_heart
                </span>
                <div>
                  <h3 className="admin-modal-title">{ta('admin.reportDetailsTitle')}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ID: {activeReport?.id}
                  </span>
                </div>
              </div>
              <button onClick={handleCloseReport} className="admin-modal-close" aria-label="Close">
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="admin-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {detailLoading || !activeReport ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <span className="admin-spin material-symbols-outlined" style={{ fontSize: '32px' }}>
                    progress_activity
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Parties Overview Grid */}
                  <div className="admin-report-parties-grid">
                    {/* Reported User */}
                    <div className="admin-party-card reported">
                      <div className="admin-party-label">{ta('admin.reportedUser')}</div>
                      <div className="admin-party-name">
                        {activeReport.reportedUser?.display_name || 'Explorer'}
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                        {activeReport.reportedUser?.is_banned ? (
                          <span className="admin-badge admin-badge-banned">
                            {ta('admin.userBannedBadge')}
                          </span>
                        ) : (
                          <span className="admin-badge admin-badge-published">
                            {ta('admin.userActiveBadge')}
                          </span>
                        )}
                        <span className="admin-badge admin-badge-user">
                          {activeReport.reportedUser?.role || 'user'}
                        </span>
                      </div>
                    </div>

                    {/* Reporter */}
                    <div className="admin-party-card reporter">
                      <div className="admin-party-label">{ta('admin.reporter')}</div>
                      <div className="admin-party-name">
                        {activeReport.reporter?.display_name || 'Explorer'}
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDate(activeReport.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Violation Reason & Context */}
                  <div className="admin-report-section">
                    <div className="admin-report-label">{ta('admin.reason')}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
                      {getReasonLabel(activeReport.reason)}
                    </div>
                    {activeReport.details && (
                      <div className="admin-report-details-box">
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                          تفاصيل البلاغ من المستكشف:
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                          {activeReport.details}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Frozen Immutable Evidence Viewer */}
                  <div className="admin-report-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div className="admin-report-label">
                        {ta('admin.evidenceMessagesList').replace('{count}', activeReport.evidence?.length || 0)}
                      </div>
                      <span className="admin-badge" style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '11px' }}>
                        🔒 محفوظ ومجمّد وقت الإبلاغ
                      </span>
                    </div>

                    <div className="admin-frozen-notice">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1D4ED8' }}>
                        verified_user
                      </span>
                      <span>{ta('admin.frozenEvidenceNotice')}</span>
                    </div>

                    {(!activeReport.evidence || activeReport.evidence.length === 0) ? (
                      <div className="admin-evidence-empty">
                        <span>لم يحدد المبلّغ رسائل محددة أثناء تقديم هذا البلاغ.</span>
                      </div>
                    ) : (
                      <div className="admin-evidence-transcript">
                        {activeReport.evidence.map((ev, index) => {
                          const isReportedAuthor = ev.sender_id === activeReport.reported_user_id;

                          return (
                            <div
                              key={ev.id || index}
                              className={`admin-evidence-bubble ${isReportedAuthor ? 'from-reported' : 'from-reporter'}`}
                            >
                              <div className="admin-evidence-bubble-meta">
                                <span style={{ fontWeight: 700 }}>
                                  {isReportedAuthor
                                    ? `⚠️ ${activeReport.reportedUser?.display_name || 'المُبلّغ عنه'}`
                                    : (activeReport.reporter?.display_name || 'المبلّغ')}
                                </span>
                                <span style={{ fontSize: '11px', opacity: 0.7 }}>
                                  {formatDate(ev.message_timestamp)}
                                </span>
                              </div>
                              <p className="admin-evidence-bubble-text">{ev.message_content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Administrative Action & Status Form */}
                  <form onSubmit={handleSaveModeration} className="admin-moderation-box">
                    <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>
                      {ta('admin.statusUpdateTitle')}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label className="admin-label">{ta('admin.status')}</label>
                        <select
                          className="admin-select"
                          value={modStatus}
                          onChange={(e) => setModStatus(e.target.value)}
                        >
                          <option value="pending">{ta('admin.pendingReview')}</option>
                          <option value="investigating">{ta('admin.investigating')}</option>
                          <option value="action_taken">{ta('admin.actionTaken')}</option>
                          <option value="dismissed">{ta('admin.dismissed')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="admin-label">نوع الإجراء</label>
                        <select
                          className="admin-select"
                          value={modActionType}
                          onChange={(e) => setModActionType(e.target.value)}
                        >
                          <option value="none">بدون إجراء إضافي</option>
                          <option value="warned">توجيه إنذار</option>
                          <option value="user_banned">حظر المستخدم نهائياً</option>
                          <option value="content_removed">إزالة المحتوى المخالف</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label className="admin-label">{ta('admin.adminNotes')}</label>
                      <textarea
                        rows={2}
                        className="admin-input"
                        placeholder={ta('admin.adminNotesPlaceholder')}
                        value={modNotes}
                        onChange={(e) => setModNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <button
                        type="submit"
                        className="admin-btn admin-btn-primary"
                        disabled={savingMod}
                      >
                        {savingMod ? (
                          <>
                            <span className="admin-spin material-symbols-outlined">progress_activity</span>
                            <span>جارٍ الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined">save</span>
                            <span>{ta('admin.saveStatusBtn')}</span>
                          </>
                        )}
                      </button>

                      {/* Ban / Unban User Trigger */}
                      {activeReport.reportedUser?.is_banned ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline"
                          onClick={handleUnbanUser}
                          disabled={banActionLoading}
                          style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            check_circle
                          </span>
                          {ta('admin.unbanUserBtn')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={handleOpenBanDialog}
                          disabled={banActionLoading}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            block
                          </span>
                          {ta('admin.banUserBtn')}
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Audit History Timeline */}
                  {activeReport.auditLogs && activeReport.auditLogs.length > 0 && (
                    <div className="admin-report-section">
                      <div className="admin-report-label">{ta('admin.auditHistoryTitle')}</div>
                      <div className="admin-audit-timeline">
                        {activeReport.auditLogs.map((log) => (
                          <div key={log.id} className="admin-audit-item">
                            <span className="admin-audit-dot" />
                            <div className="admin-audit-content">
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                {log.action === 'user_banned'
                                  ? '⛔ تم حظر المستخدم'
                                  : log.action === 'user_unbanned'
                                  ? '✅ تم رفع الحظر عن المستخدم'
                                  : '📝 تحديث حالة البلاغ'}
                              </div>
                              {log.reason && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {log.reason}
                                </div>
                              )}
                              <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ban User Dialog */}
      {banDialogOpen && (
        <div className="admin-modal-overlay" onClick={() => setBanDialogOpen(false)} role="dialog" aria-modal="true">
          <div
            className="admin-modal-container"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div className="admin-modal-header">
              <h3 className="admin-modal-title" style={{ color: '#DC2626' }}>
                ⚠️ {ta('admin.confirmBanTitle')}
              </h3>
              <button onClick={() => setBanDialogOpen(false)} className="admin-modal-close">
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                {ta('admin.confirmBanMsg').replace(
                  '{name}',
                  activeReport?.reportedUser?.display_name || 'User'
                )}
              </p>
              <div style={{ marginTop: '12px' }}>
                <label className="admin-label">{ta('admin.banReasonLabel')} *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder={ta('admin.banReasonPlaceholder')}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setBanDialogOpen(false)}
                disabled={banActionLoading}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleConfirmBan}
                disabled={banActionLoading}
              >
                {banActionLoading ? 'جارٍ الحظر...' : ta('admin.banUserBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />

      {/* Moderation SQL Setup Modal */}
      {showDbModal && (
        <div
          className="connect-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mod-db-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDbModal(false);
          }}
        >
          <div className="connect-modal-card db-modal-card" style={{ maxWidth: '680px', width: '92%' }}>
            <div className="connect-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 id="mod-db-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚙️</span>
                <span>{ta('admin.moderationDbModalTitle')}</span>
              </h3>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setShowDbModal(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <ul style={{ margin: '0 0 16px 0', paddingInlineStart: '20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                <li>{ta('admin.moderationDbModalStep1')}</li>
                <li>{ta('admin.moderationDbModalStep2')}</li>
              </ul>

              <pre
                style={{
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  direction: 'ltr',
                  textAlign: 'left',
                  whiteSpace: 'pre',
                }}
              >
                {CHAT_MODERATION_SQL}
              </pre>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowDbModal(false)}
                >
                  {ta('admin.cancel')}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  style={{ backgroundColor: 'var(--secondary)', color: '#FFFFFF', fontWeight: 700 }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(CHAT_MODERATION_SQL);
                      setDbCopied(true);
                      showToast(ta('admin.moderationDbModalCopied'), 'success');
                      setTimeout(() => setDbCopied(false), 3000);
                    } catch (err) {
                      console.warn('Clipboard write failed:', err);
                    }
                  }}
                >
                  <span>{dbCopied ? '✓ ' + ta('admin.moderationDbModalCopied') : ta('admin.moderationDbModalCopyBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
