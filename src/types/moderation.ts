import type { BulkActionType } from './enums';

export interface ModerationQueueItem {
  type: 'provider' | 'sponsorship' | 'offer' | 'report' | 'verification';
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  createdAt: string;
}

export interface ModerationQueue {
  items: ModerationQueueItem[];
  total: number;
}

export type PhotoType = 'provider' | 'review' | 'product';

export interface PhotoModerationItem {
  /** Stable across pages: `${type}:${rowId}:${index}`. */
  id: string;
  imageUrl: string;
  photoType: PhotoType;
  providerId?: string;
  reviewId?: string;
  brandName?: string;
  productName?: string;
  city?: string | null;
  providerStatus?: string;
  /** Only business gallery photos carry an upload date. */
  uploadedAt?: string | null;
}

export interface PhotoFilterOptions {
  cities: { name: string; count: number }[];
  counts: {
    total: number;
    provider: number;
    review: number;
    product: number;
    uploadedThisWeek: number;
  };
}

export interface BulkActionPayload {
  ids: string[];
  action: BulkActionType;
}
