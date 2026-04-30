import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Verification, VerificationFilters } from '../types';

export const verificationsService = {
  list: async (filters: VerificationFilters = {}): Promise<PaginatedResponse<Verification>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('rows', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    const { data } = await api.get(`${URLS.VERIFICATIONS.LIST}?${params.toString()}`);
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

  getById: async (id: string): Promise<Verification> => {
    const { data } = await api.get(URLS.VERIFICATIONS.DETAIL(id));
    return data;
  },

  review: async (
    id: string,
    body: { aadhaarStatus: string; ijamatStatus?: string; adminNotes?: string }
  ): Promise<Verification> => {
    const { data } = await api.patch(URLS.VERIFICATIONS.REVIEW(id), body);
    return data;
  },

  updateStatus: async (
    id: string,
    body: { aadhaarStatus?: string; ijamatStatus?: string; status?: string }
  ): Promise<Verification> => {
    const { data } = await api.patch(URLS.VERIFICATIONS.STATUS(id), body);
    return data;
  },
};
