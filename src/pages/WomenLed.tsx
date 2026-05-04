import { useState } from 'react';
import { CheckCircle2, XCircle, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersService } from '../services/providers.service';
import { toast } from 'react-toastify';

const LIMIT = 10;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function WomenLed() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; item: any } | null>(null);

  // Fetch pending women-led requests
  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['women-led-pending', page],
    queryFn: () => providersService.getWomenLedPending(page, LIMIT),
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['women-led-analytics'],
    queryFn: () => providersService.getWomenLedAnalytics(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => providersService.approveWomenLed(id),
    onSuccess: () => {
      toast.success('Women-Led status approved');
      queryClient.invalidateQueries({ queryKey: ['women-led-pending'] });
      queryClient.invalidateQueries({ queryKey: ['women-led-analytics'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => providersService.rejectWomenLed(id),
    onSuccess: () => {
      toast.success('Women-Led status rejected');
      queryClient.invalidateQueries({ queryKey: ['women-led-pending'] });
      queryClient.invalidateQueries({ queryKey: ['women-led-analytics'] });
    },
    onError: () => toast.error('Failed to reject'),
  });

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      await approveMutation.mutateAsync(confirmAction.item.id);
    } else {
      await rejectMutation.mutateAsync(confirmAction.item.id);
    }
    setConfirmAction(null);
  };

  const columns: Column<any>[] = [
    {
      key: 'brandName',
      header: 'Business',
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.brandName}</p>
          <p className="text-xs text-gray-500">{item.city}{item.area ? `, ${item.area}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Owner',
      render: (item) => (
        <div>
          <p className="text-sm text-gray-900">{item.user?.name || '—'}</p>
          <p className="text-xs text-gray-500">Gender: {item.user?.gender || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Provider Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Applied',
      render: (item) => <span className="text-sm text-gray-600">{formatDate(item.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmAction({ type: 'approve', item })}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'reject', item })}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Women-Led Businesses"
        description="Review and approve women-led business claims"
      />

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalApproved}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalPending}</p>
                <p className="text-xs text-gray-500">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{analytics.percentageOfPlatform}%</p>
                <p className="text-xs text-gray-500">Of Platform</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">+{analytics.newApprovedThisMonth}</p>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Comparison */}
      {analytics?.ratingComparison && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating Comparison</h3>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-lg font-bold text-purple-600">{analytics.ratingComparison.womenLedAvgRating}★</span>
              <span className="text-xs text-gray-500 ml-1">Women-Led Avg</span>
            </div>
            <div className="text-gray-300">vs</div>
            <div>
              <span className="text-lg font-bold text-gray-700">{analytics.ratingComparison.platformAvgRating}★</span>
              <span className="text-xs text-gray-500 ml-1">Platform Avg</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {analytics?.categoryDistribution && analytics.categoryDistribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Categories</h3>
          <div className="flex flex-wrap gap-2">
            {analytics.categoryDistribution.map((cat: any) => (
              <span key={cat.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                {cat.name}
                <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{cat.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pending Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Pending Women-Led Approvals</h3>
        </div>
        <DataTable
          columns={columns}
          data={pendingData?.items || []}
          isLoading={isLoading}
          rowKey={(row: any) => row.id}
          meta={{
            page,
            totalPages: pendingData?.meta?.totalPages || 1,
            total: pendingData?.meta?.total || 0,
            limit: LIMIT,
          }}
          onPageChange={setPage}
          emptyTitle="No pending women-led requests"
        />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'approve' ? 'Approve Women-Led Status' : 'Reject Women-Led Status'}
        description={
          confirmAction?.type === 'approve'
            ? `Approve "${confirmAction.item?.brandName}" as a women-led business? They will receive the badge and incentives.`
            : `Reject the women-led claim for "${confirmAction?.item?.brandName}"? The badge will not be shown.`
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.type === 'approve' ? 'default' : 'danger'}
        onConfirm={handleConfirm}
        onClose={() => setConfirmAction(null)}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      />
    </div>
  );
}
