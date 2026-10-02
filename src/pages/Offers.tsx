import { useState } from 'react';
import { Gift, Eye, Pencil, Trash2, Percent, DollarSign, TrendingUp, Check, X, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { FilterBar, Select, useUrlFilters } from '../components/ui/filters';
import {
  OFFER_FILTER_DEFS, OFFER_FILTER_KEYS, OFFER_OP_STATUS, OFFER_SORTS, offerSegments, withOfferOptions, type OfferOpStatus,
} from '../components/offers/offer-filters';
import { useOffers, useOfferFilterOptions, useOfferStats, useUpdateOffer, useDeleteOffer, usePendingOffers, useApproveOffer, useRejectOffer } from '../hooks/useOffers';
import { useFlatCategories } from '../hooks/useCategories';
import { CreateDealPanel } from '../components/offers/CreateDealPanel';
import { PermissionGate } from '../components/auth/PermissionGate';
import type { OfferFilters } from '../services/offers.service';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { DiscountType, ProviderOffer } from '../types';

const LIMIT = 10;

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'flat', label: 'Flat' },
];

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border';
const inputStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' } as const;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Same vocabulary as the `opStatus` filter, computed from the row. */
function offerOpStatus(offer: ProviderOffer): OfferOpStatus {
  const now = Date.now();
  if (!offer.isActive) return 'inactive';
  if (new Date(offer.endsAt).getTime() < now) return 'expired';
  if (offer.usageLimit != null && offer.usageCount >= offer.usageLimit) return 'exhausted';
  if (new Date(offer.startsAt).getTime() > now) return 'scheduled';
  return 'live';
}

function OpStatusBadge({ offer }: { offer: ProviderOffer }) {
  const s = OFFER_OP_STATUS[offerOpStatus(offer)];
  return (
    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function Offers() {
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(OFFER_FILTER_KEYS);
  const [selected, setSelected] = useState<ProviderOffer | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProviderOffer>>({});
  const [confirmDelete, setConfirmDelete] = useState<ProviderOffer | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useOffers({
    ...(filters as OfferFilters),
    sort: (sort || undefined) as OfferFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = useOfferFilterOptions();
  const { data: categories } = useFlatCategories();
  const { data: stats } = useOfferStats();
  const { data: pendingList } = usePendingOffers();
  const updateMutation = useUpdateOffer();
  const deleteMutation = useDeleteOffer();
  const approveMutation = useApproveOffer();
  const rejectMutation = useRejectOffer();

  const subtitle = data?.meta
    ? hasNarrowing
      ? `${data.meta.total.toLocaleString()}${filterOptions ? ` of ${filterOptions.counts.total.toLocaleString()}` : ''} offers match your filters`
      : `${data.meta.total.toLocaleString()} offers across all providers`
    : 'Manage discount offers across all providers';

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
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {row.provider?.brandName || row.providerId.slice(0, 8)}
              {row.provider?.city ? ` · ${row.provider.city}` : ''}
            </p>
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
      render: (row) => <OpStatusBadge offer={row} />,
    },
    {
      key: 'approval',
      header: 'Approval',
      render: (row) => <StatusBadge status={row.approvalStatus === 'pending_approval' ? 'pending' : row.approvalStatus} />,
    },
    {
      key: 'dates',
      header: 'Validity',
      render: (row) => {
        const daysLeft = Math.ceil((new Date(row.endsAt).getTime() - Date.now()) / 86400000);
        const live = offerOpStatus(row) === 'live';
        return (
          <div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatDate(row.startsAt)} → {formatDate(row.endsAt)}
            </span>
            {live && daysLeft <= 7 && (
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: daysLeft <= 3 ? 'var(--color-danger)' : 'var(--color-warning-dark)' }}>
                Ends in {Math.max(daysLeft, 0)}d
              </p>
            )}
          </div>
        );
      },
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
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(row); setEditMode(false); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-danger)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Provider Offers"
        description={subtitle}
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Offers' }]}
        actions={
          <PermissionGate permission="offers.create">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus className="w-4 h-4" />
              Create Deal
            </button>
          </PermissionGate>
        }
      />

      <CreateDealPanel open={showCreate} onClose={() => setShowCreate(false)} />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Offers" value={stats.total} icon={<Gift className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Active" value={stats.active} icon={<Gift className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Pending Approval" value={pendingList?.length ?? 0} icon={<Gift className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Total Redemptions" value={stats.totalUsage} icon={<TrendingUp className="w-5 h-5" />} accent="var(--color-warning)" />
        </div>
      )}

      <FilterBar
        defs={withOfferOptions(OFFER_FILTER_DEFS, filterOptions, categories)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by offer title or business…' }}
        sort={{ options: OFFER_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: newest first' }}
        segments={offerSegments(filterOptions)}
        resultCount={hasNarrowing ? data?.meta?.total : undefined}
        totalCount={filterOptions?.counts.total}
      />

      <DataTable<ProviderOffer>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setSelected(r); setEditMode(false); }}
        emptyIcon={<Gift className="w-10 h-10" />}
        emptyTitle={hasNarrowing ? 'No offers match these filters' : 'No offers yet'}
        emptyDescription={hasNarrowing ? 'Remove a filter or pick a different segment above.' : 'Offers appear here as providers create them — or add one yourself with Create Deal.'}
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
                { label: 'Provider', value: selected.provider?.brandName || selected.providerId.slice(0, 8) },
                { label: 'Discount', value: getDiscountLabel(selected) },
                { label: 'Type', value: selected.discountType },
                { label: 'Usage', value: `${selected.usageCount}${selected.usageLimit ? ` / ${selected.usageLimit}` : ''}` },
                { label: 'Min Order', value: selected.minOrderAmount ? `₹${selected.minOrderAmount}` : '—' },
                { label: 'Max Discount', value: selected.maxDiscount ? `₹${selected.maxDiscount}` : '—' },
                { label: 'Starts', value: formatDate(selected.startsAt) },
                { label: 'Ends', value: formatDate(selected.endsAt) },
                { label: 'Created', value: formatDate(selected.createdAt) },
              ].map((field) => (
                <div key={field.label} className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{field.label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate capitalize" style={{ color: 'var(--text-primary)' }}>{field.value}</p>
                </div>
              ))}
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Status</p>
                <div className="mt-1"><OpStatusBadge offer={selected} /></div>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Approval</p>
                <div className="mt-1">
                  <StatusBadge status={selected.approvalStatus === 'pending_approval' ? 'pending' : selected.approvalStatus} />
                </div>
              </div>
            </div>
            {selected.description && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>
              </div>
            )}
            {selected.adminNotes && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Review notes</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.adminNotes}</p>
              </div>
            )}
          </div>
        )}
        {selected && editMode && (
          <div className="space-y-4">
            <FormField label="Title">
              <input type="text" value={editForm.title ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} style={inputStyle} />
            </FormField>
            <FormField label="Description">
              <textarea value={editForm.description ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount Type">
                <Select
                  value={editForm.discountType ?? 'percentage'}
                  onChange={(v) => setEditForm(prev => ({ ...prev, discountType: v as DiscountType }))}
                  options={DISCOUNT_TYPE_OPTIONS}
                  className="w-full"
                />
              </FormField>
              <FormField label="Discount Value">
                <input type="number" value={editForm.discountValue ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, discountValue: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min Order Amount">
                <input type="number" value={editForm.minOrderAmount ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, minOrderAmount: e.target.value ? Number(e.target.value) : null }))} className={inputCls} style={inputStyle} />
              </FormField>
              <FormField label="Max Discount">
                <input type="number" value={editForm.maxDiscount ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, maxDiscount: e.target.value ? Number(e.target.value) : null }))} className={inputCls} style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Usage Limit">
              <input type="number" value={editForm.usageLimit ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, usageLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="Leave empty for unlimited" className={inputCls} style={inputStyle} />
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
            className={`${inputCls} mt-3 resize-none`}
            style={inputStyle}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
