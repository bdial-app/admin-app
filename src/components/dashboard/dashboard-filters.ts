import type { FilterValues } from '../ui/filters';
import type { DashboardPeriodParams } from '../../services/dashboard.service';

export const DASHBOARD_FILTER_KEYS = ['rangeFrom', 'rangeTo', 'compare'] as const;

/** URL values → API params. `compare` only means something with a start date. */
export function toDashboardParams(values: FilterValues): DashboardPeriodParams {
  return {
    from: values.rangeFrom || undefined,
    to: values.rangeTo || undefined,
    compare: values.compare === 'true' && values.rangeFrom ? 'true' : undefined,
  };
}
