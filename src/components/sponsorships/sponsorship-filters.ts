import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { FUTURE_PRESETS, istDay } from '../ui/filters';
import type { SponsorshipFilterOptions } from '../../types';

/** Every key the Sponsorships page mirrors into the URL (ranges expand to From/To, Min/Max). */
export const SPONSORSHIP_FILTER_KEYS = [
  'opStatus', 'type', 'approvalStatus',
  'billingMode', 'budgetMin', 'budgetMax', 'spentPctMin',
  'createdFrom', 'createdTo', 'endsFrom', 'endsTo',
  'city', 'minImpressions', 'source',
] as const;

/**
 * Operational status vocabulary. The table badge, the detail panel and the
 * `opStatus` filter all read from this one map so a "Live" chip and a "Live"
 * badge always mean the same thing and wear the same colours.
 */
export const SPONSORSHIP_OP_STATUS = {
  live: { label: 'Live', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)' },
  scheduled: { label: 'Scheduled', color: 'var(--color-info)', bg: 'var(--surface-2)' },
  pending: { label: 'Pending', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' },
  stopped: { label: 'Stopped', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' },
  exhausted: { label: 'Budget Exhausted', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' },
  expired: { label: 'Expired', color: 'var(--text-muted)', bg: 'var(--surface-2)' },
  rejected: { label: 'Rejected', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' },
} as const;

export type SponsorshipOpStatus = keyof typeof SPONSORSHIP_OP_STATUS;

const OP_STATUS_ORDER: SponsorshipOpStatus[] = ['live', 'scheduled', 'pending', 'stopped', 'exhausted', 'expired', 'rejected'];

const paidOnly = (v: Record<string, string | undefined>) => (v.billingMode === 'free' ? 'Not available for complimentary placements' : false);

export const SPONSORSHIP_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'opStatus', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses',
    options: OP_STATUS_ORDER.map((k) => ({ value: k, label: SPONSORSHIP_OP_STATUS[k].label })) },
  { key: 'type', label: 'Placement', kind: 'select', inline: true, placeholder: 'All placements', options: [
    { value: 'carousel', label: 'Carousel' }, { value: 'inline', label: 'Inline' }, { value: 'top_result', label: 'Top result' },
  ] },
  { key: 'approvalStatus', label: 'Approval', kind: 'select', inline: true, placeholder: 'Any approval', options: [
    { value: 'pending_approval', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  ] },
  // Panel — Money
  { key: 'billingMode', label: 'Billing', kind: 'select', group: 'Money', options: [
    { value: 'paid', label: 'Paid (budget-based)' }, { value: 'free', label: 'Free (complimentary)' },
  ] },
  { key: 'budget', label: 'Budget', kind: 'numberrange', group: 'Money', unit: '₹', disabledWhen: paidOnly },
  { key: 'spentPctMin', label: 'Budget used', kind: 'select', group: 'Money', hint: 'Share of the budget already spent', disabledWhen: paidOnly, options: [
    { value: '50', label: 'At least 50%' }, { value: '80', label: 'At least 80%' }, { value: '100', label: 'Fully spent' },
  ] },
  // Panel — Timing
  { key: 'created', label: 'Created', kind: 'daterange', group: 'Timing' },
  { key: 'ends', label: 'Ends', kind: 'daterange', group: 'Timing', presets: FUTURE_PRESETS, hint: 'When the placement window closes' },
  // Panel — Targeting
  { key: 'city', label: 'City', kind: 'select', group: 'Targeting', hint: 'Provider city or a targeted city', options: [] },
  { key: 'minImpressions', label: 'Impressions', kind: 'select', group: 'Targeting', options: [
    { value: '100', label: 'At least 100' }, { value: '1000', label: 'At least 1,000' }, { value: '10000', label: 'At least 10,000' },
  ] },
  // Panel — Source
  { key: 'source', label: 'Source', kind: 'select', group: 'Source', options: [
    { value: 'admin_granted', label: 'Admin granted' }, { value: 'provider_paid', label: 'Provider paid' },
  ] },
];

export const SPONSORSHIP_SORTS: SortOption[] = [
  { value: 'ending_soon', label: 'Ending soonest' },
  { value: 'spend_desc', label: 'Highest spend' },
  { value: 'impressions_desc', label: 'Most impressions' },
  { value: 'clicks_desc', label: 'Most clicks' },
  { value: 'ctr_desc', label: 'Highest CTR' },
];

/** The city select is the only def whose options come from the server. */
export function withSponsorshipOptions(defs: FilterDef[], options?: SponsorshipFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => (d.key === 'city' ? { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) } : d));
}

export function sponsorshipSegments(options?: SponsorshipFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'Live', patch: { opStatus: 'live' }, count: c?.live },
    { label: 'Pending approval', patch: { approvalStatus: 'pending_approval' }, count: c?.pending },
    { label: 'Ending in 7 days', patch: { opStatus: 'live', endsTo: istDay(-7) }, count: c?.ending7d },
    { label: 'Budget ≥ 80% used', patch: { spentPctMin: '80' }, count: c?.budget80 },
    { label: 'Admin granted', patch: { source: 'admin_granted' }, count: c?.adminGranted },
    { label: 'Rejected', patch: { approvalStatus: 'rejected' }, count: c?.rejected },
  ];
}
