import { useState } from 'react';
import { Eye, CheckCircle2, XCircle, FileText, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { VerificationStepper } from '../components/ui/VerificationStepper';
import { DocumentViewer } from '../components/ui/DocumentViewer';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import {
  VERIFICATION_FILTER_DEFS, VERIFICATION_FILTER_KEYS, VERIFICATION_SORTS, verificationSegments, withVerificationOptions,
} from '../components/verifications/verification-filters';
import { useVerifications, useVerificationFilterOptions, useReviewVerification } from '../hooks/useVerifications';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Verification, VerificationFilters } from '../types';

const LIMIT = 10;
/** Amber from this many days without a decision. */
const WAITING_WARN_DAYS = 3;

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * Days an application has been waiting. Decided applications are not waiting
 * (whatever the server sends); otherwise prefer the server's `waitingDays`
 * and fall back to deriving it from `createdAt`.
 */
function waitingDaysOf(v: Verification): number | null {
  if (v.status === 'approved' || v.status === 'rejected') return null;
  if (v.waitingDays != null) return v.waitingDays;
  if (!v.createdAt) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86_400_000));
}

export default function Verifications() {
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(VERIFICATION_FILTER_KEYS);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; verification: Verification } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useVerifications({
    ...(filters as VerificationFilters),
    sort: (sort || undefined) as VerificationFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = useVerificationFilterOptions();

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
      header: 'Applicant',
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
              {[row.user?.mobileNumber, row.user?.city].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'aadhaarStatus',
      header: 'Aadhaar',
      render: (row) => <StatusBadge status={row.aadhaarStatus} />,
    },
    {
      key: 'ijamatStatus',
      header: 'iJamat',
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
              <FileText className="w-3 h-3" /> iJamat
            </span>
          )}
          {!row.aadhaarDocUrl && !row.ijamatDocUrl && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
        </div>
      ),
    },
    {
      key: 'waiting',
      header: 'Waiting',
      render: (row) => {
        const days = waitingDaysOf(row);
        const warn = days != null && days >= WAITING_WARN_DAYS;
        return (
          <div className="whitespace-nowrap">
            {days == null ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>—</p>
            ) : (
              <p className="text-sm font-semibold tabular-nums" style={{ color: warn ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                {days === 0 ? 'Today' : `${days}d`}
              </p>
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }} title={row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : undefined}>
              {row.createdAt ? `Submitted ${formatDate(row.createdAt)}` : 'Submission date unknown'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'reviewedAt',
      header: 'Reviewed',
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-sm" style={{ color: row.reviewedAt ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {formatDate(row.reviewedAt)}
          </p>
          {(row.reviewer?.name || row.reviewerName) && (
            <p className="text-xs truncate max-w-[10rem]" style={{ color: 'var(--text-muted)' }}>
              by {row.reviewer?.name || row.reviewerName}
            </p>
          )}
        </div>
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
          aria-label="View verification"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const selectedWaiting = selected ? waitingDaysOf(selected) : null;

  return (
    <div>
      <PageHeader
        title="Verifications"
        description={
          data?.meta
            ? hasNarrowing && filterOptions
              ? `${data.meta.total.toLocaleString()} of ${filterOptions.counts.total.toLocaleString()} submissions match your filters`
              : `${data.meta.total.toLocaleString()} submissions`
            : undefined
        }
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Verifications' },
        ]}
      />

      <FilterBar
        defs={withVerificationOptions(VERIFICATION_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by name or mobile…' }}
        sort={{ options: VERIFICATION_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: oldest first' }}
        segments={verificationSegments(filterOptions)}
        resultCount={hasNarrowing ? data?.meta?.total : undefined}
        totalCount={filterOptions?.counts.total}
      />

      <DataTable<Verification>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
        emptyIcon={<ShieldCheck className="w-10 h-10" />}
        emptyTitle={hasNarrowing ? 'No submissions match these filters' : 'No verification submissions yet'}
        emptyDescription={hasNarrowing ? 'Remove a filter or pick a different segment above.' : 'Applications appear here as users submit their documents.'}
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
                  {[selected.user?.mobileNumber, selected.user?.city].filter(Boolean).join(' · ') || '—'}
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
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>iJamat Status</p>
                <div className="mt-1"><StatusBadge status={selected.ijamatStatus} /></div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Submitted</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(selected.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Waiting</p>
                <p
                  className="text-sm font-medium mt-0.5"
                  style={{ color: selectedWaiting != null && selectedWaiting >= WAITING_WARN_DAYS ? 'var(--color-warning)' : 'var(--text-primary)' }}
                >
                  {selectedWaiting == null ? 'Decided' : selectedWaiting === 0 ? 'Submitted today' : `${selectedWaiting} day${selectedWaiting === 1 ? '' : 's'}`}
                </p>
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
                  {selected.reviewer?.name || selected.reviewerName || '—'}
                </p>
              </div>
            </div>

            {/* Documents — shown inline so the reviewer can read them here */}
            <div>
              <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Documents</p>
              <div className="space-y-3">
                {selected.aadhaarDocUrl ? (
                  <DocumentViewer url={selected.aadhaarDocUrl} label="Aadhaar Document" />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">No Aadhaar document submitted</span>
                  </div>
                )}
                {selected.ijamatDocUrl && (
                  <DocumentViewer
                    url={selected.ijamatDocUrl}
                    label="iJamat Document"
                    caption={selected.ijamatNumber ? `iJamat no. ${selected.ijamatNumber}` : undefined}
                  />
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
