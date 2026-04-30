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
  id: string;
  imageUrl: string;
  photoType: PhotoType;
  providerId?: string;
  reviewId?: string;
  brandName?: string;
  productName?: string;
  uploadedAt?: string;
}

export interface BulkActionPayload {
  ids: string[];
  action: BulkActionType;
}
