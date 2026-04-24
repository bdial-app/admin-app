import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse, PromoBanner } from '../types';

export interface BannerFilters {
  page?: number;
  limit?: number;
  isActive?: string;
}

export const bannersService = {
  list: async (filters: BannerFilters = {}): Promise<PaginatedResponse<PromoBanner>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.isActive) params.set('isActive', filters.isActive);
    const { data } = await api.get(`${URLS.BANNERS.LIST}?${params.toString()}`);
    return {
      items: data?.items ?? data?.data ?? [],
      meta: data?.meta ?? {
        total: data?.total ?? 0,
        page: data?.page ?? filters.page ?? 1,
        limit: data?.limit ?? filters.limit ?? 20,
        totalPages: data?.totalPages ?? 1,
      },
    };
  },

  getById: async (id: string): Promise<PromoBanner> => {
    const { data } = await api.get(URLS.BANNERS.DETAIL(id));
    return data;
  },

  create: async (body: Partial<PromoBanner>): Promise<PromoBanner> => {
    const { data } = await api.post(URLS.BANNERS.CREATE, body);
    return data;
  },

  update: async (id: string, body: Partial<PromoBanner>): Promise<PromoBanner> => {
    const { data } = await api.patch(URLS.BANNERS.UPDATE(id), body);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(URLS.BANNERS.DELETE(id));
  },

  reorder: async (items: { id: string; displayOrder: number }[]): Promise<void> => {
    await api.patch(URLS.BANNERS.REORDER, { items });
  },
};
