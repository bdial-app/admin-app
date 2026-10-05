import api from './api';
import { URLS } from '../utils/urls';

export interface GooglePlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  phoneNumber?: string;
}

export interface GoogleLinkedProvider {
  id: string;
  brandName: string;
  contactNumber: string | null;
  city: string | null;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleVerifiedAt: string | null;
  googleLastFetchedAt: string | null;
  /** 'phone' when linked automatically by phone number, 'manual' when chosen by hand. */
  googleMatchMethod: 'phone' | 'manual' | null;
  /** When the automatic phone search last looked at this business. */
  googleMatchCheckedAt: string | null;
  googleSyncError: string | null;
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
  search?: string;
}

export interface GoogleUsage {
  configured: boolean;
  month: string;
  reviewCalls: number;
  monthlyBudget: number;
  googleFreeCalls: number;
  phoneLookups: number;
  refreshDays: number;
  linked: number;
  notYetSearched: number;
  searchedNoMatch: number;
  storedReviews: number;
  dueForSync: number;
  withErrors: number;
}

export interface AutoMatchResult {
  checked: number;
  linked: number;
  noListing: number;
  ambiguous: number;
  remaining: number;
}

export interface SyncDueResult {
  attempted: number;
  synced: number;
  failed: number;
  overBudget: boolean;
}

export interface SyncResult {
  status: 'synced' | 'not_found' | 'failed' | 'over_budget';
  added: number;
  updated: number;
  removed: number;
  stored: number;
  error?: string;
}

export interface StoredGoogleReview {
  id: string;
  googleReviewId: string;
  rating: number;
  text: string | null;
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  googleMapsUri: string | null;
  publishedAt: string | null;
  lastSeenAt: string;
}

export const googleReviewsService = {
  getProviders: async (filters: GoogleProvidersFilters = {}): Promise<{ items: GoogleLinkedProvider[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.trustLevel) params.set('trustLevel', filters.trustLevel);
    if (filters.linked !== undefined) params.set('linked', String(filters.linked));
    if (filters.search) params.set('search', filters.search);
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

  usage: async (): Promise<GoogleUsage> => (await api.get(URLS.GOOGLE_REVIEWS.USAGE)).data,

  autoMatch: async (limit = 40): Promise<AutoMatchResult> =>
    (await api.post(URLS.GOOGLE_REVIEWS.AUTO_MATCH, null, { params: { limit }, timeout: 120_000 })).data,

  syncDue: async (limit = 50): Promise<SyncDueResult> =>
    (await api.post(URLS.GOOGLE_REVIEWS.SYNC_DUE, null, { params: { limit }, timeout: 180_000 })).data,

  syncOne: async (providerId: string): Promise<SyncResult> =>
    (await api.post(URLS.GOOGLE_REVIEWS.SYNC(providerId))).data,

  storedReviews: async (providerId: string): Promise<StoredGoogleReview[]> =>
    (await api.get(URLS.GOOGLE_REVIEWS.STORED(providerId))).data,
};
