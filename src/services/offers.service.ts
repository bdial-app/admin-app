import api from './api';
import { URLS } from '../utils/urls';
import type { CreateOfferPayload, PaginatedResponse, ProviderOffer, OfferFilterOptions } from '../types';

export type OfferSort = 'newest' | 'ending_soon' | 'most_used' | 'discount_desc';

/** Query params for `GET /admin/offers`; values mirror the URL, so they are strings. */
export interface OfferFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
  approvalStatus?: string;
  opStatus?: string;
  discountType?: string;
  discountMin?: string;
  discountMax?: string;
  endsFrom?: string;
  endsTo?: string;
  createdFrom?: string;
  createdTo?: string;
  usage?: string;
  city?: string;
  categoryId?: string;
  providerId?: string;
  sort?: OfferSort;
}

export interface OfferStats {
  total: number;
  active: number;
  totalUsage: number;
}

const toParams = (filters: object) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params.toString();
};

export const offersService = {
  list: async (filters: OfferFilters = {}): Promise<PaginatedResponse<ProviderOffer>> => {
    const { data } = await api.get(`${URLS.OFFERS.LIST}?${toParams(filters)}`);
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

  filterOptions: async (): Promise<OfferFilterOptions> => {
    const { data } = await api.get(URLS.OFFERS.FILTER_OPTIONS);
    return data;
  },

  create: async (body: CreateOfferPayload): Promise<ProviderOffer> => {
    const { data } = await api.post(URLS.OFFERS.CREATE, body);
    return data;
  },

  getById: async (id: string): Promise<ProviderOffer> => {
    const { data } = await api.get(URLS.OFFERS.DETAIL(id));
    return data;
  },

  update: async (id: string, body: Partial<ProviderOffer>): Promise<ProviderOffer> => {
    const { data } = await api.patch(URLS.OFFERS.UPDATE(id), body);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(URLS.OFFERS.DELETE(id));
  },

  getStats: async (): Promise<OfferStats> => {
    const { data } = await api.get(URLS.OFFERS.STATS);
    return data;
  },

  getPending: async (): Promise<ProviderOffer[]> => {
    const { data } = await api.get(URLS.OFFERS.PENDING);
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  approve: async (id: string, notes?: string): Promise<ProviderOffer> => {
    const { data } = await api.patch(URLS.OFFERS.APPROVE(id), { adminNotes: notes });
    return data;
  },

  reject: async (id: string, notes?: string): Promise<ProviderOffer> => {
    const { data } = await api.patch(URLS.OFFERS.REJECT(id), { adminNotes: notes });
    return data;
  },
};
