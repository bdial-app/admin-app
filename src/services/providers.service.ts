import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Provider, ProviderFilters } from '../types';
import type { BulkActionPayload } from '../types';
import { compressImageFile, COMPRESS_PRESETS } from '../utils/compress-image';

export interface ProviderImagesPayload {
  /** Business logo / profile photo */
  logo?: File | null;
  /** Cover banner */
  banner?: File | null;
  removeLogo?: boolean;
  removeBanner?: boolean;
}

export const providersService = {
  list: async (filters: ProviderFilters = {}): Promise<PaginatedResponse<Provider>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.isFeatured !== undefined) params.set('isFeatured', String(filters.isFeatured));
    if (filters.isWomenLed !== undefined) params.set('isWomenLed', String(filters.isWomenLed));
    const { data } = await api.get(`${URLS.PROVIDERS.LIST}?${params.toString()}`);
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

  getPending: async (): Promise<Provider[]> => {
    const { data } = await api.get(URLS.PROVIDERS.PENDING);
    return data;
  },

  getById: async (id: string): Promise<Provider> => {
    const { data } = await api.get(URLS.PROVIDERS.DETAIL(id));
    return data;
  },

  approve: async (id: string): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.APPROVE(id));
    return data;
  },

  suspend: async (id: string): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.SUSPEND(id));
    return data;
  },

  unsuspend: async (id: string): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.UNSUSPEND(id));
    return data;
  },

  disable: async (id: string): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.DISABLE(id));
    return data;
  },

  enable: async (id: string): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.ENABLE(id));
    return data;
  },

  softDelete: async (id: string): Promise<void> => {
    await api.delete(URLS.PROVIDERS.DELETE(id));
  },

  toggleFeatured: async (id: string, isFeatured: boolean): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.FEATURE(id), { isFeatured });
    return data;
  },

  update: async (id: string, body: Partial<Provider>): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.UPDATE(id), body);
    return data;
  },

  updateImages: async (id: string, payload: ProviderImagesPayload): Promise<Provider> => {
    const fd = new FormData();
    if (payload.logo) {
      fd.append('logo', await compressImageFile(payload.logo, COMPRESS_PRESETS.icon));
    } else if (payload.removeLogo) {
      fd.append('removeLogo', 'true');
    }
    if (payload.banner) {
      fd.append('banner', await compressImageFile(payload.banner, COMPRESS_PRESETS.banner));
    } else if (payload.removeBanner) {
      fd.append('removeBanner', 'true');
    }
    const { data } = await api.patch(URLS.PROVIDERS.UPDATE_IMAGES(id), fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateCategories: async (id: string, categoryIds: string[]): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.UPDATE_CATEGORIES(id), { categoryIds });
    return data;
  },

  updateContactNumber: async (id: string, contactNumber: string, otp: string): Promise<Provider> => {
    const { data } = await api.patch(URLS.PROVIDERS.UPDATE_CONTACT(id), { contactNumber, otp });
    return data;
  },

  bulkAction: async (payload: BulkActionPayload): Promise<{ affected: number }> => {
    const { data } = await api.post(URLS.PROVIDERS.BULK_ACTION, payload);
    return data;
  },

  getWarnings: async (id: string) => {
    const { data } = await api.get(URLS.PROVIDERS.WARNINGS(id));
    return data;
  },

  // Women-Led Approval
  getWomenLedPending: async (page = 1, limit = 10) => {
    const { data } = await api.get(`${URLS.PROVIDERS.WOMEN_LED_PENDING}?page=${page}&limit=${limit}`);
    return data;
  },

  approveWomenLed: async (id: string) => {
    const { data } = await api.patch(URLS.PROVIDERS.WOMEN_LED_APPROVE(id));
    return data;
  },

  rejectWomenLed: async (id: string) => {
    const { data } = await api.patch(URLS.PROVIDERS.WOMEN_LED_REJECT(id));
    return data;
  },

  getWomenLedAnalytics: async () => {
    const { data } = await api.get(URLS.PROVIDERS.WOMEN_LED_ANALYTICS);
    return data;
  },
};
