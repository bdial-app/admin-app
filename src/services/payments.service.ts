import api from './api';
import { URLS } from '../utils/urls';

export interface PaymentFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  gateway?: string;
}

export interface Payment {
  id: string;
  providerId: string;
  paymentGateway: 'razorpay' | 'apple';
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  type: 'sponsorship' | 'lead_unlock' | 'badge' | 'subscription' | 'deal_unlock' | 'deal_creation';
  metadata: Record<string, unknown> | null;
  voucherId: string | null;
  discountAmount: number;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: { id: string; brandName: string; userId: string };
}

export interface RevenueStats {
  totalRevenue: number;
  totalTransactions: number;
  mrr: number;
  activeSubscriptions: number;
  breakdown: { type: string; count: string; totalRevenue: string }[];
}

export interface RevenueAnalytics {
  overview: {
    totalRevenue: number;
    totalTransactions: number;
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    breakdown: { type: string; count: string; totalRevenue: string }[];
  };
  plans: {
    totalRevenue: number;
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    revenueByPlan: { planName: string; planSlug: string; count: string; revenue: string }[];
    subsByInterval: { interval: string; count: string }[];
    monthlyTrend: { month: string; count: string; revenue: string }[];
    recentTransactions: Payment[];
  };
  deals: {
    totalRevenue: number;
    breakdown: { type: string; count: string; revenue: string }[];
    monthlyTrend: { month: string; type: string; count: string; revenue: string }[];
    topProviders: { brandName: string; providerId: string; count: string; revenue: string }[];
    recentTransactions: Payment[];
  };
}

export const paymentsService = {
  list: async (filters: PaymentFilters = {}) => {
    const { data } = await api.get(URLS.PAYMENTS.LIST, { params: filters });
    const items = data?.payments ?? data?.items ?? data?.data ?? data ?? [];
    return {
      items: items as Payment[],
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 20, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 20)) || 1 },
    };
  },

  getRevenueStats: async (): Promise<RevenueStats> => {
    const { data } = await api.get(URLS.PAYMENTS.REVENUE_STATS);
    return data;
  },

  getRevenueAnalytics: async (): Promise<RevenueAnalytics> => {
    const { data } = await api.get(URLS.PAYMENTS.REVENUE_ANALYTICS);
    return data;
  },
};
