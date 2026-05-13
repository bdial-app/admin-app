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

export interface SponsorshipDailyData {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface SponsorshipAnalytics {
  daily: SponsorshipDailyData[];
  totals: {
    impressions: number;
    clicks: number;
    spend: number;
    avgDailyImpressions: number;
    avgDailyClicks: number;
  };
  projectedDaysLeft: number | null;
  period: number;
}
