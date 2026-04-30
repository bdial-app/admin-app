import api from './api';
import { URLS } from '../utils/urls';

export interface SubscriptionFilters {
  page?: number;
  limit?: number;
  status?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, unknown>;
  maxActiveDeals: number;
  maxTotalDeals: number;
  monthlyLeadUnlocks: number;
  sponsorshipTypes: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  providerId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  billingInterval: 'monthly' | 'yearly';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  provider?: { brandName: string };
  plan?: SubscriptionPlan;
}

export const subscriptionsService = {
  list: async (filters: SubscriptionFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    const { data } = await api.get(`${URLS.SUBSCRIPTIONS.LIST}?${params.toString()}`);
    const items = data?.subscriptions ?? data?.items ?? data?.data ?? data ?? [];
    return {
      items,
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 10, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 10)) || 1 },
    };
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
