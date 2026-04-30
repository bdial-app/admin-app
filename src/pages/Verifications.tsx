import { useState } from 'react';
import { Eye, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { VerificationStepper } from '../components/ui/VerificationStepper';
import { useVerifications, useReviewVerification } from '../hooks/useVerifications';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Verification, DocStatus } from '../types';

const LIMIT = 10;
const STATUS_TABS: { label: string; value: DocStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Verifications() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocStatus | ''>('');
  const [selected, setSelected] = useState<Verification | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; verification: Verification } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useVerifications({
    page,
    limit: LIMIT,
    status: status || undefined,
    search: search || undefined,
  });

  const reviewMutation = useReviewVerification();

  const handleReview = async () => {
    if (!confirmAction) return;
    try {
      await reviewMutation.mutateAsync({
        id: confirmAction.verification.id,
        body: {
          aadhaarStatus: confirmAction.type === 'approve' ? 'approved' : 'rejected',
          adminNotes: adminNotes || undefined,
        },
      });
      toast.success(`Verification ${confirmAction.type === 'approve' ? 'approved' : 'rejected'}`);
      setConfirmAction(null);
      setAdminNotes('');
      setSelected(null);
    } catch {
      toast.error('Failed to review verification');
    }
  };

  const columns: Column<Verification>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'var(--color-info)' }}
          >
            {(row.user?.name || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.user?.name || '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {row.user?.mobileNumber || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'aadhaarStatus',
      header: 'Aadhaar',
      render: (row) => <StatusBadge status={row.aadhaarStatus} />,
    },
    {
      key: 'ijamatStatus',
      header: 'Ijamat',
      render: (row) => <StatusBadge status={row.ijamatStatus} />,
    },
    {
      key: 'documents',
      header: 'Documents',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.aadhaarDocUrl && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              <FileText className="w-3 h-3" /> Aadhaar
            </span>
          )}
          {row.ijamatDocUrl && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              <FileText className="w-3 h-3" /> Ijamat
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'reviewedAt',
      header: 'Reviewed',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.reviewedAt)}
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
        title="Verifications"
        description={data?.meta ? `${data.meta.total.toLocaleString()} submissions` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Verifications' },
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

      <DataTable<Verification>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by name or mobile…"
        searchValue={search}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
      />

      {/* Verification Detail Panel */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Verification Detail"
        subtitle={selected?.user?.name || undefined}
        actions={
          selected?.aadhaarStatus === 'pending' ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction({ type: 'approve', verification: selected })}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-success)' }}
              >
                <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                Approve
              </button>
              <button
                onClick={() => setConfirmAction({ type: 'reject', verification: selected })}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: 'var(--color-danger)' }}
              >
                <XCircle className="w-4 h-4 inline mr-1.5" />
                Reject
              </button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ background: 'var(--color-info)' }}
              >
                {(selected.user?.name || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selected.user?.name || '—'}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {selected.user?.mobileNumber || '—'}
                </p>
              </div>
            </div>

            {/* Verification Progress Stepper */}
            <div>
              <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Verification Progress</p>
              <VerificationStepper verification={selected} />
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Aadhaar Status</p>
                <div className="mt-1"><StatusBadge status={selected.aadhaarStatus} /></div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Ijamat Status</p>
                <div className="mt-1"><StatusBadge status={selected.ijamatStatus} /></div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Reviewed At</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(selected.reviewedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Reviewed By</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {selected.reviewer?.name || '—'}
                </p>
              </div>
            </div>

            {/* Documents */}
            <div>
              <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Documents</p>
              <div className="space-y-2">
                {selected.aadhaarDocUrl && (
                  <a
                    href={selected.aadhaarDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg transition-colors"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--color-primary)' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">View Aadhaar Document</span>
                  </a>
                )}
                {selected.ijamatDocUrl && (
                  <a
                    href={selected.ijamatDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg transition-colors"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--color-primary)' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">View Ijamat Document</span>
                  </a>
                )}
              </div>
            </div>

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
        title={confirmAction?.type === 'approve' ? 'Approve Verification' : 'Reject Verification'}
        description={
          confirmAction?.type === 'approve'
            ? `Approve verification for ${confirmAction.verification.user?.name || 'this user'}?`
            : `Reject verification for ${confirmAction?.verification.user?.name || 'this user'}?`
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.type === 'approve' ? 'default' : 'danger'}
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
            placeholder="Add notes about this review decision…"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
