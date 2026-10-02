import { useMemo, useState } from 'react';
import { Gift, Loader2, Percent, IndianRupee, Info, AlertTriangle } from 'lucide-react';
import { DetailPanel } from '../ui/DetailPanel';
import { FormField } from '../ui/FormField';
import { ProviderPicker, type PickedProvider } from '../ui/ProviderPicker';
import { Select, istDay } from '../ui/filters';
import { useOffers, useCreateOffer } from '../../hooks/useOffers';
import type { CreateOfferPayload, DiscountType, ProviderOffer } from '../../types';
import { toast } from 'react-toastify';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border';
const inputStyle = {
  background: 'var(--surface-0)',
  borderColor: 'var(--border-default)',
  color: 'var(--text-primary)',
} as const;
const invalidStyle = { ...inputStyle, borderColor: 'var(--color-danger)' } as const;

/** Length presets, counted from the start date. */
const DURATIONS = [7, 14, 30, 90];

const TYPE_CARDS: { value: DiscountType; label: string; hint: string; icon: typeof Percent }[] = [
  { value: 'percentage', label: 'Percentage off', hint: 'e.g. 20% off the bill', icon: Percent },
  { value: 'flat', label: 'Flat amount off', hint: 'e.g. ₹100 off', icon: IndianRupee },
];

const APPROVAL_OPTIONS = [
  { value: 'approved', label: 'Approved — visible to customers' },
  { value: 'pending_approval', label: 'Pending approval — hidden until approved' },
];

interface FormState {
  provider: PickedProvider | null;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  isActive: boolean;
  approvalStatus: 'approved' | 'pending_approval';
  adminNotes: string;
  notifyProvider: boolean;
}

const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA').format(d);
};

const emptyForm = (): FormState => ({
  provider: null,
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscount: '',
  startsAt: istDay(),
  // Matches the "30 days" preset exactly, so that chip reads as selected.
  endsAt: addDays(istDay(), 29),
  usageLimit: '',
  isActive: true,
  approvalStatus: 'approved',
  adminNotes: '',
  notifyProvider: true,
});

/** Deals a customer can claim right now. Outside the component: reads the clock. */
function countLive(offers: ProviderOffer[]): number {
  const now = Date.now();
  return offers.filter(
    (o) => o.isActive && o.approvalStatus === 'approved' && new Date(o.startsAt).getTime() <= now && new Date(o.endsAt).getTime() > now,
  ).length;
}

/** What the live/total counts mean for the business the admin just picked. */
function ProviderDealContext({ providerId }: { providerId: string }) {
  const { data, isLoading } = useOffers({ providerId, limit: 50, page: 1 });
  if (isLoading) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Checking existing deals…</p>;
  }
  const offers: ProviderOffer[] = data?.items ?? [];
  const live = countLive(offers);
  const total = data?.meta?.total ?? offers.length;
  if (total === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This business has no deals yet.</p>;
  }
  return (
    <p className="text-xs" style={{ color: live >= 3 ? 'var(--color-warning-dark)' : 'var(--text-muted)' }}>
      Already has {total} deal{total === 1 ? '' : 's'} · {live} running now
      {live >= 3 && ' — more than a business can normally run at once'}
    </p>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select a business, e.g. when opened from that provider's page. */
  presetProvider?: PickedProvider | null;
}

/**
 * Places a deal on any business's listing. The owner's plan quota and free-deal
 * allowance do not apply here, so the panel shows what they already run instead
 * of blocking — the admin decides.
 */
export function CreateDealPanel({ open, onClose, presetProvider = null }: Props) {
  const [form, setForm] = useState<FormState>(() => ({ ...emptyForm(), provider: presetProvider }));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const createMutation = useCreateOffer();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const value = Number(form.discountValue);
  const minOrder = form.minOrderAmount === '' ? null : Number(form.minOrderAmount);
  const isPercentage = form.discountType === 'percentage';

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.provider) e.provider = 'Pick the business this deal belongs to';
    if (!form.title.trim()) e.title = 'Give the deal a title customers will see';
    else if (form.title.trim().length > 150) e.title = 'Keep the title under 150 characters';
    if (form.description.length > 500) e.description = 'Keep the description under 500 characters';
    if (form.discountValue === '' || !Number.isFinite(value) || value <= 0) e.discountValue = 'Enter a discount above 0';
    else if (isPercentage && value > 100) e.discountValue = 'A percentage cannot be above 100';
    else if (!isPercentage && minOrder != null && value > minOrder) e.discountValue = 'A flat discount cannot exceed the minimum order';
    if (!form.startsAt) e.startsAt = 'Pick a start date';
    if (!form.endsAt) e.endsAt = 'Pick an end date';
    else if (form.startsAt && form.endsAt <= form.startsAt) e.endsAt = 'The end date must be after the start date';
    if (form.usageLimit !== '' && (!Number.isInteger(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) {
      e.usageLimit = 'Use a whole number of redemptions, or leave it empty';
    }
    return e;
  }, [form, value, minOrder, isPercentage]);

  const isValid = Object.keys(errors).length === 0;
  const errorFor = (key: keyof FormState) => (submitted ? errors[key] : undefined);

  const close = () => {
    setForm({ ...emptyForm(), provider: presetProvider });
    setShowAdvanced(false);
    setSubmitted(false);
    onClose();
  };

  const submit = async () => {
    setSubmitted(true);
    if (!isValid || !form.provider) return;
    const payload: CreateOfferPayload = {
      providerId: form.provider.id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: value,
      minOrderAmount: minOrder ?? undefined,
      // The cap only applies to a percentage; the backend drops it for flat anyway.
      maxDiscount: isPercentage && form.maxDiscount !== '' ? Number(form.maxDiscount) : undefined,
      // An end date means "through that day", so the deal runs to its last minute.
      startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${form.endsAt}T23:59:59`).toISOString(),
      usageLimit: form.usageLimit !== '' ? Number(form.usageLimit) : undefined,
      isActive: form.isActive,
      approvalStatus: form.approvalStatus,
      adminNotes: form.adminNotes.trim() || undefined,
      notifyProvider: form.notifyProvider,
    };
    try {
      const created = await createMutation.mutateAsync(payload);
      toast.success(`“${created.title}” added to ${form.provider.name}`);
      close();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'Could not create the deal');
    }
  };

  const previewDiscount = Number.isFinite(value) && value > 0
    ? isPercentage ? `${value}% OFF` : `₹${value.toLocaleString('en-IN')} OFF`
    : '— OFF';

  const days = form.startsAt && form.endsAt
    ? Math.round((new Date(`${form.endsAt}T00:00:00`).getTime() - new Date(`${form.startsAt}T00:00:00`).getTime()) / 86_400_000) + 1
    : 0;

  return (
    <DetailPanel
      open={open}
      onClose={close}
      title="Create Deal"
      subtitle="Add a discount to any business's listing — no checkout needed"
      width="620px"
      actions={
        <>
          <button onClick={close} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={createMutation.isPending || (submitted && !isValid)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            {createMutation.isPending ? 'Creating…' : 'Create Deal'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Business */}
        <FormField label="Business" required error={errorFor('provider')}>
          <ProviderPicker
            value={form.provider}
            onChange={(p) => set('provider', p)}
            invalid={!!errorFor('provider')}
            autoFocus={!presetProvider}
            locked={!!presetProvider}
          />
          {form.provider && <div className="mt-1.5"><ProviderDealContext providerId={form.provider.id} /></div>}
        </FormField>

        {/* What the deal is */}
        <FormField label="Title" required error={errorFor('title')} description={`${form.title.length}/150 — customers see this on the deal card`}>
          <input
            type="text"
            value={form.title}
            maxLength={150}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. 20% off all services this Diwali"
            className={inputCls}
            style={errorFor('title') ? invalidStyle : inputStyle}
          />
        </FormField>

        <FormField label="Description" error={errorFor('description')} description={`${form.description.length}/500 — terms, exclusions, how to claim`}>
          <textarea
            value={form.description}
            maxLength={500}
            rows={2}
            onChange={(e) => set('description', e.target.value)}
            placeholder="e.g. Valid on orders above ₹500. Not valid with other offers."
            className={`${inputCls} resize-none`}
            style={inputStyle}
          />
        </FormField>

        {/* Discount */}
        <FormField label="Discount type">
          <div className="grid grid-cols-2 gap-2">
            {TYPE_CARDS.map((opt) => {
              const on = form.discountType === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('discountType', opt.value)}
                  className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all"
                  style={{
                    background: on ? 'var(--color-primary-light)' : 'var(--surface-0)',
                    borderColor: on ? 'var(--color-primary)' : 'var(--border-default)',
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={isPercentage ? 'Percentage off' : 'Amount off'} required error={errorFor('discountValue')}>
            <div className="relative">
              {!isPercentage && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>₹</span>
              )}
              <input
                type="number"
                min={0}
                max={isPercentage ? 100 : undefined}
                step="0.01"
                value={form.discountValue}
                onChange={(e) => set('discountValue', e.target.value)}
                placeholder={isPercentage ? '20' : '100'}
                className={`${inputCls} ${isPercentage ? 'pr-8' : 'pl-7'}`}
                style={errorFor('discountValue') ? invalidStyle : inputStyle}
              />
              {isPercentage && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>%</span>
              )}
            </div>
          </FormField>

          <FormField label="Minimum order" description="Leave empty for no minimum">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>₹</span>
              <input
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => set('minOrderAmount', e.target.value)}
                placeholder="500"
                className={`${inputCls} pl-7`}
                style={inputStyle}
              />
            </div>
          </FormField>
        </div>

        {isPercentage && (
          <FormField label="Maximum discount" description="Caps how much a percentage can take off one order">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>₹</span>
              <input
                type="number"
                min={0}
                value={form.maxDiscount}
                onChange={(e) => set('maxDiscount', e.target.value)}
                placeholder="200"
                className={`${inputCls} pl-7`}
                style={inputStyle}
              />
            </div>
          </FormField>
        )}

        {/* When it runs */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Starts" required error={errorFor('startsAt')}>
            <input
              type="date"
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
              className={inputCls}
              style={errorFor('startsAt') ? invalidStyle : inputStyle}
            />
          </FormField>
          <FormField label="Ends" required error={errorFor('endsAt')}>
            <input
              type="date"
              value={form.endsAt}
              min={form.startsAt || undefined}
              onChange={(e) => set('endsAt', e.target.value)}
              className={inputCls}
              style={errorFor('endsAt') ? invalidStyle : inputStyle}
            />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {DURATIONS.map((d) => {
            const on = days === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => set('endsAt', addDays(form.startsAt || istDay(), d - 1))}
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                style={{
                  background: on ? 'var(--color-primary)' : 'var(--surface-2)',
                  color: on ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {d} days
              </button>
            );
          })}
          {days > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Runs for {days} day{days === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <FormField label="Redemption limit" error={errorFor('usageLimit')} description="Total times customers can claim it. Leave empty for unlimited.">
          <input
            type="number"
            min={1}
            step={1}
            value={form.usageLimit}
            onChange={(e) => set('usageLimit', e.target.value)}
            placeholder="Unlimited"
            className={inputCls}
            style={errorFor('usageLimit') ? invalidStyle : inputStyle}
          />
        </FormField>

        {/* Preview */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Customer preview</p>
          <div className="rounded-xl border p-3 flex items-start gap-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
              {isPercentage ? <Percent className="w-5 h-5" /> : <IndianRupee className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}>
                  {previewDiscount}
                </span>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {form.title.trim() || 'Your deal title'}
                </p>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {form.description.trim() || 'Terms and conditions appear here.'}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {form.provider?.name ?? 'Business name'}
                {minOrder ? ` · Min order ₹${minOrder.toLocaleString('en-IN')}` : ''}
                {isPercentage && form.maxDiscount ? ` · Up to ₹${Number(form.maxDiscount).toLocaleString('en-IN')} off` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Publishing options
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{showAdvanced ? 'Hide' : 'Show'}</span>
          </button>
          {showAdvanced && (
            <div className="px-3 pb-3 space-y-4">
              <FormField label="Approval">
                <Select
                  value={form.approvalStatus}
                  onChange={(v) => set('approvalStatus', v as FormState['approvalStatus'])}
                  options={APPROVAL_OPTIONS}
                  className="w-full"
                />
              </FormField>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="mt-0.5 rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Active
                  <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Turn off to save it without showing it to anyone yet</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notifyProvider} onChange={(e) => set('notifyProvider', e.target.checked)} className="mt-0.5 rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Tell the owner
                  <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Sends a notification that a deal was added to their listing</span>
                </span>
              </label>
              <FormField label="Internal note" description="Only admins see this">
                <textarea
                  value={form.adminNotes}
                  maxLength={500}
                  rows={2}
                  onChange={(e) => set('adminNotes', e.target.value)}
                  placeholder="e.g. Agreed with the owner over the phone on 2 Oct"
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                />
              </FormField>
            </div>
          )}
        </div>

        {(!form.isActive || form.approvalStatus !== 'approved') && (
          <div className="flex items-start gap-2 p-3 rounded-xl border text-xs" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', color: 'var(--color-warning-dark)' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {form.approvalStatus !== 'approved'
                ? 'This deal will sit in the approval queue and stay hidden until someone approves it.'
                : 'This deal will be saved but switched off, so customers will not see it.'}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Deals you add here do not use the business&apos;s plan quota or their free-deal allowance.</span>
        </div>
      </div>
    </DetailPanel>
  );
}

export default CreateDealPanel;
