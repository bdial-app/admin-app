import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { DATE_PRESETS, istDay, presetRange } from '../ui/filters';
import type { PaymentFilterOptions } from '../../services/payments.service';

/** Every key the Payments page mirrors into the URL (ranges expand to From/To, Min/Max). */
export const PAYMENT_FILTER_KEYS = [
  'status', 'type', 'dateFrom', 'dateTo',
  'gateway', 'amountMin', 'amountMax', 'hasVoucher', 'city', 'providerId',
] as const;

export const PAYMENT_TYPE_OPTIONS = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'lead_unlock', label: 'Lead unlock' },
  { value: 'badge', label: 'Badge' },
  { value: 'deal_unlock', label: 'Deal unlock' },
  { value: 'deal_creation', label: 'Deal creation' },
];

export const GATEWAY_OPTIONS = [
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'apple', label: 'Apple IAP' },
  { value: 'manual', label: 'Manual' },
  { value: 'voucher', label: 'Voucher (100% off)' },
];

export const PAYMENT_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'succeeded', label: 'Succeeded' }, { value: 'pending', label: 'Pending' }, { value: 'processing', label: 'Processing' },
    { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' },
  ] },
  { key: 'type', label: 'Type', kind: 'select', inline: true, placeholder: 'All types', options: PAYMENT_TYPE_OPTIONS },
  { key: 'date', label: 'Date', kind: 'daterange', inline: true, placeholder: 'Any date' },
  // Panel
  { key: 'gateway', label: 'Gateway', kind: 'select', group: 'Payment', options: GATEWAY_OPTIONS },
  { key: 'amount', label: 'Amount', kind: 'numberrange', group: 'Payment', unit: '₹' },
  { key: 'hasVoucher', label: 'Voucher', kind: 'select', group: 'Payment', hint: 'Voucher applied or a discount recorded', options: [
    { value: 'true', label: 'With voucher' }, { value: 'false', label: 'Without voucher' },
  ] },
  { key: 'city', label: 'City', kind: 'select', group: 'Business', options: [] },
];

/** `newest` is the API default, so it is the placeholder rather than an option. */
export const PAYMENT_SORTS: SortOption[] = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Amount: high to low' },
  { value: 'amount_asc', label: 'Amount: low to high' },
];

/** City and gateway options (with counts) come from the server. */
export function withOptions(defs: FilterDef[], options?: PaymentFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => {
    if (d.key === 'city') return { ...d, options: (options.cities ?? []).map((c) => ({ value: c.name, label: c.name, count: c.count })) };
    if (d.key === 'gateway' && options.gateways?.length) {
      return { ...d, options: options.gateways.map((g) => ({ value: g.value, label: GATEWAY_OPTIONS.find((o) => o.value === g.value)?.label ?? g.value, count: g.count })) };
    }
    return d;
  });
}

const thisMonth = () => presetRange(DATE_PRESETS.find((p) => p.value === 'this_month')!);

export function paymentSegments(options?: PaymentFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All', patch: {}, count: c?.total },
    { label: 'Succeeded', patch: { status: 'succeeded' }, count: c?.succeeded },
    { label: 'Failed', patch: { status: 'failed' }, count: c?.failed },
    { label: 'Refunded', patch: { status: 'refunded' }, count: c?.refunded },
    { label: 'Today', patch: { dateFrom: istDay() }, count: c?.today },
    { label: 'This month', patch: { dateFrom: thisMonth().from }, count: c?.thisMonth },
    { label: 'With voucher', patch: { hasVoucher: 'true' }, count: c?.withVoucher },
  ];
}
