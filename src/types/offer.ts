import type { DiscountType, ApprovalStatus } from './enums';

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
