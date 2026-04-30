import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse, SponsoredListing } from '../types';

export interface SponsoredFilters {
  page?: number;
  limit?: number;
  isActive?: string;
  type?: string;
}

export interface SponsoredStats {
  total: number;
  active: number;
  totalSpent: number;
  totalBudget: number;
  totalImpressions: number;
  totalClicks: number;
}

export const sponsoredService = {
  list: async (filters: SponsoredFilters = {}): Promise<PaginatedResponse<SponsoredListing>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.isActive) params.set('isActive', filters.isActive);
    if (filters.type) params.set('type', filters.type);
    const { data } = await api.get(`${URLS.SPONSORED.LIST}?${params.toString()}`);
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

  getById: async (id: string): Promise<SponsoredListing> => {
    const { data } = await api.get(URLS.SPONSORED.DETAIL(id));
    return data;
  },

  update: async (id: string, body: Partial<SponsoredListing>): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.UPDATE(id), body);
    return data;
  },

  getStats: async (): Promise<SponsoredStats> => {
    const { data } = await api.get(URLS.SPONSORED.STATS);
    return data;
  },

  getPending: async (): Promise<SponsoredListing[]> => {
    const { data } = await api.get(URLS.SPONSORED.PENDING);
    return data;
  },

  approve: async (id: string, notes?: string): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.APPROVE(id), { adminNotes: notes });
    return data;
  },

  reject: async (id: string, notes?: string): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.REJECT(id), { adminNotes: notes });
    return data;
  },
};
