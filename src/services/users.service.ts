import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { User, UserFilters, UserFilterOptions } from '../types';
import type { BulkActionPayload } from '../types';

export const usersService = {
  list: async (filters: UserFilters = {}): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
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

  filterOptions: async (): Promise<UserFilterOptions> => {
    const { data } = await api.get(URLS.USERS.FILTER_OPTIONS);
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(URLS.USERS.DETAIL(id));
    return data;
  },

  update: async (id: string, body: Partial<User>): Promise<User> => {
    const { data } = await api.patch(URLS.USERS.UPDATE(id), body);
    return data;
  },

  /** The OTP is checked server-side in this same call, so it cannot be skipped. */
  updateMobileNumber: async (id: string, mobileNumber: string, otp: string): Promise<User> => {
    const { data } = await api.patch(URLS.USERS.UPDATE_MOBILE(id), { mobileNumber, otp });
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
