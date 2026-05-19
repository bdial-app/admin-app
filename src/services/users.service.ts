import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { User, UserFilters } from '../types';
import type { BulkActionPayload } from '../types';

export const usersService = {
  list: async (filters: UserFilters = {}): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.role) params.set('role', filters.role);
    if (filters.city) params.set('city', filters.city);
    if (filters.hasProvider !== undefined) params.set('hasProvider', String(filters.hasProvider));
    const { data } = await api.get(`${URLS.USERS.LIST}?${params.toString()}`);
    // Normalize backend response into PaginatedResponse
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

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(URLS.USERS.DETAIL(id));
    return data;
  },

  update: async (id: string, body: Partial<User>): Promise<User> => {
    const { data } = await api.patch(URLS.USERS.UPDATE(id), body);
    return data;
  },

  suspend: async (id: string): Promise<User> => {
    const { data } = await api.patch(URLS.USERS.SUSPEND(id));
    return data;
  },

  unsuspend: async (id: string): Promise<User> => {
    const { data } = await api.patch(URLS.USERS.UNSUSPEND(id));
    return data;
  },

  softDelete: async (id: string): Promise<void> => {
    await api.delete(URLS.USERS.DELETE(id));
  },

  bulkAction: async (payload: BulkActionPayload): Promise<{ affected: number }> => {
    const { data } = await api.post(URLS.USERS.BULK_ACTION, payload);
    return data;
  },
};
