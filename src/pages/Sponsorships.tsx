import { useState } from 'react';
import { Megaphone, Eye, DollarSign, MousePointerClick, BarChart3, Check, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useSponsoredListings, useSponsoredStats, useUpdateSponsored, usePendingSponsorships, useApproveSponsorship, useRejectSponsorship } from '../hooks/useSponsored';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { SponsoredListing } from '../types';

const LIMIT = 10;

const TYPE_TABS = [
  { label: 'All', value: '' },
  { label: 'Carousel', value: 'carousel' },
  { label: 'Inline', value: 'inline' },
  { label: 'Top Result', value: 'top_result' },
];

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

const APPROVAL_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Sponsorships() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [selected, setSelected] = useState<SponsoredListing | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SponsoredListing>>({});
  const [approvalFilter, setApprovalFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data, isLoading } = useSponsoredListings({
    page, limit: LIMIT,
    type: type || undefined,
    isActive: isActive || undefined,
  });
  const { data: stats } = useSponsoredStats();
  const { data: pendingList } = usePendingSponsorships();
  const updateMutation = useUpdateSponsored();
  const approveMutation = useApproveSponsorship();
  const rejectMutation = useRejectSponsorship();

  // Filter by approval status client-side (if needed)
  const filteredItems = approvalFilter
    ? (data?.items ?? []).filter((i) => i.approvalStatus === approvalFilter)
    : (data?.items ?? []);

  const openEdit = (listing: SponsoredListing) => {
    setEditForm({
      isActive: listing.isActive,
      budgetAmount: listing.budgetAmount,
      costPerClick: listing.costPerClick,
    });
    setEditMode(true);
    setSelected(listing);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({ id: selected.id, body: editForm });
      toast.success('Sponsorship updated');
      setEditMode(false);
      setSelected(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const getCtr = (clicks: number, impressions: number) =>
    impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0%';

  const columns: Column<SponsoredListing>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.provider?.brandName || row.providerId.slice(0, 8)}
            </p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{row.type.replace('_', ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Budget / Spent',
      render: (row) => {
        const pct = Number(row.budgetAmount) > 0 ? (Number(row.spentAmount) / Number(row.budgetAmount)) * 100 : 0;
        return (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(row.spentAmount)} / {formatCurrency(row.budgetAmount)}
            </p>
            <div className="w-full h-1.5 mt-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'performance',
      header: 'Impressions / Clicks',
      render: (row) => (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {row.impressions.toLocaleString()} / {row.clicks.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>CTR: {getCtr(row.clicks, row.impressions)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{
          background: row.isActive ? 'var(--color-success-light)' : 'var(--surface-2)',
          color: row.isActive ? 'var(--color-success-dark)' : 'var(--text-muted)',
        }}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'approval',
      header: 'Approval',
      render: (row) => {
        const colors: Record<string, { bg: string; color: string }> = {
          approved: { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' },
          pending_approval: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
          rejected: { bg: 'var(--color-danger)', color: '#FFFFFF' },
        };
        const style = colors[row.approvalStatus] || colors.approved;
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: style.bg, color: style.color }}>
            {row.approvalStatus === 'pending_approval' ? 'Pending' : row.approvalStatus?.charAt(0).toUpperCase() + row.approvalStatus?.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Period',
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.startsAt)} → {formatDate(row.endsAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.approvalStatus === 'pending_approval' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'approve' }); }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-success)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-success-light)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'reject' }); }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-danger)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(row); setEditMode(false); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Performance"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sponsored Listings"
        description="Manage provider-paid promotional placements"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Sponsorships' }]}
      />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard title="Total Listings" value={stats.total} icon={<Megaphone className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Active" value={stats.active} icon={<Megaphone className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Pending Approval" value={pendingList?.length ?? 0} icon={<Megaphone className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Total Spent" value={formatCurrency(stats.totalSpent)} icon={<DollarSign className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Total Clicks" value={stats.totalClicks.toLocaleString()} icon={<MousePointerClick className="w-5 h-5" />} accent="var(--color-info)" />
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {TYPE_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setType(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
              background: type === tab.value ? 'var(--surface-0)' : 'transparent',
              color: type === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: type === tab.value ? 'var(--shadow-sm)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setIsActive(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
              background: isActive === tab.value ? 'var(--surface-0)' : 'transparent',
              color: isActive === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isActive === tab.value ? 'var(--shadow-sm)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {APPROVAL_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setApprovalFilter(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
              background: approvalFilter === tab.value ? 'var(--surface-0)' : 'transparent',
              color: approvalFilter === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: approvalFilter === tab.value ? 'var(--shadow-sm)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable<SponsoredListing>
        columns={columns}
        data={filteredItems}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setSelected(r); setEditMode(false); }}
      />

      {/* Detail / Edit Panel */}
      <DetailPanel
        open={!!selected}
        onClose={() => { setSelected(null); setEditMode(false); }}
        title={editMode ? 'Edit Sponsorship' : 'Sponsorship Details'}
        subtitle={selected?.provider?.brandName || undefined}
        actions={
          editMode ? (
            <button onClick={handleUpdate} disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <button onClick={() => selected && openEdit(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Edit</button>
          )
        }
      >
        {selected && !editMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Type', selected.type.replace('_', ' ')],
                ['Status', selected.isActive ? 'Active' : 'Inactive'],
                ['Budget', formatCurrency(selected.budgetAmount)],
                ['Spent', formatCurrency(selected.spentAmount)],
                ['CPC', formatCurrency(selected.costPerClick)],
                ['Impressions', selected.impressions.toLocaleString()],
                ['Clicks', selected.clicks.toLocaleString()],
                ['CTR', getCtr(selected.clicks, selected.impressions)],
                ['Starts', formatDate(selected.startsAt)],
                ['Ends', formatDate(selected.endsAt)],
                ['Approval', selected.approvalStatus === 'pending_approval' ? 'Pending' : selected.approvalStatus],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
            {selected.targetCities && selected.targetCities.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Target Cities</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.targetCities.map((city) => (
                    <span key={city} className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{city}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {selected && editMode && (
          <div className="space-y-4">
            <FormField label="Budget Amount">
              <input type="number" value={editForm.budgetAmount ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, budgetAmount: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <FormField label="Cost Per Click">
              <input type="number" step="0.01" value={editForm.costPerClick ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, costPerClick: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <FormField label="Active">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive ?? true} onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Listing is active</span>
              </label>
            </FormField>
          </div>
        )}
      </DetailPanel>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setRejectNotes(''); }}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.action === 'approve') {
            await approveMutation.mutateAsync({ id: confirmAction.id });
          } else {
            await rejectMutation.mutateAsync({ id: confirmAction.id, notes: rejectNotes });
          }
          setConfirmAction(null);
          setRejectNotes('');
        }}
        title={confirmAction?.action === 'approve' ? 'Approve Sponsorship' : 'Reject Sponsorship'}
        description={confirmAction?.action === 'approve' ? 'This sponsorship will become visible to users.' : 'Please provide a reason for rejection.'}
        confirmLabel={confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.action === 'approve' ? 'default' : 'danger'}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      >
        {confirmAction?.action === 'reject' && (
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
            className="w-full mt-3 px-3 py-2 text-sm rounded-lg border resize-none"
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
