import api from './api';
import { URLS } from '../utils/urls';
import type { BugReport, BugReportFilters, BugReportListResponse } from '../types';

export const bugReportsService = {
  list: async (filters: BugReportFilters = {}): Promise<BugReportListResponse> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    const { data } = await api.get(`${URLS.BUG_REPORTS.LIST}?${params.toString()}`);
    return {
      items: data?.items ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? filters.page ?? 1,
      limit: data?.limit ?? filters.limit ?? 20,
      pages: data?.pages ?? 1,
    };
  },

  getById: async (id: string): Promise<BugReport> => {
    const { data } = await api.get(URLS.BUG_REPORTS.DETAIL(id));
    return data;
  },

  update: async (id: string, body: { status?: string; adminNotes?: string }): Promise<BugReport> => {
    const { data } = await api.patch(URLS.BUG_REPORTS.UPDATE(id), body);
    return data;
  },
};
