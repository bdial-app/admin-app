import { useState } from 'react';
import { Plus, Eye, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { FormField } from '../components/ui/FormField';
import { StatCard } from '../components/ui/StatCard';
import { useVouchers, useVoucherStats, useCreateVoucher, useUpdateVoucher, useVoucherRedemptions } from '../hooks/useVouchers';
import type { Voucher, VoucherRedemption } from '../services/vouchers.service';
import { toast } from 'react-toastify';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed_amount', label: 'Fixed Amount (₹)' },
];

const APPLICABLE_TO = ['sponsorship', 'lead_unlock', 'subscription', 'badge', 'deal_unlock'];

export default function Vouchers() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [viewRedemptions, setViewRedemptions] = useState<string | null>(null);

  const { data, isLoading } = useVouchers({ page, limit: 20 });
  const { data: stats } = useVoucherStats();
  const { data: redemptions } = useVoucherRedemptions(viewRedemptions ?? '');
  const createMutation = useCreateVoucher();
  const updateMutation = useUpdateVoucher();

  // Form state
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'percentage' as 'percentage' | 'fixed_amount',
    discountValue: 0, maxUses: '', maxUsesPerProvider: '', minPurchaseAmount: '',
    maxDiscountAmount: '', applicableTo: [] as string[], validFrom: '', validUntil: '',
  });

  const resetForm = () => setForm({
    code: '', description: '', discountType: 'percentage', discountValue: 0,
    maxUses: '', maxUsesPerProvider: '', minPurchaseAmount: '', maxDiscountAmount: '',
    applicableTo: [], validFrom: '', validUntil: '',
  });

  const handleCreate = async () => {
    if (!form.code || !form.discountValue) { toast.error('Code and discount value required'); return; }
    try {
      await createMutation.mutateAsync({
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        maxUsesPerProvider: form.maxUsesPerProvider ? Number(form.maxUsesPerProvider) : undefined,
        minPurchaseAmount: form.minPurchaseAmount ? Number(form.minPurchaseAmount) : undefined,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        applicableTo: form.applicableTo.length > 0 ? form.applicableTo : undefined,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      });
      toast.success('Voucher created');
      setShowCreate(false);
      resetForm();
    } catch { toast.error('Failed to create voucher'); }
  };

  const handleToggle = async (voucher: Voucher) => {
    try {
      await updateMutation.mutateAsync({ id: voucher.id, body: { isActive: !voucher.isActive } });
      toast.success(voucher.isActive ? 'Voucher deactivated' : 'Voucher activated');
    } catch { toast.error('Failed to update voucher'); }
  };

  const columns: Column<Voucher>[] = [
    { key: 'code', header: 'Code', render: (v) => <span className="font-mono font-semibold">{v.code}</span> },
    { key: 'discountType', header: 'Discount', render: (v) => v.discountType === 'percentage' ? `${v.discountValue}%` : `₹${v.discountValue}` },
    { key: 'usedCount', header: 'Used', render: (v) => `${v.usedCount}${v.maxUses ? ` / ${v.maxUses}` : ''}` },
    { key: 'applicableTo', header: 'Applies To', render: (v) => (v.applicableTo?.length ? v.applicableTo.join(', ') : 'All') },
    { key: 'validUntil', header: 'Expires', render: (v) => v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '—' },
    {
      key: 'isActive', header: 'Status', render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {v.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', render: (v) => (
        <div className="flex gap-1">
          <button onClick={() => { navigator.clipboard.writeText(v.code); toast.info('Copied!'); }} className="p-1 rounded hover:bg-gray-100" title="Copy code"><Copy size={14} /></button>
          <button onClick={() => setViewRedemptions(v.id)} className="p-1 rounded hover:bg-gray-100" title="View redemptions"><Eye size={14} /></button>
          <button onClick={() => handleToggle(v)} className="p-1 rounded hover:bg-gray-100" title="Toggle active">
            {v.isActive ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Vouchers" description="Manage discount codes and coupons"
        actions={<button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5"><Plus size={16} /> Create Voucher</button>} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Vouchers" value={stats.totalVouchers} />
          <StatCard title="Active" value={stats.activeVouchers} accent="var(--color-success)" />
          <StatCard title="Total Redemptions" value={stats.totalRedemptions} />
          <StatCard title="Discount Given" value={`₹${stats.totalDiscountGiven?.toLocaleString() ?? 0}`} />
        </div>
      )}

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading}
        rowKey={(v) => v.id} meta={data?.meta} onPageChange={setPage} />

      {/* Create Voucher Panel */}
      <DetailPanel open={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Voucher"
        actions={<div className="flex gap-2"><button onClick={() => setShowCreate(false)} className="btn-secondary px-4 py-2 rounded">Cancel</button><button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary px-4 py-2 rounded">{createMutation.isPending ? 'Creating…' : 'Create'}</button></div>}>
        <div className="space-y-4 p-4">
          <FormField label="Code" required>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" className="input w-full" />
          </FormField>
          <FormField label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Discount Type" required>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed_amount' })} className="input w-full">
                {DISCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Discount Value" required>
              <input type="number" value={form.discountValue || ''} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} className="input w-full" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Max Uses">
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" className="input w-full" />
            </FormField>
            <FormField label="Max Uses Per Provider">
              <input type="number" value={form.maxUsesPerProvider} onChange={(e) => setForm({ ...form, maxUsesPerProvider: e.target.value })} placeholder="Unlimited" className="input w-full" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min Purchase (₹)">
              <input type="number" value={form.minPurchaseAmount} onChange={(e) => setForm({ ...form, minPurchaseAmount: e.target.value })} className="input w-full" />
            </FormField>
            <FormField label="Max Discount (₹)">
              <input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} className="input w-full" />
            </FormField>
          </div>
          <FormField label="Applicable To">
            <div className="flex flex-wrap gap-2">
              {APPLICABLE_TO.map((t) => (
                <label key={t} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.applicableTo.includes(t)}
                    onChange={(e) => setForm({ ...form, applicableTo: e.target.checked ? [...form.applicableTo, t] : form.applicableTo.filter((x) => x !== t) })} />
                  {t}
                </label>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valid From">
              <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="input w-full" />
            </FormField>
            <FormField label="Valid Until">
              <input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="input w-full" />
            </FormField>
          </div>
        </div>
      </DetailPanel>

      {/* Redemptions Panel */}
      <DetailPanel open={!!viewRedemptions} onClose={() => setViewRedemptions(null)} title="Voucher Redemptions">
        <div className="p-4 space-y-3">
          {redemptions?.length ? redemptions.map((r: VoucherRedemption) => (
            <div key={r.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
              <div>
                <div className="font-medium text-sm">{r.provider?.brandName ?? r.providerId}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(r.redeemedAt).toLocaleString()}</div>
              </div>
              <div className="font-semibold text-sm">-₹{r.discountAmount}</div>
            </div>
          )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No redemptions yet</p>}
        </div>
      </DetailPanel>
    </div>
  );
}
