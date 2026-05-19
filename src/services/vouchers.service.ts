import api from './api';
import { URLS } from '../utils/urls';

export interface VoucherFilters {
  page?: number;
  limit?: number;
  isActive?: string;
  search?: string;
  discountType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerProvider: number | null;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  applicableTo: string[];
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface VoucherRedemption {
  id: string;
  voucherId: string;
  providerId: string;
  paymentId: string;
  discountAmount: number;
  redeemedAt: string;
  provider?: { brandName: string };
}

export interface VoucherStats {
  totalVouchers: number;
  activeVouchers: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

export interface CreateVoucherDto {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxUses?: number;
  maxUsesPerProvider?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableTo?: string[];
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export const vouchersService = {
  list: async (filters: VoucherFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.isActive) params.set('isActive', filters.isActive);
    if (filters.search) params.set('search', filters.search);
    if (filters.discountType) params.set('discountType', filters.discountType);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    const { data } = await api.get(`${URLS.VOUCHERS.LIST}?${params.toString()}`);
    const items = data?.vouchers ?? data?.items ?? data?.data ?? data ?? [];
    return {
      items,
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 25, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 25)) || 1 },
    };
  },

  getById: async (id: string): Promise<Voucher> => {
    const { data } = await api.get(URLS.VOUCHERS.DETAIL(id));
    return data;
  },

  create: async (body: CreateVoucherDto): Promise<Voucher> => {
    const { data } = await api.post(URLS.VOUCHERS.CREATE, body);
    return data;
  },

  update: async (id: string, body: Partial<CreateVoucherDto>): Promise<Voucher> => {
    const { data } = await api.patch(URLS.VOUCHERS.UPDATE(id), body);
    return data;
  },

  getRedemptions: async (id: string): Promise<VoucherRedemption[]> => {
    const { data } = await api.get(URLS.VOUCHERS.REDEMPTIONS(id));
    return data?.redemptions ?? data?.items ?? data ?? [];
  },

  getStats: async (): Promise<VoucherStats> => {
    const { data } = await api.get(URLS.VOUCHERS.STATS);
    return data;
  },
};
