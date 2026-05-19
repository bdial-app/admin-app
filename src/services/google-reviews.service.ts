import api from './api';
import { URLS } from '../utils/urls';

export interface GooglePlaceCandidate {
  placeId: string;
  name: string;
  address: string;
}

export interface GoogleLinkedProvider {
  id: string;
  businessName: string;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleVerifiedAt: string | null;
  googleLastFetchedAt: string | null;
  combinedRating: number | null;
  combinedReviewCount: number | null;
  trustLevel: 'unverified' | 'basic' | 'verified' | 'trusted';
}

export interface TrustOverview {
  unverified: number;
  basic: number;
  verified: number;
  trusted: number;
  total: number;
}

export interface GoogleProvidersFilters {
  page?: number;
  limit?: number;
  trustLevel?: string;
  linked?: boolean;
}

export const googleReviewsService = {
  getProviders: async (filters: GoogleProvidersFilters = {}): Promise<{ items: GoogleLinkedProvider[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.trustLevel) params.set('trustLevel', filters.trustLevel);
    if (filters.linked !== undefined) params.set('linked', String(filters.linked));
    const { data } = await api.get(`${URLS.GOOGLE_REVIEWS.PROVIDERS}?${params.toString()}`);
    return {
      items: data?.items ?? data?.data ?? [],
      meta: data?.meta ?? {
        total: data?.total ?? 0,
        page: data?.page ?? filters.page ?? 1,
        limit: data?.limit ?? filters.limit ?? 20,
        totalPages: data?.totalPages ?? 1,
      },
    };
  },

  getTrustOverview: async (): Promise<TrustOverview> => {
    const { data } = await api.get(URLS.GOOGLE_REVIEWS.TRUST_OVERVIEW);
    return data;
  },

  verify: async (providerId: string, phoneNumber?: string): Promise<GooglePlaceCandidate[]> => {
    const { data } = await api.post(URLS.GOOGLE_REVIEWS.VERIFY(providerId), phoneNumber ? { phoneNumber } : {});
    return data;
  },

  confirm: async (providerId: string, placeId: string): Promise<void> => {
    await api.post(URLS.GOOGLE_REVIEWS.CONFIRM(providerId), { placeId });
  },

  unlink: async (providerId: string): Promise<void> => {
    await api.delete(URLS.GOOGLE_REVIEWS.UNLINK(providerId));
  },

  refresh: async (providerId: string): Promise<void> => {
    await api.post(URLS.GOOGLE_REVIEWS.REFRESH(providerId));
  },
};
