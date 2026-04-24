import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse, ReportFilters, Report, ReportDetail, ReportStats, ReportAction } from '../types';

export const reportsService = {
  list: async (filters: ReportFilters = {}): Promise<PaginatedResponse<Report>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('rows', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    if (filters.entityType) params.set('entityType', filters.entityType);
    const { data } = await api.get(`${URLS.REPORTS.LIST}?${params.toString()}`);
    return {
      items: data?.items ?? data?.data ?? [],
      meta: data?.meta ?? {
        total: data?.total ?? 0,
        page: data?.page ?? filters.page ?? 1,
        limit: data?.limit ?? filters.limit ?? 10,
        totalPages: data?.totalPages ?? 1,
      },
    };
  },

  getById: async (id: string): Promise<ReportDetail> => {
    const { data } = await api.get(URLS.REPORTS.DETAIL(id));
    return data;
  },

  review: async (
    id: string,
    body: { action: ReportAction; adminNotes?: string }
  ): Promise<Report> => {
    const { data } = await api.patch(URLS.REPORTS.REVIEW(id), body);
    return data;
  },

  getStats: async (): Promise<ReportStats> => {
    const { data } = await api.get(URLS.REPORTS.STATS);
    return data;
  },
};
