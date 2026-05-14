import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Product, ProductFilters, ProductStats } from '../types';
import type { BulkActionPayload } from '../types';

export const productsService = {
  list: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.providerId) params.set('providerId', filters.providerId);
    if (filters.isActive !== undefined && filters.isActive !== '') {
      params.set('isActive', String(filters.isActive));
    }
    if (filters.productType) params.set('productType', filters.productType);
    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.hasImages) params.set('hasImages', filters.hasImages);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    const { data } = await api.get(`${URLS.PRODUCTS.LIST}?${params.toString()}`);
    return {
      items: data?.items ?? data?.data ?? [],
      meta: data?.meta ?? {
        total: data?.total ?? 0,
        page: data?.page ?? filters.page ?? 1,
        limit: data?.limit ?? filters.limit ?? 25,
        totalPages: data?.totalPages ?? 1,
      },
    };
  },

  stats: async (): Promise<ProductStats> => {
    const { data } = await api.get(URLS.PRODUCTS.STATS);
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get(URLS.PRODUCTS.DETAIL(id));
    return data;
  },

  update: async (id: string, body: Partial<Product>): Promise<Product> => {
    const { data } = await api.patch(URLS.PRODUCTS.UPDATE(id), body);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.patch(`${URLS.PRODUCTS.DELETE(id)}/delete`);
  },

  bulkAction: async (payload: BulkActionPayload): Promise<{ affected: number }> => {
    const { data } = await api.post(URLS.PRODUCTS.BULK_ACTION, payload);
    return data;
  },
};
