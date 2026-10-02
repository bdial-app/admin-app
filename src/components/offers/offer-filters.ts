import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { FUTURE_PRESETS, istDay } from '../ui/filters';
import type { Category, OfferFilterOptions } from '../../types';

/** Every key the Offers page mirrors into the URL (ranges expand to From/To, Min/Max). */
export const OFFER_FILTER_KEYS = [
  'opStatus', 'approvalStatus', 'discountType',
  'discountMin', 'discountMax', 'usage',
  'endsFrom', 'endsTo', 'createdFrom', 'createdTo',
  'city', 'categoryId',
] as const;

/** Operational status vocabulary, shared by the status badge and the `opStatus` filter. */
export const OFFER_OP_STATUS = {
  live: { label: 'Live', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)' },
  scheduled: { label: 'Scheduled', color: 'var(--color-info-dark)', bg: 'var(--color-info-light)' },
  expired: { label: 'Expired', color: 'var(--text-muted)', bg: 'var(--surface-2)' },
  exhausted: { label: 'Exhausted', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' },
  inactive: { label: 'Inactive', color: 'var(--text-muted)', bg: 'var(--surface-2)' },
} as const;

export type OfferOpStatus = keyof typeof OFFER_OP_STATUS;

export const OFFER_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'opStatus', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses',
    options: (Object.keys(OFFER_OP_STATUS) as OfferOpStatus[]).map((k) => ({ value: k, label: OFFER_OP_STATUS[k].label })) },
  { key: 'approvalStatus', label: 'Approval', kind: 'select', inline: true, placeholder: 'Any approval', options: [
    { value: 'pending_approval', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  ] },
  { key: 'discountType', label: 'Discount type', kind: 'select', inline: true, placeholder: 'All discount types', options: [
    { value: 'percentage', label: 'Percentage' }, { value: 'flat', label: 'Flat amount' },
  ] },
  // Panel — Value
  { key: 'discount', label: 'Discount value', kind: 'numberrange', group: 'Value', hint: '% or ₹, depending on the discount type' },
  { key: 'usage', label: 'Usage', kind: 'select', group: 'Value', options: [
    { value: 'never', label: 'Never redeemed' }, { value: 'used', label: 'Redeemed at least once' }, { value: 'exhausted', label: 'Limit reached' },
  ] },
  // Panel — Timing
  { key: 'ends', label: 'Ends', kind: 'daterange', group: 'Timing', presets: FUTURE_PRESETS },
  { key: 'created', label: 'Created', kind: 'daterange', group: 'Timing' },
  // Panel — Business
  { key: 'city', label: 'City', kind: 'select', group: 'Business', options: [] },
  { key: 'categoryId', label: 'Category', kind: 'select', group: 'Business', hint: "The provider's category", options: [] },
];

export const OFFER_SORTS: SortOption[] = [
  { value: 'ending_soon', label: 'Ending soonest' },
  { value: 'most_used', label: 'Most redeemed' },
  { value: 'discount_desc', label: 'Biggest discount' },
];

/** Cities come from filter-options; categories from the shared category tree. */
export function withOfferOptions(defs: FilterDef[], options?: OfferFilterOptions, categories?: Category[]): FilterDef[] {
  return defs.map((d) => {
    if (d.key === 'city' && options) return { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) };
    if (d.key === 'categoryId' && categories?.length) return { ...d, options: categories.map((c) => ({ value: c.id, label: c.name })) };
    return d;
  });
}

export function offerSegments(options?: OfferFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'Live now', patch: { opStatus: 'live' }, count: c?.live },
    { label: 'Pending approval', patch: { approvalStatus: 'pending_approval' }, count: c?.pending },
    { label: 'Expiring in 7 days', patch: { opStatus: 'live', endsTo: istDay(-7) }, count: c?.ending7d },
    { label: 'Expired', patch: { opStatus: 'expired' }, count: c?.expired },
    { label: 'Never used', patch: { usage: 'never' }, count: c?.neverUsed },
  ];
}
