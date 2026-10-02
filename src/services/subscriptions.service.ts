import api from './api';
import { URLS } from '../utils/urls';

export type SubscriptionSort = 'newest' | 'period_end_asc' | 'period_end_desc';

export interface SubscriptionFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  planId?: string;
  billingInterval?: string;
  dateFrom?: string;
  dateTo?: string;
  gateway?: string;
  renewingWithinDays?: string | number;
  cancelAtPeriodEnd?: string;
  periodEndFrom?: string;
  periodEndTo?: string;
  city?: string;
  sort?: SubscriptionSort;
}

export interface SubscriptionFilterOptions {
  cities: { name: string; count: number }[];
  plans: { id: string; name: string; count: number }[];
  counts: {
    total: number;
    active: number;
    trialing: number;
    pastDue: number;
    cancelling: number;
    renews7d: number;
    apple: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  razorpayPlanIdMonthly: string | null;
  razorpayPlanIdYearly: string | null;
  appleProductIdMonthly: string | null;
  appleProductIdYearly: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, unknown>;
  maxActiveDeals: number;
  maxTotalDeals: number;
  monthlyLeadUnlocks: number;
  sponsorshipTypes: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  providerId: string;
  planId: string;
  paymentGateway: 'razorpay' | 'apple';
  gatewaySubscriptionId: string | null;
  gatewayCustomerId: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  billingInterval: 'monthly' | 'yearly';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  leadUnlocksUsed: number;
  leadUnlocksResetAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: { brandName: string };
  plan?: SubscriptionPlan;
}

export interface SubscriptionStats {
  total: number;
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  paused: number;
  cancelingCount: number;
  byPlan: { planName: string; planId: string; status: string; count: string }[];
  byInterval: { interval: string; count: string }[];
}

/** Query string with only the params that carry a value, so the API's DTO never sees empty keys. */
const compact = (filters: object) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params.toString();
};

export const subscriptionsService = {
  list: async (filters: SubscriptionFilters = {}) => {
    const { data } = await api.get(`${URLS.SUBSCRIPTIONS.LIST}?${compact(filters)}`);
    const items = data?.items ?? data?.subscriptions ?? data?.data ?? [];
    return {
      items: (Array.isArray(items) ? items : []) as Subscription[],
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 25, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 25)) || 1 },
    };
  },

  filterOptions: async (): Promise<SubscriptionFilterOptions> => {
    const { data } = await api.get(URLS.SUBSCRIPTIONS.FILTER_OPTIONS);
    return data;
  },

  getStats: async (): Promise<SubscriptionStats> => {
    const { data } = await api.get(URLS.SUBSCRIPTIONS.STATS);
    return data;
  },

  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const { data } = await api.get(URLS.SUBSCRIPTIONS.PLANS);
    return Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
  },

  createPlan: async (body: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const { data } = await api.post(URLS.SUBSCRIPTIONS.PLANS, body);
    return data;
  },

  updatePlan: async (id: string, body: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const { data } = await api.patch(URLS.SUBSCRIPTIONS.UPDATE_PLAN(id), body);
    return data;
  },
};
