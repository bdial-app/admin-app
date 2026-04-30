import type { BadgeType, BadgeSource } from './enums';

export interface ProviderBadge {
  id: string;
  providerId: string;
  type: BadgeType;
  source: BadgeSource;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  provider?: import('./provider').Provider;
}
