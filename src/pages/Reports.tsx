import { useState } from 'react';
import { Eye, AlertTriangle, ShieldCheck, Ban, XCircle, User, Clock, FileWarning, Shield } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { useReports, useReport, useReviewReport, useReportStats } from '../hooks/useReports';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Report, ReportDetail, ReportStatus } from '../types';

const LIMIT = 10;
const STATUS_TABS: { label: string; value: ReportStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Action Taken', value: 'action_taken' },
  { label: 'Dismissed', value: 'dismissed' },
];

const ENTITY_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Provider', value: 'provider' },
  { label: 'Product', value: 'product' },
  { label: 'Message', value: 'message' },
];

const ACTION_OPTIONS: { label: string; value: 'dismiss' | 'warn' | 'suspend' | 'ban'; icon: typeof XCircle; variant: 'default' | 'danger' | 'warning' }[] = [
  { label: 'Dismiss', value: 'dismiss', icon: XCircle, variant: 'default' },
  { label: 'Warn', value: 'warn', icon: AlertTriangle, variant: 'warning' },
  { label: 'Suspend', value: 'suspend', icon: ShieldCheck, variant: 'danger' },
  { label: 'Ban', value: 'ban', icon: Ban, variant: 'danger' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Reports() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [entityType, setEntityType] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: 'dismiss' | 'warn' | 'suspend' | 'ban'; report: Report } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useReports({
    page,
    limit: LIMIT,
    status: status || undefined,
    entityType: (entityType as import('../types').ReportEntityType) || undefined,
  });

  const { data: stats } = useReportStats();
  const { data: reportDetail } = useReport(selected?.id ?? '');
  const reviewMutation = useReviewReport();

  const handleReview = async () => {
    if (!confirmAction) return;
    try {
      await reviewMutation.mutateAsync({
        id: confirmAction.report.id,
        action: confirmAction.action,
        adminNotes: adminNotes || undefined,
      });
      toast.success(`Report ${confirmAction.action === 'dismiss' ? 'dismissed' : 'action taken'}`);
      setConfirmAction(null);
      setAdminNotes('');
      setSelected(null);
    } catch {
      toast.error('Failed to review report');
    }
  };

  const columns: Column<Report>[] = [
    {
      key: 'entityType',
      header: 'Target',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.targetSummary?.imageUrl ? (
            <img
              src={row.targetSummary.imageUrl}
              alt=""
              className="w-8 h-8 rounded-lg object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--surface-2)' }}
            >
              <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.targetSummary?.name || row.entityId?.slice(0, 8) + '…'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded capitalize"
                style={{
                  background:
                    row.entityType === 'provider' ? 'var(--color-primary-light)' :
                    row.entityType === 'product' ? 'var(--color-info-light)' :
                    'var(--color-warning-light)',
                  color:
                    row.entityType === 'provider' ? 'var(--color-primary)' :
                    row.entityType === 'product' ? 'var(--color-info-dark)' :
                    'var(--color-warning-dark)',
                }}
              >
                {row.entityType}
              </span>
              {(row.targetSummary?.totalReports ?? 0) >= 3 && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded"
                  style={{ background: 'var(--color-danger-light, #fee2e2)', color: 'var(--color-danger, #dc2626)' }}
                >
                  <FileWarning className="w-3 h-3" />
                  {row.targetSummary?.totalReports} reports
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => {
        const isHighSeverity = ['fraud_scam', 'fraud', 'fake_business', 'fake_product', 'counterfeit'].includes(row.reason);
        return (
          <span
            className={`text-sm capitalize ${isHighSeverity ? 'font-semibold' : ''}`}
            style={{ color: isHighSeverity ? 'var(--color-danger, #dc2626)' : 'var(--text-primary)' }}
          >
            {row.reason?.replace(/_/g, ' ') || '—'}
          </span>
        );
      },
    },
    {
      key: 'reporter',
      header: 'Reporter',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {row.reporter?.name || row.reporter?.mobileNumber || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Filed',
      sortable: true,
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelected(row); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description={stats ? `${stats.pendingCount} pending · ${stats.reportsThisWeek} this week` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Reports' },
        ]}
      />

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: status === tab.value ? 'var(--surface-0)' : 'transparent',
              color: status === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: status === tab.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable<Report>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
        filters={
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg focus-ring"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            {ENTITY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        }
      />

      {/* Report Detail Panel */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Report Detail"
        subtitle={`${selected?.entityType || ''} · ${selected?.reason?.replace(/_/g, ' ') || ''}`}
        actions={
          selected?.status === 'pending' ? (
            <div className="flex gap-2 flex-wrap">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfirmAction({ action: opt.value, report: selected })}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    background: opt.variant === 'danger' ? 'var(--color-danger)' : opt.variant === 'warning' ? 'var(--color-warning)' : 'var(--surface-2)',
                    color: opt.variant === 'default' ? 'var(--text-secondary)' : 'white',
                  }}
                >
                  <opt.icon className="w-3.5 h-3.5 inline mr-1" />
                  {opt.label}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Target Entity Card */}
            {(selected.targetSummary || (reportDetail as ReportDetail)?.targetEntity) && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-medium uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                  Reported Target
                </p>
                <div className="flex items-center gap-3">
                  {selected.targetSummary?.imageUrl ? (
                    <img
                      src={selected.targetSummary.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selected.targetSummary?.name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded capitalize"
                        style={{
                          background:
                            selected.entityType === 'provider' ? 'var(--color-primary-light)' :
                            selected.entityType === 'product' ? 'var(--color-info-light)' :
                            'var(--color-warning-light)',
                          color:
                            selected.entityType === 'provider' ? 'var(--color-primary)' :
                            selected.entityType === 'product' ? 'var(--color-info-dark)' :
                            'var(--color-warning-dark)',
                        }}
                      >
                        {selected.entityType}
                      </span>
                      {selected.targetSummary?.status && (
                        <StatusBadge status={selected.targetSummary.status} />
                      )}
                    </div>
                  </div>
                  {(selected.targetSummary?.totalReports ?? 0) > 0 && (
                    <div className="text-center shrink-0">
                      <p
                        className="text-xl font-bold"
                        style={{ color: (selected.targetSummary?.totalReports ?? 0) >= 3 ? 'var(--color-danger, #dc2626)' : 'var(--text-primary)' }}
                      >
                        {selected.targetSummary?.totalReports}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>total reports</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Report Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Reason', value: selected.reason?.replace(/_/g, ' ') },
                { label: 'Status', value: selected.status },
                { label: 'Action Taken', value: selected.adminAction?.replace(/_/g, ' ') },
                { label: 'Filed', value: formatDate(selected.createdAt) },
                { label: 'Reporter', value: selected.reporter?.name || selected.reporter?.mobileNumber },
                { label: 'Reviewed At', value: selected.reviewedAt ? formatDate(selected.reviewedAt) : null },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>
                    {field.value || '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Description */}
            {selected.description && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
                  {selected.description}
                </p>
              </div>
            )}

            {/* Reporter Credibility */}
            {(reportDetail as ReportDetail)?.reporterCredibility && (
              <div>
                <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Shield className="w-3.5 h-3.5 inline mr-1" />
                  Reporter Credibility
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total Filed', value: (reportDetail as ReportDetail).reporterCredibility!.totalFiled },
                    { label: 'Actioned', value: (reportDetail as ReportDetail).reporterCredibility!.actionCount },
                    { label: 'Dismissed', value: (reportDetail as ReportDetail).reporterCredibility!.dismissedCount },
                    { label: 'Credibility', value: `${((parseFloat((reportDetail as ReportDetail).reporterCredibility!.credibilityRatio || '0')) * 100).toFixed(0)}%` },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center p-2 rounded-lg"
                      style={{ background: 'var(--surface-1)' }}
                    >
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report History on this Target */}
            {(reportDetail as ReportDetail)?.otherReportsOnTarget && (reportDetail as ReportDetail).otherReportsOnTarget!.length > 1 && (
              <div>
                <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Report History ({(reportDetail as ReportDetail).otherReportsOnTarget!.length} total on this target)
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(reportDetail as ReportDetail).otherReportsOnTarget!.map((r: Report) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${r.id === selected.id ? 'ring-2' : ''}`}
                      style={{
                        background: 'var(--surface-1)',
                        borderColor: 'var(--border-default)',
                        ...(r.id === selected.id ? { ringColor: 'var(--color-primary)' } : {}),
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={r.status} />
                        <span className="capitalize truncate" style={{ color: 'var(--text-primary)' }}>
                          {r.reason?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.adminAction && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            {r.adminAction}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selected.adminNotes && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Admin Notes</p>
                <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
                  {selected.adminNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Review Confirmation */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setAdminNotes(''); }}
        onConfirm={handleReview}
        title={`${confirmAction?.action ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1) : ''} Report`}
        description={`Are you sure you want to ${confirmAction?.action} this report?`}
        confirmLabel={confirmAction?.action ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1) : 'Confirm'}
        variant={confirmAction?.action === 'dismiss' ? 'default' : 'danger'}
        isLoading={reviewMutation.isPending}
      >
        <div className="space-y-3 mt-3">
          {/* Escalation hint */}
          {confirmAction?.action === 'warn' && (confirmAction.report.targetSummary?.totalReports ?? 0) >= 3 && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#d97706' }} />
              <div>
                <p className="font-semibold" style={{ color: '#d97706' }}>
                  This target has {confirmAction.report.targetSummary?.totalReports} reports
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#92400e' }}>
                  Consider escalating to <strong>Suspend</strong> instead of Warning for repeated violations.
                </p>
              </div>
            </div>
          )}
          {confirmAction?.action === 'suspend' && (confirmAction.report.targetSummary?.totalReports ?? 0) >= 5 && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)' }}
            >
              <Ban className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
              <div>
                <p className="font-semibold" style={{ color: '#dc2626' }}>
                  This target has {confirmAction.report.targetSummary?.totalReports} reports
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#991b1b' }}>
                  With this many reports, you may want to consider a <strong>Ban</strong> to disable the user account entirely.
                </p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
              Admin Notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                resize: 'none',
              }}
              rows={3}
              placeholder="Add notes about this decision…"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
