import type { BadgeType, BadgeSource } from './enums';

/** A badge a business holds (or held). */
export interface ProviderBadge {
  id: string;
  providerId: string;
  type: BadgeType;
  source: BadgeSource;
  /** Why the team gave it (curated). */
  reason: string | null;
  awardedBy: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  provider?: {
    id: string;
    brandName: string;
    slug?: string;
    city?: string | null;
    area?: string | null;
    profilePhotoUrl?: string | null;
    status?: string;
  };
}

/** A badge and its rule, with how many businesses hold it now. */
export interface BadgeDefinition {
  key: BadgeType;
  label: string;
  kind: 'automatic' | 'curated';
  meaning: string;
  rule: string;
  holders: number;
}

export interface BadgeRunSummary {
  at: string;
  ms: number;
  holders: Record<string, number>;
  added: Record<string, number>;
  removed: Record<string, number>;
}

export interface BadgesOverview {
  badges: BadgeDefinition[];
  lastRun: BadgeRunSummary | null;
}

/** One business: every badge, held or not, with where it stands. */
export interface BusinessBadges {
  badges: Array<{
    key: BadgeType;
    label: string;
    kind: 'automatic' | 'curated';
    meaning: string;
    rule: string;
    held: boolean;
    since: string | null;
    expiresAt: string | null;
    progress: string | null;
    /** False when it can no longer be earned (Rising Star after 90 days). */
    possible: boolean;
  }>;
  history: ProviderBadge[];
}
