import type { DiscountType } from './enums';

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
  usageCount: number;
  usageLimit: number | null;
  createdAt: string;
  updatedAt: string;
  provider?: import('./provider').Provider;
}
