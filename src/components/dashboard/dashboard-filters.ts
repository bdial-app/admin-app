import type { FilterDef, FilterValues } from '../ui/filters';
import { DATE_PRESETS } from '../ui/filters';
import type { DashboardPeriodParams } from '../../services/dashboard.service';

export const DASHBOARD_FILTER_KEYS = ['rangeFrom', 'rangeTo', 'compare'] as const;

const RANGE: FilterDef = { key: 'range', label: 'Period', kind: 'daterange', inline: true, placeholder: 'All time', presets: DATE_PRESETS };
const COMPARE: FilterDef = { key: 'compare', label: 'Compare with previous period', kind: 'toggle', inline: true };

/**
 * No range in the URL means all time, which is what the dashboard opens on.
 * Comparing needs a start date, so the toggle only appears once there is one.
 */
export const dashboardFilterDefs = (values: FilterValues): FilterDef[] =>
  values.rangeFrom ? [RANGE, COMPARE] : [RANGE];

/** URL values → API params. `compare` only means something with a start date. */
export function toDashboardParams(values: FilterValues): DashboardPeriodParams {
  return {
    from: values.rangeFrom || undefined,
    to: values.rangeTo || undefined,
    compare: values.compare === 'true' && values.rangeFrom ? 'true' : undefined,
  };
}
