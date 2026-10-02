import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { DATE_PRESETS, FUTURE_PRESETS } from '../ui/filters';
import type { SubscriptionFilterOptions, SubscriptionPlan } from '../../services/subscriptions.service';

/** Every key the Subscriptions page mirrors into the URL (date ranges expand to From/To). */
export const SUBSCRIPTION_FILTER_KEYS = [
  'status', 'planId', 'billingInterval',
  'gateway', 'cancelAtPeriodEnd', 'renewingWithinDays', 'periodEndFrom', 'periodEndTo', 'dateFrom', 'dateTo', 'city',
] as const;

/** Period end can be in the past (lapsed) or the future (renewal), so offer both directions. */
const PERIOD_END_PRESETS = [
  ...FUTURE_PRESETS,
  ...DATE_PRESETS.filter((p) => p.value === 'this_month' || p.value === 'last_month'),
];

export const SUBSCRIPTION_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'active', label: 'Active' }, { value: 'trialing', label: 'Trialing' }, { value: 'past_due', label: 'Past due' },
    { value: 'paused', label: 'Paused' }, { value: 'canceled', label: 'Canceled' },
  ] },
  { key: 'planId', label: 'Plan', kind: 'select', inline: true, placeholder: 'All plans', className: 'max-w-[13rem]', options: [] },
  { key: 'billingInterval', label: 'Billing', kind: 'select', inline: true, placeholder: 'All billing', options: [
    { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' },
  ] },
  // Panel
  { key: 'gateway', label: 'Gateway', kind: 'select', group: 'Billing', options: [
    { value: 'razorpay', label: 'Razorpay' }, { value: 'apple', label: 'Apple IAP' },
  ] },
  { key: 'cancelAtPeriodEnd', label: 'Cancelling', kind: 'select', group: 'Billing', hint: 'Set to cancel when the current period ends', options: [
    { value: 'true', label: 'Cancelling at period end' }, { value: 'false', label: 'Will renew' },
  ] },
  { key: 'renewingWithinDays', label: 'Renews within', kind: 'select', group: 'Timing', options: [
    { value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' },
  ] },
  { key: 'periodEnd', label: 'Period end', kind: 'daterange', group: 'Timing', presets: PERIOD_END_PRESETS },
  { key: 'date', label: 'Created', kind: 'daterange', group: 'Timing' },
  { key: 'city', label: 'City', kind: 'select', group: 'Business', options: [] },
];

/** `newest` is the API default, so it is the placeholder rather than an option. */
export const SUBSCRIPTION_SORTS: SortOption[] = [
  { value: 'period_end_asc', label: 'Renews soonest' },
  { value: 'period_end_desc', label: 'Renews latest' },
];

/**
 * Plan and city options come from filter-options (with counts). Until that
 * endpoint answers, the plan list from the plans tab stands in.
 */
export function withOptions(defs: FilterDef[], options?: SubscriptionFilterOptions, fallbackPlans?: SubscriptionPlan[]): FilterDef[] {
  return defs.map((d) => {
    if (d.key === 'city' && options) return { ...d, options: (options.cities ?? []).map((c) => ({ value: c.name, label: c.name, count: c.count })) };
    if (d.key === 'planId') {
      if (options?.plans?.length) return { ...d, options: options.plans.map((p) => ({ value: p.id, label: p.name, count: p.count })) };
      if (fallbackPlans?.length) return { ...d, options: [...fallbackPlans].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ value: p.id, label: p.name })) };
    }
    return d;
  });
}

export function subscriptionSegments(options?: SubscriptionFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All', patch: {}, count: c?.total },
    { label: 'Active', patch: { status: 'active' }, count: c?.active },
    { label: 'Trialing', patch: { status: 'trialing' }, count: c?.trialing },
    { label: 'Past due', patch: { status: 'past_due' }, count: c?.pastDue },
    // counts.cancelling measures active subscriptions set to cancel, so the patch narrows both ways.
    { label: 'Cancelling', patch: { status: 'active', cancelAtPeriodEnd: 'true' }, count: c?.cancelling },
    { label: 'Renews in 7 days', patch: { renewingWithinDays: '7' }, count: c?.renews7d },
    { label: 'Apple', patch: { gateway: 'apple' }, count: c?.apple },
  ];
}
