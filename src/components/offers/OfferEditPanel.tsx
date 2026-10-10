import { useState } from 'react';
import { toast } from 'react-toastify';
import { DetailPanel } from '../ui/DetailPanel';
import { FormField } from '../ui/FormField';
import { Select } from '../ui/filters';
import { useUpdateOffer } from '../../hooks/useOffers';
import type { DiscountType, ProviderOffer } from '../../types';

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'flat', label: 'Flat' },
];

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border';
const inputStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' } as const;

/**
 * Edit a deal: title, description, discount, limits and whether it's live.
 * Used on the Offers page and on a business's page in admin.
 *
 * Mount with `key={offer.id}` so each deal opens with fresh state.
 */
export function OfferEditPanel({
  offer,
  onClose,
  onSaved,
}: {
  offer: ProviderOffer;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const updateMutation = useUpdateOffer();
  const [form, setForm] = useState<Partial<ProviderOffer>>(() => ({
    isActive: offer.isActive,
    title: offer.title,
    description: offer.description,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    minOrderAmount: offer.minOrderAmount,
    maxDiscount: offer.maxDiscount,
    usageLimit: offer.usageLimit,
  }));

  const save = async () => {
    try {
      await updateMutation.mutateAsync({ id: offer.id, body: form });
      toast.success('Offer updated');
      onSaved?.();
      onClose();
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <DetailPanel
      open
      onClose={onClose}
      title="Edit Offer"
      subtitle={offer.provider?.brandName ? `${offer.title} · ${offer.provider.brandName}` : offer.title}
      actions={
        <button onClick={() => void save()} disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="space-y-4">
        <FormField label="Title">
          <input type="text" value={form.title ?? ''} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className={inputCls} style={inputStyle} />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description ?? ''} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Discount Type">
            <Select
              value={form.discountType ?? 'percentage'}
              onChange={(v) => setForm(prev => ({ ...prev, discountType: v as DiscountType }))}
              options={DISCOUNT_TYPE_OPTIONS}
              className="w-full"
            />
          </FormField>
          <FormField label="Discount Value">
            <input type="number" value={form.discountValue ?? ''} onChange={(e) => setForm(prev => ({ ...prev, discountValue: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Min Order Amount">
            <input type="number" value={form.minOrderAmount ?? ''} onChange={(e) => setForm(prev => ({ ...prev, minOrderAmount: e.target.value ? Number(e.target.value) : null }))} className={inputCls} style={inputStyle} />
          </FormField>
          <FormField label="Max Discount">
            <input type="number" value={form.maxDiscount ?? ''} onChange={(e) => setForm(prev => ({ ...prev, maxDiscount: e.target.value ? Number(e.target.value) : null }))} className={inputCls} style={inputStyle} />
          </FormField>
        </div>
        <FormField label="Usage Limit">
          <input type="number" value={form.usageLimit ?? ''} onChange={(e) => setForm(prev => ({ ...prev, usageLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="Leave empty for unlimited" className={inputCls} style={inputStyle} />
        </FormField>
        <FormField label="Active">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Offer is active</span>
          </label>
        </FormField>
      </div>
    </DetailPanel>
  );
}
