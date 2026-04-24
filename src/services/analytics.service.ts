import api from './api';
import { URLS } from '../utils/urls';
import type { AnalyticsOverview, SearchTrends, GeographicStats } from '../types';

export const analyticsService = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const { data } = await api.get(URLS.ANALYTICS.OVERVIEW);
    return data;
  },

  getSearchTrends: async (days = 30): Promise<SearchTrends> => {
    const { data } = await api.get(`${URLS.ANALYTICS.SEARCH_TRENDS}?days=${days}`);
    return data;
  },

  getGeographic: async (): Promise<GeographicStats> => {
    const { data } = await api.get(URLS.ANALYTICS.GEOGRAPHIC);
    return data;
  },
};
