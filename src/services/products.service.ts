import api from './api';
import { URLS } from '../utils/urls';
import type { ProductAnalytics } from '../types/product';
import type { PaginatedResponse } from '../types';
import type { Product, ProductFilters, ProductFilterOptions, ProductStats } from '../types';
import type { BulkActionPayload } from '../types';
import { optimizeImages } from '../utils/compress-image';

export const productsService = {
  /** Catalogue growth and product engagement over the last 7, 30 or 90 days. */
  analytics: async (days: 7 | 30 | 90): Promise<ProductAnalytics> => {
    const { data } = await api.get(URLS.PRODUCTS.ANALYTICS, { params: { days } });
    return data;
  },

  list: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    // Only non-empty values travel; the backend DTO rejects unknown keys but
    // treats an absent one as "don't filter".
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
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

  filterOptions: async (): Promise<ProductFilterOptions> => {
    const { data } = await api.get(URLS.PRODUCTS.FILTER_OPTIONS);
    return data;
  },

  stats: async (): Promise<ProductStats> => {
    const { data } = await api.get(URLS.PRODUCTS.STATS);
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get(URLS.PRODUCTS.DETAIL(id));
    return data;
  },

  create: async (body: Partial<Product> & { providerId: string }): Promise<Product> => {
    const { data } = await api.post(URLS.PRODUCTS.CREATE, body);
    return data;
  },

  uploadImages: async (id: string, files: File[]): Promise<Product> => {
    const form = new FormData();
    for (const f of await optimizeImages(files, 'product')) form.append('images', f);
    const { data } = await api.post(URLS.PRODUCTS.UPLOAD_IMAGES(id), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Remove one image from a product's gallery. */
  deleteImage: async (id: string, url: string): Promise<Product> => {
    const { data } = await api.delete(URLS.PRODUCTS.DELETE_IMAGE(id), { data: { url } });
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

// ── Bulk import of products and services ─────────────────────────────────

export interface ProductBulkRow {
  rowId: string;
  /** Whatever the sheet said: an id, a business name, or a phone number. */
  providerRef?: string;
  /** Chosen in the UI — wins over providerRef. */
  providerId?: string;
  name?: string;
  description?: string;
  price?: string | number;
  currency?: string;
  productType?: string;
  categoryId?: string;
  photoUrl?: string;
}

export type ProviderMatch = 'matched' | 'ambiguous' | 'missing' | 'none';

export interface ProductRowVerdict {
  rowId: string;
  providerMatch: ProviderMatch;
  providerId: string | null;
  providerName: string | null;
  candidates?: { id: string; brandName: string; city: string | null }[];
  duplicate: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProductImportResult {
  rowId: string;
  ok: boolean;
  productId?: string;
  name?: string;
  error?: string;
}

/** Dry run — writes nothing. */
export const bulkValidateProducts = async (rows: ProductBulkRow[]): Promise<ProductRowVerdict[]> => {
  const { data } = await api.post(URLS.PRODUCTS.BULK_VALIDATE, { rows });
  return data.results;
};

export const bulkImportProducts = async (rows: ProductBulkRow[]): Promise<ProductImportResult[]> => {
  const { data } = await api.post(URLS.PRODUCTS.BULK_IMPORT, { rows });
  return data.results;
};
