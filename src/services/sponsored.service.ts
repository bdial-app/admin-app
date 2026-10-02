import api from './api';
import { URLS } from '../utils/urls';
import type {
  PaginatedResponse,
  SponsoredListing,
  SponsorshipAnalytics,
  SponsorshipEligibleProvider,
  AdminCreateSponsorshipPayload,
  AdminUpdateSponsorshipPayload,
  TopUpSponsorshipPayload,
  BulkSponsorshipAction,
  BulkSponsorshipResult,
  StopAllSponsorshipsResult,
  SponsoredBillingMode,
  SponsorshipFilterOptions,
} from '../types';

export type SponsoredSort = 'newest' | 'ending_soon' | 'spend_desc' | 'impressions_desc' | 'clicks_desc' | 'ctr_desc';

/** Query params for `GET /admin/sponsorships`; values mirror the URL, so they are strings. */
export interface SponsoredFilters {
  page?: number;
  limit?: number;
  isActive?: string;
  type?: string;
  approvalStatus?: string;
  opStatus?: string;
  source?: string;
  billingMode?: string;
  providerId?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
  endsFrom?: string;
  endsTo?: string;
  budgetMin?: string;
  budgetMax?: string;
  spentPctMin?: string;
  city?: string;
  minImpressions?: string;
  sort?: SponsoredSort;
}

export interface SponsoredStats {
  total: number;
  active: number;
  /** Paid boosts inside their serving window right now */
  activePaid: number;
  complimentary: number;
  adminGranted: number;
  pendingApproval: number;
  expiringSoon: number;
  totalSpent: number;
  totalBudget: number;
  totalImpressions: number;
  totalClicks: number;
  sponsorshipsEnabled: boolean;
}

export const sponsoredService = {
  list: async (filters: SponsoredFilters = {}): Promise<PaginatedResponse<SponsoredListing>> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    const { data } = await api.get(`${URLS.SPONSORED.LIST}?${params.toString()}`);
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

  filterOptions: async (): Promise<SponsorshipFilterOptions> => {
    const { data } = await api.get(URLS.SPONSORED.FILTER_OPTIONS);
    return data;
  },

  getById: async (id: string): Promise<SponsoredListing> => {
    const { data } = await api.get(URLS.SPONSORED.DETAIL(id));
    return data;
  },

  create: async (body: AdminCreateSponsorshipPayload): Promise<SponsoredListing> => {
    const { data } = await api.post(URLS.SPONSORED.CREATE, body);
    return data;
  },

  update: async (id: string, body: AdminUpdateSponsorshipPayload): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.UPDATE(id), body);
    return data;
  },

  stop: async (id: string, reason?: string, notifyProvider = true): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.STOP(id), { reason, notifyProvider });
    return data;
  },

  resume: async (id: string): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.RESUME(id));
    return data;
  },

  topUp: async (id: string, body: TopUpSponsorshipPayload): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.TOP_UP(id), body);
    return data;
  },

  remove: async (id: string): Promise<{ success: boolean; id: string }> => {
    const { data } = await api.delete(URLS.SPONSORED.DELETE(id));
    return data;
  },

  bulk: async (ids: string[], action: BulkSponsorshipAction, reason?: string): Promise<BulkSponsorshipResult> => {
    const { data } = await api.post(URLS.SPONSORED.BULK, { ids, action, reason });
    return data;
  },

  stopAll: async (opts: { reason?: string; disableFeatureFlag?: boolean; billingMode?: SponsoredBillingMode } = {}): Promise<StopAllSponsorshipsResult> => {
    const { data } = await api.post(URLS.SPONSORED.STOP_ALL, opts);
    return data;
  },

  getStats: async (): Promise<SponsoredStats> => {
    const { data } = await api.get(URLS.SPONSORED.STATS);
    return data;
  },

  getPending: async (): Promise<SponsoredListing[]> => {
    const { data } = await api.get(URLS.SPONSORED.PENDING);
    // Backend paginates; callers only need the rows.
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  approve: async (id: string, notes?: string): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.APPROVE(id), { adminNotes: notes });
    return data;
  },

  reject: async (id: string, notes?: string): Promise<SponsoredListing> => {
    const { data } = await api.patch(URLS.SPONSORED.REJECT(id), { adminNotes: notes });
    return data;
  },

  getAnalytics: async (id: string, period: string = '7d'): Promise<SponsorshipAnalytics> => {
    const { data } = await api.get(`${URLS.SPONSORED.ANALYTICS(id)}?period=${period}`);
    return data;
  },

  eligibleProviders: async (search?: string, limit = 20): Promise<SponsorshipEligibleProvider[]> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', String(limit));
    const { data } = await api.get(`${URLS.SPONSORED.ELIGIBLE_PROVIDERS}?${params.toString()}`);
    return data;
  },
};
