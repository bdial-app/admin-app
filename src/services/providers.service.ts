import api from './api';
import { URLS } from '../utils/urls';
import type { PaginatedResponse } from '../types';
import type { Provider, ProviderFilters } from '../types';
import type { BulkActionPayload } from '../types';
import { optimizeImage } from '../utils/compress-image';

export interface ProviderImagesPayload {
  /** Business logo / profile photo */
  logo?: File | null;
  /** Cover banner */
  banner?: File | null;
  removeLogo?: boolean;
  removeBanner?: boolean;
}

export interface EnrichImageCandidate {
  url: string;
  source: string;
  width: number;
  height: number;
}

/** Suggestions for one provider from Google and the business's own website. Nothing is saved yet. */
export interface ProviderEnrichment {
  providerId: string;
  brandName: string;
  current: { logoUrl: string | null; bannerUrl: string | null; websiteUrl: string | null };
  match: { placeId: string; name: string; address: string; matchedBy: 'phone' | 'name' } | null;
  website: { url: string; source: 'provider' | 'google' } | null;
  logos: EnrichImageCandidate[];
  banners: EnrichImageCandidate[];
  confidence: 'high' | 'check' | 'none';
  notes: string[];
}

/** Logo/banner candidates for a sheet row being vetted — nothing is saved yet. */
export interface SheetImageCandidates {
  rowId: string;
  website: string | null;
  logos: EnrichImageCandidate[];
  banners: EnrichImageCandidate[];
  notes: string[];
}

/** Where a provider's pin came from, and how exact it is. */
export interface ProviderLocationResult {
  providerId: string;
  brandName: string;
  precision: 'rooftop' | 'street' | 'locality' | 'pincode' | 'city' | 'manual' | null;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
  skipped: boolean;
  note?: string;
}

/**
 * Tiers, best to worst: precise (owner/rooftop/street), neighbourhood
 * (locality — distance still shown), approximate (city centre, "In Pune"),
 * missing (no coordinates, never in nearby results).
 */
export interface LocationStats {
  total: number;
  precise: number;
  neighbourhood: number;
  approximate: number;
  missing: number;
  byPrecision: Record<string, number>;
  /** Weak pins with address text no geocoder has been asked about yet. */
  improvable: number;
  /** Weak pins Google Places could still find by name or phone. */
  nameSearchable: number;
}

/** What auto-fill actually saved for one provider. */
export interface AutoImageResult {
  providerId: string;
  brandName: string;
  logo: 'instagram' | 'website' | null;
  banner: 'website' | null;
  /** The provider already had both images. */
  skipped: boolean;
  notes: string[];
}

/** Every filter that has a value, as query params (page/limit left to the caller). */
function filterParams(filters: ProviderFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || key === 'limit' || value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return params;
}

export const providersService = {
  /**
   * CSV of every provider the given filters match — the whole result set, not
   * the page on screen. Returns the file plus what the server says it holds.
   */
  exportCsv: async (
    filters: ProviderFilters = {},
  ): Promise<{ blob: Blob; filename: string; count: number; truncated: boolean }> => {
    const params = filterParams(filters);
    const res = await api.get(`${URLS.PROVIDERS.EXPORT}?${params.toString()}`, { responseType: 'blob' });
    const disposition = String(res.headers['content-disposition'] ?? '');
    const named = /filename="?([^"]+)"?/.exec(disposition)?.[1];
    return {
      blob: res.data as Blob,
      filename: named || `providers-${new Date().toISOString().slice(0, 10)}.csv`,
      count: Number(res.headers['x-export-count'] ?? 0),
      truncated: String(res.headers['x-export-truncated'] ?? '') === 'true',
    };
  },

  list: async (filters: ProviderFilters = {}): Promise<PaginatedResponse<Provider>> => {
    const params = filterParams(filters);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
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
      fd.append('logo', await optimizeImage(payload.logo, 'avatar'));
    } else if (payload.removeLogo) {
      fd.append('removeLogo', 'true');
    }
    if (payload.banner) {
      fd.append('banner', await optimizeImage(payload.banner, 'banner'));
    } else if (payload.removeBanner) {
      fd.append('removeBanner', 'true');
    }
    const { data } = await api.patch(URLS.PROVIDERS.UPDATE_IMAGES(id), fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Add gallery photos (the server allows 10 per provider). */
  uploadPhotos: async (id: string, files: File[]): Promise<unknown> => {
    const fd = new FormData();
    for (const f of files) fd.append('photos', await optimizeImage(f, 'gallery'));
    const { data } = await api.post(URLS.PROVIDERS.UPLOAD_PHOTOS(id), fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** The server downloads each link (Google Drive, Dropbox, direct) and reports per image. */
  importImageUrls: async (
    id: string,
    body: { logoUrl?: string; bannerUrl?: string; galleryUrls?: string[] },
  ): Promise<{ uploaded: number; failed: number; results: { kind: 'logo' | 'banner' | 'gallery'; url: string; ok: boolean; imageUrl?: string; error?: string }[] }> => {
    // Match the server's 300s request timeout: giving up earlier would mark links failed
    // while the server is still saving them, and a retry would then duplicate photos.
    const { data } = await api.post(URLS.PROVIDERS.IMPORT_IMAGE_URLS(id), body, { timeout: 300_000 });
    return data;
  },

  /** Generate (or restyle) a business's logo from its name and category. Never replaces a real logo. */
  generateBrandMark: async (id: string, variant = 0): Promise<{ status: 'generated'; profilePhotoUrl: string }> => {
    const { data } = await api.post(URLS.PROVIDERS.BRAND_MARK(id), { variant });
    return data;
  },

  /** AI artwork in the same frame (Cloudflare Workers AI; a few seconds). Never replaces a real logo. */
  generateAiLogo: async (id: string): Promise<{ status: 'generated'; profilePhotoUrl: string }> => {
    const { data } = await api.post(URLS.PROVIDERS.AI_LOGO(id), undefined, { timeout: 90_000 });
    return data;
  },

  /** Values for the filter panel: every city with its business count. */
  facets: async (): Promise<{ cities: { city: string; count: number }[] }> => {
    const { data } = await api.get(URLS.PROVIDERS.FACETS);
    return data;
  },

  /** How many businesses have no logo, and whether AI logos are set up. */
  brandMarkSummary: async (): Promise<{ missing: number; aiEnabled: boolean }> => {
    const { data } = await api.get(URLS.PROVIDERS.BRAND_MARK_SUMMARY);
    return data;
  },

  /** Generated logos for up to `limit` businesses without one. */
  backfillBrandMarks: async (limit = 100): Promise<{ generated: number; failed: number; remaining: number }> => {
    const { data } = await api.post(URLS.PROVIDERS.BRAND_MARK_BACKFILL, { limit }, { timeout: 180_000 });
    return data;
  },

  /** Up to 10 ids per call; each provider can take several seconds on the server. */
  enrich: async (ids: string[]): Promise<ProviderEnrichment[]> => {
    const { data } = await api.post(URLS.PROVIDERS.ENRICH, { ids }, { timeout: 180_000 });
    return data;
  },

  /**
   * Candidates for rows in the bulk-import sheet, from their Instagram handle
   * and website. Up to 10 rows per call; nothing is saved.
   */
  imageCandidates: async (
    rows: { rowId: string; instagram?: string; website?: string }[],
  ): Promise<SheetImageCandidates[]> => {
    const { data } = await api.post(URLS.PROVIDERS.IMAGE_CANDIDATES, { rows }, { timeout: 180_000 });
    return data;
  },

  /**
   * Gives providers a location: address/area/pincode through a cached geocoder,
   * otherwise the city centre (free). Precise pins are never overwritten.
   * Up to 50 ids per call.
   */
  geocode: async (
    ids: string[],
    opts: { allowGoogle?: boolean; force?: boolean } = {},
  ): Promise<ProviderLocationResult[]> => {
    const { data } = await api.post(URLS.PROVIDERS.GEOCODE, { ids, ...opts }, { timeout: 180_000 });
    return data;
  },

  locationStats: async (): Promise<LocationStats> => {
    const { data } = await api.get(URLS.PROVIDERS.LOCATION_STATS);
    return data;
  },

  /**
   * Ids of providers with a missing or weak pin, newest first.
   * 'text' = has an address to geocode; 'name' = worth asking Google Places by name/phone.
   */
  locationCandidates: async (limit = 200, kind: 'text' | 'name' = 'text'): Promise<string[]> => {
    const { data } = await api.get(`${URLS.PROVIDERS.LOCATION_CANDIDATES}?limit=${limit}&kind=${kind}`);
    return data;
  },

  /**
   * Asks Google Places for the business itself (phone first, then name within
   * the city). Misses and look-alikes are left untouched. Up to 50 ids per call.
   */
  pinByName: async (ids: string[]): Promise<ProviderLocationResult[]> => {
    const { data } = await api.post(URLS.PROVIDERS.PIN_BY_NAME, { ids }, { timeout: 180_000 });
    return data;
  },

  /**
   * Fills missing images only: Instagram profile picture, then the website's
   * logo/banner. Nothing is invented; existing images are kept.
   */
  autoImages: async (ids: string[]): Promise<AutoImageResult[]> => {
    const { data } = await api.post(URLS.PROVIDERS.AUTO_IMAGES, { ids }, { timeout: 300_000 });
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
