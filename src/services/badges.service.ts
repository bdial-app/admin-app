import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse, ProviderBadge } from '../types';

export interface BadgeFilters {
  page?: number;
  limit?: number;
  type?: string;
  isActive?: string;
}

export const badgesService = {
  list: async (filters: BadgeFilters = {}): Promise<PaginatedResponse<ProviderBadge>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.type) params.set('type', filters.type);
    if (filters.isActive) params.set('isActive', filters.isActive);
    const { data } = await api.get(`${URLS.BADGES.LIST}?${params.toString()}`);
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

  getById: async (id: string): Promise<ProviderBadge> => {
    const { data } = await api.get(`${URLS.BADGES.LIST}/${id}`);
    return data;
  },

  create: async (body: { providerId: string; type: string; source?: string; expiresAt?: string }): Promise<ProviderBadge> => {
    const { data } = await api.post(URLS.BADGES.CREATE, body);
    return data;
  },

  update: async (id: string, body: { isActive?: boolean; expiresAt?: string | null }): Promise<ProviderBadge> => {
    const { data } = await api.patch(URLS.BADGES.UPDATE(id), body);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(URLS.BADGES.DELETE(id));
  },
};
