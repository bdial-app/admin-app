import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse, ProviderOffer } from '../types';

export interface OfferFilters {
  page?: number;
  limit?: number;
  isActive?: string;
  providerId?: string;
}

export interface OfferStats {
  total: number;
  active: number;
  totalUsage: number;
}

export const offersService = {
  list: async (filters: OfferFilters = {}): Promise<PaginatedResponse<ProviderOffer>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.isActive) params.set('isActive', filters.isActive);
    if (filters.providerId) params.set('providerId', filters.providerId);
    const { data } = await api.get(`${URLS.OFFERS.LIST}?${params.toString()}`);
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

  getById: async (id: string): Promise<ProviderOffer> => {
    const { data } = await api.get(URLS.OFFERS.DETAIL(id));
    return data;
  },

  update: async (id: string, body: Partial<ProviderOffer>): Promise<ProviderOffer> => {
    const { data } = await api.patch(URLS.OFFERS.UPDATE(id), body);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(URLS.OFFERS.DELETE(id));
  },

  getStats: async (): Promise<OfferStats> => {
    const { data } = await api.get(URLS.OFFERS.STATS);
    return data;
  },
};
