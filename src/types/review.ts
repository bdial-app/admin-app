import type { ReviewStatus } from './enums';

/** A review as GET /admin/reviews returns it. */
export interface Review {
  id: string;
  providerId: string;
  reviewerId: string | null;
  starRating: number;
  reviewText: string | null;
  status: ReviewStatus;
  postedAt: string;
  replyText: string | null;
  repliedAt: string | null;
  moderatedAt: string | null;
  moderatorName?: string | null;
  /** Written in the app, from the owner's review link, or recorded by an admin. */
  source?: ReviewSource;
  photoCount?: number;
  /** Up to four, for thumbnails. */
  photoUrls?: string[];
  /** Open reports, from either report table. */
  reportCount?: number;
  /** The reviewer's chat with this business, if they ever had one. */
  conversationId?: string | null;
  reviewerReviewCount?: number;
  reviewer?: {
    id: string;
    name: string | null;
    mobileNumber: string | null;
    city: string | null;
    status: string | null;
  } | null;
  provider?: {
    id: string;
    brandName: string;
    slug: string | null;
    city: string | null;
    area: string | null;
    profilePhotoUrl: string | null;
    status: string;
    userId: string | null;
    combinedRating: number | null;
    combinedReviewCount: number | null;
    deleted?: boolean;
  };
}

export type ReviewSource = 'app' | 'link' | 'admin';

/** GET /admin/reviews/:id — the review with everything around it. */
export interface ReviewDetail extends Review {
  photos: { id: string; imageUrl: string }[];
  reports: {
    id: string;
    kind: 'review_report' | 'report';
    reason: string | null;
    description: string | null;
    status: string;
    at: string;
    reporterName: string | null;
  }[];
  lead: { id: string; tier: import('./enums').LeadTier; score: number; isUnlocked: boolean } | null;
  reviewerOtherReviews: { id: string; starRating: number; status: ReviewStatus; postedAt: string; providerId: string; brandName: string }[];
  business: {
    activeReviews: number;
    totalReviews: number;
    avgRating: number | null;
    distribution: { stars: number; count: number }[];
    owner: { id: string; name: string | null; mobileNumber: string | null } | null;
    contactNumber: string | null;
    googleRating: number | null;
    googleReviewCount: number | null;
  };
  history: { id: string; action: string; description: string | null; at: string; adminName: string | null }[];
}

export interface ReviewFilterOptions {
  cities: { name: string; count: number }[];
  counts: {
    total: number; active: number; removed: number; flagged: number; low: number;
    last7d: number; last30d: number; withPhotos: number; unreplied: number; reported: number; fromLink: number;
  };
  stats: {
    avgRating: number | null;
    avgRating30d: number | null;
    replyRate: number | null;
    businessesReviewed: number;
    distribution: { stars: number; count: number }[];
  };
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

/** Query params for GET /admin/reviews. Toggles travel as 'true' | 'false'. */
export interface ReviewFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReviewStatus | '';
  providerId?: string;
  reviewerId?: string;
  minRating?: number | string;
  maxRating?: number | string;
  postedFrom?: string;
  postedTo?: string;
  hasPhotos?: string;
  hasReply?: string;
  hasText?: string;
  reported?: string;
  source?: ReviewSource | '';
  city?: string;
  sort?: 'recent' | 'oldest' | 'lowest' | 'highest' | '';
}
