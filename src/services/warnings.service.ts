import api from './api';
import { URLS } from '../utils/urls';
import type { ProviderWarning, PaginatedResponse } from '../types';

export interface WarningFilters {
  page?: number;
  limit?: number;
  providerId?: string;
  warningType?: string;
  search?: string;
  isRead?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const warningsService = {
  list: async (filters: WarningFilters = {}): Promise<PaginatedResponse<ProviderWarning>> => {
    const { data } = await api.get(URLS.WARNINGS.LIST, { params: filters });
    return data;
  },

  getById: async (id: string): Promise<ProviderWarning> => {
    const { data } = await api.get(URLS.WARNINGS.DETAIL(id));
    return data;
  },

  create: async (body: { providerId: string; warningType: string; title: string; message: string }): Promise<ProviderWarning> => {
    const { data } = await api.post(URLS.WARNINGS.CREATE, body);
    return data;
  },

  update: async (id: string, body: Partial<ProviderWarning>): Promise<ProviderWarning> => {
    const { data } = await api.patch(URLS.WARNINGS.UPDATE(id), body);
    return data;
  },
};
