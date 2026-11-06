import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Review, ReviewDetail, ReviewFilterOptions, ReviewFilters, ReviewReport } from '../types';

export const reviewsService = {
  list: async (filters: ReviewFilters = {}): Promise<PaginatedResponse<Review>> => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const { data } = await api.get(URLS.REVIEWS.LIST, { params });
    return data;
  },

  filterOptions: async (): Promise<ReviewFilterOptions> => {
    const { data } = await api.get(URLS.REVIEWS.FILTER_OPTIONS);
    return data;
  },

  getById: async (id: string): Promise<ReviewDetail> => {
    const { data } = await api.get(URLS.REVIEWS.DETAIL(id));
    return data;
  },

  /** Record a review from the admin panel (offline feedback, migrations). */
  create: async (body: {
    providerId: string;
    reviewerId?: string;
    starRating: number;
    reviewText?: string;
    postedAt?: string;
  }): Promise<Review> => {
    const { data } = await api.post(URLS.REVIEWS.CREATE, body);
    return data;
  },

  /** Show or take down a review; the reason goes in the audit log. */
  updateStatus: async (id: string, status: 'active' | 'removed', reason?: string): Promise<ReviewDetail> => {
    const { data } = await api.patch(URLS.REVIEWS.UPDATE_STATUS(id), { status, ...(reason?.trim() ? { reason: reason.trim() } : {}) });
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.patch(URLS.REVIEWS.REMOVE(id));
  },

  /** Keep the review; close its open reports. */
  dismissReports: async (id: string): Promise<ReviewDetail> => {
    const { data } = await api.patch(URLS.REVIEWS.DISMISS_REPORTS(id));
    return data;
  },

  getPendingReports: async (): Promise<ReviewReport[]> => {
    const { data } = await api.get(URLS.REVIEWS.REPORTS);
    return data;
  },
};
