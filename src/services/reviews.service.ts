import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Review, ReviewFilters, ReviewReport } from '../types';

export const reviewsService = {
  list: async (filters: ReviewFilters = {}): Promise<PaginatedResponse<Review>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    if (filters.providerId) params.set('providerId', filters.providerId);
    if (filters.minRating) params.set('minRating', String(filters.minRating));
    if (filters.maxRating) params.set('maxRating', String(filters.maxRating));
    const { data } = await api.get(`${URLS.REVIEWS.LIST}?${params.toString()}`);
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

  getById: async (id: string): Promise<Review> => {
    const { data } = await api.get(URLS.REVIEWS.DETAIL(id));
    return data;
  },

  updateStatus: async (id: string, status: string): Promise<Review> => {
    const { data } = await api.patch(URLS.REVIEWS.UPDATE_STATUS(id), { status });
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.patch(URLS.REVIEWS.REMOVE(id));
  },

  getPendingReports: async (): Promise<ReviewReport[]> => {
    const { data } = await api.get(URLS.REVIEWS.REPORTS);
    return data;
  },
};
