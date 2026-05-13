import { useState } from 'react';
import { Plus, Eye, Copy, ToggleLeft, ToggleRight, Tag, Percent, Hash, Calendar, Shield, Sparkles } from 'lucide-react';
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
          <button
            onClick={() => { navigator.clipboard.writeText(v.code); toast.info('Copied!'); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Copy code"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => setViewRedemptions(v.id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="View redemptions"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleToggle(v)}
            className="p-1.5 rounded-lg transition-colors"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Toggle active"
          >
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
        actions={<div className="flex gap-2"><button onClick={() => setShowCreate(false)} className="btn-secondary px-4 py-2 rounded-lg">Cancel</button><button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary px-4 py-2 rounded-lg font-medium">{createMutation.isPending ? 'Creating…' : 'Create Voucher'}</button></div>}>
        <div className="p-5 space-y-6">

          {/* Section: Code & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Tag size={14} className="text-indigo-500" />
              Code & Description
            </div>
            <FormField label="Voucher Code" required>
              <div className="flex gap-2">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" className="input flex-1 font-mono uppercase tracking-wider" />
                <button type="button" onClick={() => { const c = `${['SAVE', 'DEAL', 'NEW', 'VIP'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 90 + 10)}`; setForm({ ...form, code: c }); }} className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }} title="Auto-generate code">
                  <Sparkles size={14} />
                </button>
              </div>
            </FormField>
            <FormField label="Description">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Welcome discount for new providers" className="input w-full" />
            </FormField>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Section: Discount */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Percent size={14} className="text-emerald-500" />
              Discount
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type" required>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-default)' }}>
                  {DISCOUNT_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, discountType: t.value as 'percentage' | 'fixed_amount' })}
                      className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${form.discountType === t.value ? 'bg-indigo-500 text-white' : 'hover:bg-gray-50'}`}
                      style={form.discountType !== t.value ? { color: 'var(--text-muted)' } : undefined}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Value" required>
                <div className="relative">
                  <input type="number" value={form.discountValue || ''} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} className="input w-full pr-8" placeholder="0" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {form.discountType === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min Purchase Amount">
                <div className="relative">
                  <input type="number" value={form.minPurchaseAmount} onChange={(e) => setForm({ ...form, minPurchaseAmount: e.target.value })} className="input w-full pl-6" placeholder="No minimum" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>₹</span>
                </div>
              </FormField>
              <FormField label="Max Discount Cap">
                <div className="relative">
                  <input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} className="input w-full pl-6" placeholder="No cap" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>₹</span>
                </div>
              </FormField>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Section: Usage Limits */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Hash size={14} className="text-amber-500" />
              Usage Limits
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Total Uses">
                <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" className="input w-full" />
              </FormField>
              <FormField label="Per Provider">
                <input type="number" value={form.maxUsesPerProvider} onChange={(e) => setForm({ ...form, maxUsesPerProvider: e.target.value })} placeholder="Unlimited" className="input w-full" />
              </FormField>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Section: Applicable To */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Shield size={14} className="text-violet-500" />
              Applicable To
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select which services this voucher applies to. Leave empty for all.</p>
            <div className="flex flex-wrap gap-2">
              {APPLICABLE_TO.map((t) => {
                const selected = form.applicableTo.includes(t);
                return (
                  <button key={t} type="button"
                    onClick={() => setForm({ ...form, applicableTo: selected ? form.applicableTo.filter((x) => x !== t) : [...form.applicableTo, t] })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}
                    style={!selected ? { borderColor: 'var(--border-default)', color: 'var(--text-muted)' } : undefined}>
                    {t.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Section: Validity Period */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Calendar size={14} className="text-teal-500" />
              Validity Period
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start">
                <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="input w-full" />
              </FormField>
              <FormField label="End">
                <input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="input w-full" />
              </FormField>
            </div>
          </div>

          {/* Preview */}
          {form.code && form.discountValue > 0 && (
            <>
              <hr style={{ borderColor: 'var(--border-default)' }} />
              <div className="rounded-xl p-4 border-2 border-dashed" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Preview</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{form.code}</span>
                    {form.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{form.description}</p>}
                  </div>
                  <span className="text-xl font-bold text-indigo-600">
                    {form.discountType === 'percentage' ? `${form.discountValue}%` : `₹${form.discountValue}`}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </DetailPanel>

      {/* Redemptions Panel */}
      <DetailPanel open={!!viewRedemptions} onClose={() => setViewRedemptions(null)} title="Voucher Redemptions">
        <div className="p-4 space-y-3">
          {redemptions?.length ? redemptions.map((r: VoucherRedemption) => (
            <div key={r.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--surface-0)' }}>
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
