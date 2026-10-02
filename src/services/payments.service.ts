import api from './api';
import { URLS } from '../utils/urls';

export type PaymentSort = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

export interface PaymentFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  gateway?: string;
  amountMin?: string | number;
  amountMax?: string | number;
  hasVoucher?: string;
  city?: string;
  providerId?: string;
  sort?: PaymentSort;
}

export interface PaymentFilterOptions {
  cities: { name: string; count: number }[];
  gateways: { value: string; count: number }[];
  counts: {
    total: number;
    succeeded: number;
    failed: number;
    refunded: number;
    today: number;
    thisMonth: number;
    withVoucher: number;
  };
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

// ── Revenue report (GET /admin/payments/revenue) ─────────

export type RevenueGranularity = 'day' | 'week' | 'month';

export interface RevenueParams {
  /** YYYY-MM-DD, IST calendar days; the API defaults to the last 30 days. */
  from?: string;
  to?: string;
  granularity?: RevenueGranularity;
  /** Comma-separated payment types. */
  types?: string;
  gateway?: string;
  city?: string;
  planId?: string;
  /** 'true' adds `previous` for the period of equal length before `from`. */
  compare?: 'true';
}

/** The API sends real numbers; pages still coerce with Number() so a stringified aggregate can't break a chart. */
type Num = number | string;

export interface RevenueReport {
  range: { from: string; to: string; granularity: RevenueGranularity };
  /** `mrr` and `activeSubscriptions` are point-in-time and ignore the filters. */
  totals: { revenue: Num; transactions: Num; avgOrder: Num; refunds: Num; mrr: Num; activeSubscriptions: Num };
  /** Only with `compare=true`: the period of equal length ending the day before `range.from`. */
  previous?: { from: string; to: string; revenue: Num; transactions: Num; refunds: Num };
  /** Zero-filled; `bucket` is the IST bucket start (weeks start on Monday). */
  series: { bucket: string; revenue: Num; transactions: Num; byType: Record<string, Num> }[];
  byType: { type: string; count: Num; revenue: Num }[];
  byGateway: { gateway: string; count: Num; revenue: Num }[];
  byCity: { city: string; count: Num; revenue: Num }[];
  byPlan: { planId: string; planName: string; count: Num; revenue: Num }[];
  topProviders: { providerId: string; brandName: string; count: Num; revenue: Num }[];
}

/** Query string with only the params that carry a value, so the API's DTO never sees empty keys. */
const compact = (filters: object) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params.toString();
};

export const paymentsService = {
  list: async (filters: PaymentFilters = {}) => {
    const { data } = await api.get(`${URLS.PAYMENTS.LIST}?${compact(filters)}`);
    const items = data?.items ?? data?.payments ?? data?.data ?? [];
    return {
      items: (Array.isArray(items) ? items : []) as Payment[],
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 20, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 20)) || 1 },
    };
  },

  filterOptions: async (): Promise<PaymentFilterOptions> => {
    const { data } = await api.get(URLS.PAYMENTS.FILTER_OPTIONS);
    return data;
  },

  getRevenue: async (params: RevenueParams = {}): Promise<RevenueReport> => {
    const { data } = await api.get(`${URLS.PAYMENTS.REVENUE}?${compact(params)}`);
    return data;
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
