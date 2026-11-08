import type { AnalyticsEventType, AnalyticsSource, LeadTier } from './enums';

export interface ProviderAnalyticsEvent {
  id: string;
  providerId: string;
  userId: string | null;
  sessionId: string;
  eventType: AnalyticsEventType;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  duration: number | null;
  source: AnalyticsSource | null;
  createdAt: string;
}

export interface ProviderLead {
  id: string;
  providerId: string;
  userId: string | null;
  sessionId: string;
  visitorKey: string;
  tier: LeadTier;
  score: number;
  source: AnalyticsSource | null;
  searchQuery: string | null;
  productsViewed: string[];
  actionsPerformed: string[];
  totalDuration: number;
  firstSeenAt: string;
  lastSeenAt: string;
  isUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  pendingProviders: number;
  totalProviders: number;
  totalUsers: number;
  pendingVerifications: number;
  flaggedReviews: number;
  openReports: number;
  totalProducts: number;
  totalReviews: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  newProvidersThisWeek: number;
  totalSearches: number;
  totalLeads: number;
  totalConversations: number;
  totalInvites: number;
  activeOffers: number;
  activeSponsorships: number;
  activeBanners: number;
  pendingSponsorships: number;
  pendingOffers: number;
  // Extended
  totalRevenue: number;
  revenueThisMonth: number;
  totalPayments: number;
  activeSubscriptions: number;
  leadBreakdown: { hot: number; warm: number; cold: number };
  adImpressions: number;
  adClicks: number;
  adCtr: number;
  womenLedPending: number;
  topCities: { city: string; count: number }[];
  totalMessages: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

/** Everything the dashboard counts over a period: rows created in the range. */
export interface DashboardPeriodTotals {
  newUsers: number;
  /** New accounts that signed in themselves (not imported, not staff). */
  signedInUsers: number;
  newProviders: number;
  newProducts: number;
  reviews: number;
  searches: number;
  leads: number;
  conversations: number;
  messages: number;
  invites: number;
  reports: number;
  revenue: number;
  payments: number;
  adImpressions: number;
  adClicks: number;
  notificationsSent: number;
  notificationsRead: number;
  batchesSent: number;
}

export type DashboardGranularity = 'day' | 'week' | 'month';

export interface DashboardSeriesPoint {
  /** First day of the bucket, YYYY-MM-DD (IST). */
  bucket: string;
  users: number;
  providers: number;
  searches: number;
  reports: number;
  leads: number;
  conversations: number;
}

/** GET /admin/dashboard/period. Dates are IST calendar days, inclusive. */
export interface DashboardPeriod {
  range: { from: string; to: string; days: number; granularity: DashboardGranularity; allTime: boolean };
  totals: DashboardPeriodTotals;
  /** The period of equal length just before, when asked to compare. */
  previous: { from: string; to: string; totals: DashboardPeriodTotals } | null;
  leadBreakdown: { hot: number; warm: number; cold: number };
  topCities: { city: string; count: number }[];
  series: DashboardSeriesPoint[];
}

export interface AnalyticsOverview {
  totalEvents: number;
  eventsThisWeek: number;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  totalSearches: number;
  searchesThisWeek: number;
  adImpressions: number;
  adClicks: number;
  adCtr: number;
  totalInvites: number;
  eventBreakdown: { eventType: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  leadTierDistribution: { tier: string; count: number }[];
}

export interface SearchTrends {
  topQueries: { query: string; count: number; avgResults: number }[];
  zeroResultQueries: { query: string; count: number }[];
  searchVolumeByDay: TimeSeriesPoint[];
  topCities: { city: string; count: number }[];
}

/**
 * Category coverage. Each business is counted once, under one primary category,
 * so `primary` sums to the number of businesses. `listed` counts every business
 * linked to a category, which is what a customer browsing it would find.
 */
export interface CategoryStats {
  totals: {
    categories: number;
    active: number;
    topLevel: number;
    subcategories: number;
    inUse: number;
    empty: number;
    liveBusinesses: number;
    businessesListed: number;
    uncategorised: number;
    /** Businesses that chose more than one category; only their primary is counted. */
    multiCategory: number;
    avgCategoriesPerBusiness: number;
  };
  /** Parents with their subcategories rolled in, each business counted once. */
  topLevel: { id: string; name: string; primary: number; listed: number }[];
  categories: {
    id: string;
    name: string;
    parentId: string | null;
    parentName: string | null;
    isActive: boolean;
    /** Businesses whose primary category is this one — these sum to the total. */
    primary: number;
    /** Businesses a customer finds when browsing it, primary or not. */
    listed: number;
  }[];
}

export interface GeographicStats {
  usersByCity: { city: string; count: number }[];
  providersByCity: { city: string; count: number }[];
  searchesByCity: { city: string; count: number }[];
}
