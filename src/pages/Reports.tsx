import { useState } from 'react';
import { Eye, AlertTriangle, ShieldCheck, Ban, XCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { useReports, useReviewReport, useReportStats } from '../hooks/useReports';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Report, ReportStatus } from '../types';

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
        <div className="flex items-center gap-2">
          <span
            className="inline-flex px-2 py-0.5 text-xs font-medium rounded capitalize"
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
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
          {row.reason?.replace(/_/g, ' ') || '—'}
        </span>
      ),
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
            {/* Report Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Entity Type', value: selected.entityType },
                { label: 'Reason', value: selected.reason?.replace(/_/g, ' ') },
                { label: 'Status', value: selected.status },
                { label: 'Action', value: selected.adminAction?.replace(/_/g, ' ') },
                { label: 'Reporter', value: selected.reporter?.name || selected.reporter?.mobileNumber },
                { label: 'Filed', value: formatDate(selected.createdAt) },
                { label: 'Reviewed By', value: selected.reviewer?.name },
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
        <div className="mt-3">
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
      </ConfirmDialog>
    </div>
  );
}
