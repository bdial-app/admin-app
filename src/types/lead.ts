import type { LeadTier } from './enums';

export type LeadPeriod = '7d' | '30d' | '90d' | 'all';
/** 'unknown' = unlocked before the method was recorded. */
export type LeadUnlockMethod = 'anonymous' | 'free' | 'plan' | 'quota' | 'paid' | 'unknown';

export interface LeadBusiness {
  id: string;
  brandName: string;
  city: string | null;
  slug: string | null;
  photoUrl: string | null;
}

export interface LeadsOverview {
  period: LeadPeriod;
  /** interested: signed-in customers who acted on a business (pairs); the rest count scored leads. */
  funnel: { interested: number; leads: number; checked: number; unlocked: number; paid: number; hotLocked: number };
  /** neverOpened: businesses with interested customers that have never opened their leads screen. */
  demand: { businesses: number; neverOpened: number };
  revenue: { amount: number; payments: number; payers: number; pending: number; failed: number };
  methods: { method: LeadUnlockMethod; count: number }[];
  tiers: { tier: LeadTier; leads: number; checked: number; unlocked: number; paid: number }[];
  sources: { source: string; leads: number; unlocked: number }[];
  interactions: { eventType: string; events: number; customers: number; businesses: number }[];
  topBusinesses: (LeadBusiness & {
    interested: number; leads: number; hot: number; checked: number; unlocked: number; paid: number;
    lastCheckedAt: string | null; revenue: number;
  })[];
  daily: { date: string; interactions: number; customers: number; checked: number; unlocked: number; paid: number; revenue: number }[];
}

export interface AdminLead {
  id: string;
  tier: LeadTier;
  score: number;
  source: string | null;
  searchQuery: string | null;
  actionsPerformed: string[];
  productsViewedCount: number;
  totalDuration: number;
  firstSeenAt: string;
  lastSeenAt: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  unlockMethod: LeadUnlockMethod | null;
  payment: { id: string; amount: number | null; status: string; bulk: boolean } | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  conversationId: string | null;
  provider: LeadBusiness;
  customer: { id: string; name: string; mobileNumber: string | null; email: string | null; city: string | null } | null;
}

export interface LeadTimelineEvent {
  id: string;
  eventType: string;
  source: string | null;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  entityId: string | null;
  createdAt: string;
  productName: string | null;
}

export interface AdminLeadDetail extends AdminLead {
  timeline: LeadTimelineEvent[];
  products: { id: string; name: string }[];
}

export interface LeadInteraction {
  id: string;
  eventType: string;
  source: string | null;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  providerId: string;
  brandName: string;
  providerCity: string | null;
  userId: string | null;
  userName: string | null;
  userMobile: string | null;
  productName: string | null;
  leadId: string | null;
  leadTier: LeadTier | null;
  leadUnlocked: boolean | null;
}
