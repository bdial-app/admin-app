import type { ReviewStatus } from './enums';

export interface Review {
  id: string;
  providerId: string;
  reviewerId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt: string | null;
  moderatedBy: string | null;
  replyText: string | null;
  repliedAt: string | null;
  // Relations
  provider?: import('./provider').Provider;
  reviewer?: import('./user').User;
  moderator?: import('./user').User;
  photos?: ReviewPhoto[];
  reports?: ReviewReport[];
}

export interface ReviewPhoto {
  id: string;
  reviewId: string;
  imageUrl: string;
  storageKey: string;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: string | null;
  status: import('./enums').ReviewReportStatus;
  reportedAt: string;
  review?: Review;
  reporter?: import('./user').User;
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  status?: ReviewStatus | '';
  providerId?: string;
  minRating?: number;
  maxRating?: number;
}
