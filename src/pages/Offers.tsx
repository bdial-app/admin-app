import { useState } from 'react';
import { Gift, Eye, Pencil, Trash2, Percent, DollarSign, TrendingUp, Check, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { useOffers, useOfferStats, useUpdateOffer, useDeleteOffer, usePendingOffers, useApproveOffer, useRejectOffer } from '../hooks/useOffers';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { ProviderOffer } from '../types';

const LIMIT = 10;
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

export default function Offers() {
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState('');
  const [selected, setSelected] = useState<ProviderOffer | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProviderOffer>>({});
  const [confirmDelete, setConfirmDelete] = useState<ProviderOffer | null>(null);
  const [approvalFilter, setApprovalFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data, isLoading } = useOffers({ page, limit: LIMIT, isActive: isActive || undefined });
  const { data: stats } = useOfferStats();
  const { data: pendingList } = usePendingOffers();
  const updateMutation = useUpdateOffer();
  const deleteMutation = useDeleteOffer();
  const approveMutation = useApproveOffer();
  const rejectMutation = useRejectOffer();

  const filteredItems = approvalFilter
    ? (data?.items ?? []).filter((i) => i.approvalStatus === approvalFilter)
    : (data?.items ?? []);

  const openEdit = (offer: ProviderOffer) => {
    setEditForm({
      isActive: offer.isActive,
      title: offer.title,
      description: offer.description,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minOrderAmount: offer.minOrderAmount,
      maxDiscount: offer.maxDiscount,
      usageLimit: offer.usageLimit,
    });
    setEditMode(true);
    setSelected(offer);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({ id: selected.id, body: editForm });
      toast.success('Offer updated');
      setEditMode(false);
      setSelected(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success('Offer deactivated');
      setConfirmDelete(null);
      setSelected(null);
    } catch {
      toast.error('Failed to delete offer');
    }
  };

  const getDiscountLabel = (offer: ProviderOffer) =>
    offer.discountType === 'percentage'
      ? `${offer.discountValue}%`
      : `₹${Number(offer.discountValue).toLocaleString('en-IN')}`;

  const columns: Column<ProviderOffer>[] = [
    {
      key: 'offer',
      header: 'Offer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
            {row.discountType === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{row.title}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.provider?.brandName || row.providerId.slice(0, 8)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (row) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}>
          {getDiscountLabel(row)} OFF
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (row) => (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{row.usageCount}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {row.usageLimit ? `of ${row.usageLimit}` : 'Unlimited'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const now = new Date();
        const isExpired = new Date(row.endsAt) < now;
        const label = !row.isActive ? 'Inactive' : isExpired ? 'Expired' : 'Active';
        const bg = !row.isActive ? 'var(--surface-2)' : isExpired ? 'var(--color-danger-light)' : 'var(--color-success-light)';
        const color = !row.isActive ? 'var(--text-muted)' : isExpired ? 'var(--color-danger-dark)' : 'var(--color-success-dark)';
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: bg, color }}>{label}</span>;
      },
    },
    {
      key: 'approval',
      header: 'Approval',
      render: (row) => {
        const colors: Record<string, { bg: string; color: string }> = {
          approved: { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' },
          pending_approval: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
          rejected: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' },
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
      header: 'Validity',
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.startsAt)} → {formatDate(row.endsAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.approvalStatus === 'pending_approval' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'approve' }); }} className="p-1.5 rounded-lg" style={{ color: 'var(--color-success)' }} title="Approve"><Check className="w-4 h-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'reject' }); }} className="p-1.5 rounded-lg" style={{ color: 'var(--color-danger)' }} title="Reject"><X className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); setSelected(row); setEditMode(false); }} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><Pencil className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }} className="p-1.5 rounded-lg" style={{ color: 'var(--color-danger)' }}><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Provider Offers"
        description="Manage discount offers across all providers"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Offers' }]}
      />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Offers" value={stats.total} icon={<Gift className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Active" value={stats.active} icon={<Gift className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Pending Approval" value={pendingList?.length ?? 0} icon={<Gift className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Total Redemptions" value={stats.totalUsage} icon={<TrendingUp className="w-5 h-5" />} accent="var(--color-warning)" />
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-4">
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

      <DataTable<ProviderOffer>
        columns={columns}
        data={filteredItems}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setSelected(r); setEditMode(false); }}
      />

      <DetailPanel
        open={!!selected}
        onClose={() => { setSelected(null); setEditMode(false); }}
        title={editMode ? 'Edit Offer' : 'Offer Details'}
        subtitle={selected?.title}
        actions={
          editMode ? (
            <button onClick={handleUpdate} disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => selected && openEdit(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Edit</button>
              <button onClick={() => selected && setConfirmDelete(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-danger)' }}>Deactivate</button>
            </div>
          )
        }
      >
        {selected && !editMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Provider', selected.provider?.brandName || selected.providerId.slice(0, 8)],
                ['Discount', getDiscountLabel(selected)],
                ['Type', selected.discountType],
                ['Status', selected.isActive ? 'Active' : 'Inactive'],
                ['Usage', `${selected.usageCount}${selected.usageLimit ? ` / ${selected.usageLimit}` : ''}`],
                ['Min Order', selected.minOrderAmount ? `₹${selected.minOrderAmount}` : '—'],
                ['Max Discount', selected.maxDiscount ? `₹${selected.maxDiscount}` : '—'],
                ['Starts', formatDate(selected.startsAt)],
                ['Ends', formatDate(selected.endsAt)],
                ['Created', formatDate(selected.createdAt)],
                ['Approval', selected.approvalStatus === 'pending_approval' ? 'Pending' : selected.approvalStatus],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
            {selected.description && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>
              </div>
            )}
          </div>
        )}
        {selected && editMode && (
          <div className="space-y-4">
            <FormField label="Title">
              <input type="text" value={editForm.title ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <FormField label="Description">
              <textarea value={editForm.description ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm rounded-lg border resize-none" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount Type">
                <select value={editForm.discountType ?? 'percentage'} onChange={(e) => setEditForm(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'flat' }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat</option>
                </select>
              </FormField>
              <FormField label="Discount Value">
                <input type="number" value={editForm.discountValue ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, discountValue: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min Order Amount">
                <input type="number" value={editForm.minOrderAmount ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, minOrderAmount: e.target.value ? Number(e.target.value) : null }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              </FormField>
              <FormField label="Max Discount">
                <input type="number" value={editForm.maxDiscount ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, maxDiscount: e.target.value ? Number(e.target.value) : null }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              </FormField>
            </div>
            <FormField label="Usage Limit">
              <input type="number" value={editForm.usageLimit ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, usageLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="Leave empty for unlimited" className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <FormField label="Active">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive ?? true} onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Offer is active</span>
              </label>
            </FormField>
          </div>
        )}
      </DetailPanel>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Deactivate Offer"
        description={`Are you sure you want to deactivate "${confirmDelete?.title}"? The offer will no longer be redeemable.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

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
        title={confirmAction?.action === 'approve' ? 'Approve Offer' : 'Reject Offer'}
        description={confirmAction?.action === 'approve' ? 'This offer will become visible to users.' : 'Please provide a reason for rejection.'}
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
