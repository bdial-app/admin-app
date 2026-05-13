import type { SponsoredType, ApprovalStatus } from './enums';

export interface SponsoredListing {
  id: string;
  providerId: string;
  type: SponsoredType;
  budgetAmount: number;
  spentAmount: number;
  costPerClick: number;
  costPerImpression: number;
  impressions: number;
  clicks: number;
  targetCategoryIds: string[] | null;
  targetCities: string[] | null;
  targetRadius: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: import('./provider').Provider;
}
