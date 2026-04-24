import type { SponsoredType } from './enums';

export interface SponsoredListing {
  id: string;
  providerId: string;
  type: SponsoredType;
  budgetAmount: number;
  spentAmount: number;
  costPerClick: number;
  impressions: number;
  clicks: number;
  targetCategoryIds: string[] | null;
  targetCities: string[] | null;
  targetRadius: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  provider?: import('./provider').Provider;
}
