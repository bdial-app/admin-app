import api from './api';
import { URLS } from '../utils/urls';
import type { PhotoModerationItem, PhotoType } from '../types';

export interface PhotoFilters {
  page?: number;
  limit?: number;
  type?: PhotoType;
}

export const photoModerationService = {
  list: async (filters: PhotoFilters = {}): Promise<PhotoModerationItem[]> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.type) params.set('type', filters.type);
    const { data } = await api.get(`${URLS.PHOTOS.LIST}?${params.toString()}`);
    // Backend returns { items: [...], meta: {...} }
    return data.items ?? data;
  },

  remove: async (id: string, type: PhotoType): Promise<void> => {
    await api.delete(`${URLS.PHOTOS.DELETE(id)}?type=${type}`);
  },
};
