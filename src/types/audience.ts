export interface AudienceLive {
  onlineNow: number;
  active15m: number;
  active1h: number;
  active24h: number;
  visitors1h: number;
  asOf: string;
}

export interface AudienceDay {
  day: string;
  users: number;
  visitors: number;
  peak15: number;
  signups: number;
}

export interface AudienceOverview {
  days: number;
  summary: {
    activeUsers: number;
    visitors: number;
    avgDailyUsers: number;
    avgDailyVisitors: number;
    dau: number;
    wau: number;
    mau: number;
    stickiness: number | null;
    peakConcurrent: number;
    peakConcurrentAt: string | null;
    avgConcurrent: number;
    newUsers: number;
    activationRate: number | null;
    returningShare: number | null;
    totalUsers: number;
    unclaimedAccounts: number;
  };
  daily: AudienceDay[];
  heatmap: { dow: number; hour: number; avgActive: number }[];
}

export interface RetentionCell {
  users: number;
  rate: number | null;
}

export interface AudienceRetention {
  weeks: number;
  cohorts: { cohort: string; size: number; weeks: (RetentionCell | null)[] }[];
}

export interface AudienceReach {
  days: number;
  cities: { city: string; users: number }[];
  customers: number;
  businessOwners: number;
  platforms: { platform: string; pushReachable: number; activeInPeriod: number }[];
}

export interface AudienceAds {
  days: number;
  totals: {
    impressions: number;
    clicks: number;
    ctr: number | null;
    reachedUsers: number;
    anonymousImpressions: number;
    frequency: number | null;
    clickers: number;
    avgDailyImpressions: number;
  };
  placements: {
    placement: string;
    impressions: number;
    clicks: number;
    ctr: number | null;
    reachedUsers: number;
    avgDailyImpressions: number;
  }[];
  daily: { day: string; impressions: number; clicks: number }[];
  topAds: { placement: string; id: string; name: string; impressions: number; clicks: number; ctr: number | null }[];
  funnel: {
    searchAppearances: number;
    searchClicks: number;
    profileViews: number;
    productViews: number;
    contacts: number;
    chats: number;
    calls: number;
    directions: number;
    saves: number;
    shares: number;
    contactsPer100Views: number | null;
    peopleWhoContacted: number;
    businessesContacted: number;
  };
}
