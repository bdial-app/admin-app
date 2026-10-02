import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse, PhotoFilterOptions, PhotoModerationItem, PhotoType } from '../types';

export type PhotoSort = 'newest' | 'oldest';

/** Query params for GET /admin/photos. */
export interface PhotoFilters {
  page?: number;
  limit?: number;
  type?: PhotoType | '';
  search?: string;
  city?: string;
  providerStatus?: string;
  /** Provider gallery photos only; other kinds have no date and drop out when set. */
  uploadedFrom?: string;
  uploadedTo?: string;
  sort?: PhotoSort | '';
}

export const photoModerationService = {
  list: async (filters: PhotoFilters = {}): Promise<PaginatedResponse<PhotoModerationItem>> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    const { data } = await api.get(`${URLS.PHOTOS.LIST}?${params.toString()}`);
    const items: PhotoModerationItem[] = data?.items ?? (Array.isArray(data) ? data : []);
    return {
      items,
      meta: data?.meta ?? {
        total: items.length,
        page: filters.page ?? 1,
        limit: filters.limit ?? items.length,
        totalPages: 1,
      },
    };
  },

  filterOptions: async (): Promise<PhotoFilterOptions> => {
    const { data } = await api.get(URLS.PHOTOS.FILTER_OPTIONS);
    return data;
  },

  remove: async (id: string, type: PhotoType): Promise<void> => {
    await api.delete(`${URLS.PHOTOS.DELETE(id)}?type=${type}`);
  },
};
