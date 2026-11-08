import api from './api';
import { URLS } from '../utils/urls';
import type { DashboardPeriod, DashboardStats } from '../types';

/** Dates are IST calendar days, inclusive; no `from` means all time. */
export interface DashboardPeriodParams {
  from?: string;
  to?: string;
  compare?: 'true';
}

export interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  adminName: string;
  details: string | null;
  createdAt: string;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get(URLS.DASHBOARD.STATS);
    return data;
  },

  getPeriod: async (params: DashboardPeriodParams): Promise<DashboardPeriod> => {
    const { data } = await api.get(URLS.DASHBOARD.PERIOD, { params });
    return data;
  },

  getRecentActivity: async (limit = 10): Promise<RecentActivity[]> => {
    const { data } = await api.get(URLS.AUDIT_LOGS.LIST, { params: { rows: limit, page: 1 } });
    return data?.data ?? data?.logs ?? [];
  },
};
