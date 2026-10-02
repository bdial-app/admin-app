import type { FilterDef, FilterValues } from '../ui/filters';
import { DATE_PRESETS, istDay } from '../ui/filters';
import type { PaymentFilterOptions, RevenueParams } from '../../services/payments.service';
import type { SubscriptionPlan } from '../../services/subscriptions.service';
import { GATEWAY_OPTIONS, PAYMENT_TYPE_OPTIONS } from '../payments/payment-filters';

/** One URL key per payment type; they collapse into the API's comma-separated `types`. */
export const TYPE_KEY_PREFIX = 'type_';
const TYPE_KEYS = PAYMENT_TYPE_OPTIONS.map((t) => `${TYPE_KEY_PREFIX}${t.value}`);

export const REVENUE_FILTER_KEYS = [
  'rangeFrom', 'rangeTo', 'gateway', 'city', 'planId', 'compare', ...TYPE_KEYS,
] as const;

/** The report defaults to the last 30 days when no range is in the URL. */
export const DEFAULT_RANGE_DAYS = 30;

const RANGE_PRESETS = DATE_PRESETS.filter((p) => ['7d', '30d', '90d', 'this_month', 'last_month'].includes(p.value));

export const REVENUE_FILTER_DEFS: FilterDef[] = [
  { key: 'range', label: 'Period', kind: 'daterange', inline: true, placeholder: 'Last 30 days', presets: RANGE_PRESETS },
  { key: 'gateway', label: 'Gateway', kind: 'select', inline: true, placeholder: 'All gateways', options: GATEWAY_OPTIONS },
  { key: 'city', label: 'City', kind: 'select', inline: true, placeholder: 'All cities', className: 'max-w-[12rem]', options: [] },
  { key: 'planId', label: 'Plan', kind: 'select', inline: true, placeholder: 'All plans', className: 'max-w-[12rem]', options: [] },
  { key: 'compare', label: 'Compare with previous period', kind: 'toggle', inline: true },
  ...PAYMENT_TYPE_OPTIONS.map<FilterDef>((t) => ({
    key: `${TYPE_KEY_PREFIX}${t.value}`,
    label: t.label.endsWith('s') ? t.label : `${t.label}s`,
    kind: 'toggle',
    inline: true,
  })),
];

/** City options come from the payments filter-options; plans from the plan list. */
export function withOptions(defs: FilterDef[], options?: PaymentFilterOptions, plans?: SubscriptionPlan[]): FilterDef[] {
  return defs.map((d) => {
    if (d.key === 'city' && options) return { ...d, options: (options.cities ?? []).map((c) => ({ value: c.name, label: c.name, count: c.count })) };
    if (d.key === 'planId' && plans?.length) return { ...d, options: [...plans].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ value: p.id, label: p.name })) };
    return d;
  });
}

/** Payment types currently toggled on, in schema order. */
export const selectedTypes = (values: FilterValues): string[] =>
  PAYMENT_TYPE_OPTIONS.map((t) => t.value).filter((t) => values[`${TYPE_KEY_PREFIX}${t}`] === 'true');

/**
 * URL values → API params. `rangeFrom`/`rangeTo` become `from`/`to`; with no
 * range at all the last 30 days are requested explicitly so the KPI tiles can
 * say which period they describe.
 */
export function toRevenueParams(values: FilterValues): RevenueParams {
  const from = values.rangeFrom || (values.rangeTo ? undefined : istDay(DEFAULT_RANGE_DAYS - 1));
  const to = values.rangeTo || undefined;
  const types = selectedTypes(values);
  return {
    from,
    to,
    types: types.length ? types.join(',') : undefined,
    gateway: values.gateway || undefined,
    city: values.city || undefined,
    planId: values.planId || undefined,
    compare: values.compare === 'true' ? 'true' : undefined,
  };
}
