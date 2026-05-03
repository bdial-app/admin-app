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

export interface DashboardTimeSeries {
  userGrowth: TimeSeriesPoint[];
  providerGrowth: TimeSeriesPoint[];
  searchVolume: TimeSeriesPoint[];
  reportVolume: TimeSeriesPoint[];
  leadVolume: TimeSeriesPoint[];
  conversationVolume: TimeSeriesPoint[];
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

export interface GeographicStats {
  usersByCity: { city: string; count: number }[];
  providersByCity: { city: string; count: number }[];
  searchesByCity: { city: string; count: number }[];
}
