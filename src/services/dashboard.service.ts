import api from './api';
import { URLS } from '../utils/urls';
import type { DashboardStats, DashboardTimeSeries } from '../types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get(URLS.DASHBOARD.STATS);
    return data;
  },

  getTimeSeries: async (days = 30): Promise<DashboardTimeSeries> => {
    const { data } = await api.get(`${URLS.DASHBOARD.TIME_SERIES}?days=${days}`);
    return data;
  },
};
