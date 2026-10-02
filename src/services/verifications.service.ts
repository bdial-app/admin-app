import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Verification, VerificationFilters, VerificationFilterOptions } from '../types';

export const verificationsService = {
  list: async (filters: VerificationFilters = {}): Promise<PaginatedResponse<Verification>> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    // The endpoint accepts both `limit` and the legacy `rows`; send both so
    // either generation of the backend pages the same way.
    if (filters.limit) params.set('rows', String(filters.limit));
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

  filterOptions: async (): Promise<VerificationFilterOptions> => {
    const { data } = await api.get(URLS.VERIFICATIONS.FILTER_OPTIONS);
    return data;
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
