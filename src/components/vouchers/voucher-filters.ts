import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { FUTURE_PRESETS } from '../ui/filters';
import type { VoucherFilterOptions } from '../../services/vouchers.service';

/**
 * Every key the Vouchers page mirrors into the URL. The creation range keeps
 * the backend's existing `dateFrom` / `dateTo` names (daterange key `date`).
 */
export const VOUCHER_FILTER_KEYS = [
  'opStatus', 'discountType', 'applicableTo',
  'usage', 'expiringWithinDays',
  'validFrom', 'validTo', 'dateFrom', 'dateTo',
  'createdBy',
] as const;

/** Payment types a voucher can be restricted to; shared by the filter, the table and the create form. */
export const VOUCHER_APPLICABLE_TO = [
  { value: 'sponsorship', label: 'Sponsorship', emoji: '🚀' },
  { value: 'lead_unlock', label: 'Lead Unlock', emoji: '🔓' },
  { value: 'subscription', label: 'Subscription', emoji: '⭐' },
  { value: 'badge', label: 'Badge', emoji: '🏅' },
  { value: 'deal_unlock', label: 'Deal Unlock', emoji: '🎫' },
  { value: 'deal_creation', label: 'Deal Creation', emoji: '🏷️' },
];

/** Operational status vocabulary, shared by the status badge and the `opStatus` filter. */
export const VOUCHER_OP_STATUS = {
  live: { label: 'Live', color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  scheduled: { label: 'Scheduled', color: 'var(--color-info)', bg: 'var(--color-info-light)' },
  expired: { label: 'Expired', color: 'var(--color-danger)', bg: 'var(--color-danger-light)' },
  exhausted: { label: 'Exhausted', color: 'var(--color-danger)', bg: 'var(--color-danger-light)' },
  inactive: { label: 'Inactive', color: 'var(--text-muted)', bg: 'var(--surface-2)' },
} as const;

export type VoucherOpStatus = keyof typeof VOUCHER_OP_STATUS;

export const VOUCHER_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'opStatus', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses',
    options: (Object.keys(VOUCHER_OP_STATUS) as VoucherOpStatus[]).map((k) => ({ value: k, label: VOUCHER_OP_STATUS[k].label })) },
  { key: 'discountType', label: 'Discount type', kind: 'select', inline: true, placeholder: 'All discount types', options: [
    { value: 'percentage', label: 'Percentage' }, { value: 'fixed_amount', label: 'Fixed amount' },
  ] },
  { key: 'applicableTo', label: 'Applies to', kind: 'select', inline: true, placeholder: 'Any service',
    options: VOUCHER_APPLICABLE_TO.map((a) => ({ value: a.value, label: a.label })) },
  // Panel — Usage
  { key: 'usage', label: 'Usage', kind: 'select', group: 'Usage', options: [
    { value: 'never', label: 'Never redeemed' }, { value: 'used', label: 'Redeemed at least once' }, { value: 'exhausted', label: 'Limit reached' },
  ] },
  { key: 'expiringWithinDays', label: 'Expiring within', kind: 'select', group: 'Usage', hint: 'Still valid, but ending soon', options: [
    { value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' },
  ] },
  // Panel — Timing
  { key: 'valid', label: 'Valid until', kind: 'daterange', group: 'Timing', presets: FUTURE_PRESETS },
  { key: 'date', label: 'Created', kind: 'daterange', group: 'Timing' },
  // Panel — Admin
  { key: 'createdBy', label: 'Created by', kind: 'select', group: 'Admin', options: [] },
];

export const VOUCHER_SORTS: SortOption[] = [
  { value: 'expiring_soon', label: 'Expiring soonest' },
  { value: 'most_used', label: 'Most redeemed' },
];

/** The creator select is the only def whose options come from the server. */
export function withVoucherOptions(defs: FilterDef[], options?: VoucherFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => (d.key === 'createdBy' ? { ...d, options: options.creators.map((c) => ({ value: c.id, label: c.name, count: c.count })) } : d));
}

/** Each patch equals the predicate behind its `filter-options` count, so the pill and the number agree. */
export function voucherSegments(options?: VoucherFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'Live', patch: { opStatus: 'live' }, count: c?.live },
    { label: 'Expiring in 7 days', patch: { opStatus: 'live', expiringWithinDays: '7' }, count: c?.expiring7d },
    { label: 'Never used', patch: { usage: 'never' }, count: c?.neverUsed },
    { label: 'Exhausted', patch: { usage: 'exhausted' }, count: c?.exhausted },
    { label: 'Expired', patch: { opStatus: 'expired' }, count: c?.expired },
  ];
}
