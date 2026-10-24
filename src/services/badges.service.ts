import api from './api';
import type { BadgesOverview, BadgeRunSummary, BusinessBadges, PaginatedResponse, ProviderBadge } from '../types';

export interface BadgeFilters {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
  /** "removed" lists badges taken away or ended; otherwise current holders. */
  status?: 'current' | 'removed';
}

export interface AwardBadgeBody {
  providerId: string;
  type: 'tijarah_pick';
  reason: string;
  expiresAt?: string | null;
}

export const badgesService = {
  overview: async (): Promise<BadgesOverview> => (await api.get('/admin/badges/overview')).data,

  list: async (f: BadgeFilters): Promise<PaginatedResponse<ProviderBadge>> =>
    (await api.get('/admin/badges', { params: { ...f, status: f.status === 'removed' ? 'removed' : undefined } })).data,

  forBusiness: async (providerId: string): Promise<BusinessBadges> =>
    (await api.get(`/admin/badges/business/${providerId}`)).data,

  award: async (body: AwardBadgeBody): Promise<ProviderBadge> => (await api.post('/admin/badges', body)).data,

  revoke: async (id: string): Promise<{ ok: boolean }> => (await api.delete(`/admin/badges/${id}`)).data,

  recalculate: async (): Promise<BadgeRunSummary | { skipped: true }> =>
    (await api.post('/admin/badges/recalculate')).data,
};
