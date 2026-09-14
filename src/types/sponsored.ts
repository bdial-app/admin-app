import type { SponsoredType, ApprovalStatus } from './enums';

export type SponsoredSource = 'provider_paid' | 'admin_granted';
export type SponsoredBillingMode = 'paid' | 'free';

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
  paymentId: string | null;
  // Admin-granted controls
  source: SponsoredSource;
  billingMode: SponsoredBillingMode;
  createdByAdminId: string | null;
  priority: number;
  internalNote: string | null;
  stoppedAt: string | null;
  stoppedBy: string | null;
  stoppedReason: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: import('./provider').Provider;
  /** Returned by POST when the platform kill switch is off */
  warning?: string;
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

/** Provider row from the admin sponsorship picker */
export interface SponsorshipEligibleProvider {
  id: string;
  brandName: string;
  city: string;
  area: string | null;
  status: string;
  profilePhotoUrl: string | null;
  isFeatured: boolean;
  activeSponsorships: { id: string; type: SponsoredType; billingMode: SponsoredBillingMode; endsAt: string }[];
}

export interface AdminCreateSponsorshipPayload {
  providerId: string;
  type: SponsoredType;
  billingMode?: SponsoredBillingMode;
  budgetAmount?: number;
  costPerClick?: number;
  costPerImpression?: number;
  targetCategoryIds?: string[];
  targetCities?: string[];
  targetRadius?: number;
  startsAt: string;
  endsAt: string;
  priority?: number;
  isActive?: boolean;
  approvalStatus?: ApprovalStatus;
  internalNote?: string;
  notifyProvider?: boolean;
  recordPayment?: boolean;
  paymentAmount?: number;
  paymentReference?: string;
}

export interface AdminUpdateSponsorshipPayload {
  type?: SponsoredType;
  billingMode?: SponsoredBillingMode;
  budgetAmount?: number;
  costPerClick?: number;
  costPerImpression?: number;
  targetCategoryIds?: string[];
  targetCities?: string[];
  targetRadius?: number;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  isActive?: boolean;
  approvalStatus?: ApprovalStatus;
  internalNote?: string;
  resetSpend?: boolean;
}

export interface TopUpSponsorshipPayload {
  amount: number;
  recordPayment?: boolean;
  paymentReference?: string;
  extendDays?: number;
}

export type BulkSponsorshipAction = 'stop' | 'resume' | 'approve' | 'reject' | 'delete';

export interface BulkSponsorshipResult {
  action: BulkSponsorshipAction;
  total: number;
  succeeded: number;
  failed: number;
  results: { id: string; ok: boolean; error?: string }[];
}

export interface StopAllSponsorshipsResult {
  stopped: number;
  featureFlagDisabled: boolean;
  reason: string | null;
}
