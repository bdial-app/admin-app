import api from './api';
import { URLS } from '../utils/urls';
import type { DashboardStats, DashboardTimeSeries } from '../types';

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

  getTimeSeries: async (days = 30): Promise<DashboardTimeSeries> => {
    const { data } = await api.get(`${URLS.DASHBOARD.TIME_SERIES}?days=${days}`);
    return data;
  },

  getRecentActivity: async (limit = 10): Promise<RecentActivity[]> => {
    const { data } = await api.get(URLS.AUDIT_LOGS.LIST, { params: { rows: limit, page: 1 } });
    return data?.data ?? data?.logs ?? [];
  },
};
