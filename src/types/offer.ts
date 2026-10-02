import type { DiscountType, ApprovalStatus } from './enums';

/** Body for `POST /admin/offers` — an admin placing a deal on any listing. */
export interface CreateOfferPayload {
  providerId: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  /** ISO timestamps. */
  startsAt: string;
  endsAt: string;
  usageLimit?: number;
  isActive?: boolean;
  approvalStatus?: 'approved' | 'pending_approval';
  adminNotes?: string;
  notifyProvider?: boolean;
}

export interface ProviderOffer {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  usageCount: number;
  usageLimit: number | null;
  createdAt: string;
  updatedAt: string;
  provider?: import('./provider').Provider;
}

/** `GET /admin/offers/filter-options` */
export interface OfferFilterOptions {
  cities: { name: string; count: number }[];
  counts: {
    total: number;
    live: number;
    pending: number;
    ending7d: number;
    expired: number;
    neverUsed: number;
  };
}
