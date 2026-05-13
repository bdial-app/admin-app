import api from './api';
import { URLS } from '../utils/urls';

export interface SubscriptionFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  planId?: string;
  billingInterval?: string;
  dateFrom?: string;
  dateTo?: string;
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

export const subscriptionsService = {
  list: async (filters: SubscriptionFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.planId) params.set('planId', filters.planId);
    if (filters.billingInterval) params.set('billingInterval', filters.billingInterval);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    const { data } = await api.get(`${URLS.SUBSCRIPTIONS.LIST}?${params.toString()}`);
    const items = data?.subscriptions ?? data?.items ?? data?.data ?? data ?? [];
    return {
      items,
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 25, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 25)) || 1 },
    };
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
