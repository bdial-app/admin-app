import { useState } from 'react';
import { Eye, Trash2, Star, MessageSquare } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useReviews, useUpdateReviewStatus, useRemoveReview } from '../hooks/useReviews';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Review, ReviewStatus } from '../types';

const LIMIT = 10;
const STATUS_TABS: { label: string; value: ReviewStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Removed', value: 'removed' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className="w-3.5 h-3.5"
        style={{
          fill: n <= rating ? '#F59E0B' : 'transparent',
          color: n <= rating ? '#F59E0B' : 'var(--text-muted)',
        }}
      />
    ))}
  </div>
);

export default function Reviews() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Review | null>(null);

  const { data, isLoading } = useReviews({
    page,
    limit: LIMIT,
    status: status || undefined,
  });

  const updateStatusMutation = useUpdateReviewStatus();
  const removeMutation = useRemoveReview();

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMutation.mutateAsync(confirmRemove.id);
      toast.success('Review removed');
      setConfirmRemove(null);
      setSelectedReview(null);
    } catch {
      toast.error('Failed to remove review');
    }
  };

  const handleApprove = async (review: Review) => {
    try {
      await updateStatusMutation.mutateAsync({ id: review.id, status: 'active' });
      toast.success('Review approved');
    } catch {
      toast.error('Failed to approve review');
    }
  };

  const columns: Column<Review>[] = [
    {
      key: 'reviewer',
      header: 'Reviewer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'var(--color-info)' }}
          >
            {(row.reviewer?.name || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.reviewer?.name || '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              to {row.provider?.brandName || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row) => <RatingStars rating={(row as any).starRating ?? row.rating} />,
    },
    {
      key: 'comment',
      header: 'Comment',
      render: (row) => (
        <p className="text-sm truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
          {((row as any).reviewText ?? row.comment) || <span style={{ color: 'var(--text-muted)' }}>No comment</span>}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize"
          style={{
            background:
              row.status === 'active' ? 'var(--color-success-light)' :
              row.status === 'removed' ? 'var(--color-danger-light)' :
              'var(--color-warning-light)',
            color:
              row.status === 'active' ? 'var(--color-success-dark)' :
              row.status === 'removed' ? 'var(--color-danger-dark)' :
              'var(--color-warning-dark)',
          }}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate((row as any).postedAt ?? row.createdAt)}
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
          onClick={(e) => { e.stopPropagation(); setSelectedReview(row); }}
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
        title="Reviews"
        description={data?.meta ? `${data.meta.total.toLocaleString()} reviews total` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Reviews' },
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

      <DataTable<Review>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelectedReview}
      />

      {/* Review Detail Panel */}
      <DetailPanel
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Review Detail"
        subtitle={selectedReview?.reviewer?.name || undefined}
        actions={
          selectedReview && (
            <div className="flex gap-2">
              {selectedReview.status !== 'active' && (
                <button
                  onClick={() => handleApprove(selectedReview)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-success)' }}
                >
                  Approve
                </button>
              )}
              {selectedReview.status !== 'removed' && (
                <button
                  onClick={() => setConfirmRemove(selectedReview)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-danger)' }}
                >
                  <Trash2 className="w-4 h-4 inline mr-1.5" />
                  Remove
                </button>
              )}
            </div>
          )
        }
      >
        {selectedReview && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <RatingStars rating={(selectedReview as any).starRating ?? selectedReview.rating} />
              <span
                className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize"
                style={{
                  background:
                    selectedReview.status === 'active' ? 'var(--color-success-light)' :
                    selectedReview.status === 'removed' ? 'var(--color-danger-light)' :
                    'var(--color-warning-light)',
                  color:
                    selectedReview.status === 'active' ? 'var(--color-success-dark)' :
                    selectedReview.status === 'removed' ? 'var(--color-danger-dark)' :
                    'var(--color-warning-dark)',
                }}
              >
                {selectedReview.status}
              </span>
            </div>

            {((selectedReview as any).reviewText ?? selectedReview.comment) && (
              <div
                className="p-3 rounded-lg text-sm leading-relaxed"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" style={{ color: 'var(--text-muted)' }} />
                {(selectedReview as any).reviewText ?? selectedReview.comment}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Reviewer', value: selectedReview.reviewer?.name },
                { label: 'Provider', value: selectedReview.provider?.brandName },
                { label: 'Date', value: formatDate((selectedReview as any).postedAt ?? selectedReview.createdAt) },
                { label: 'Rating', value: `${(selectedReview as any).starRating ?? selectedReview.rating}/5` },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {field.value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
        title="Remove Review"
        description={`Are you sure you want to remove this review by ${confirmRemove?.reviewer?.name || 'this user'}? It will be flagged as removed.`}
        confirmLabel="Remove Review"
        variant="danger"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
