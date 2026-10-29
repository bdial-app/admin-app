import api from './api';
import { URLS } from '../utils/urls';
import type { AdminLead, AdminLeadDetail, LeadInteraction, LeadPeriod, LeadsOverview, PaginatedResponse } from '../types';

/** Query params for GET /admin/leads. */
export interface LeadFilters {
  page?: number;
  limit?: number;
  period?: LeadPeriod;
  search?: string;
  providerId?: string;
  tier?: string;
  status?: string;
  method?: string;
  checked?: string;
  source?: string;
  sort?: string;
}

/** Query params for GET /admin/leads/interactions. */
export interface InteractionFilters {
  page?: number;
  limit?: number;
  period?: LeadPeriod;
  search?: string;
  providerId?: string;
  eventType?: string;
  registered?: string;
}

/** Drop empty values so the backend's whitelist only ever sees real filters. */
const compact = <T extends object>(filters: T) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const leadsService = {
  overview: async (period: LeadPeriod): Promise<LeadsOverview> => {
    const { data } = await api.get(URLS.LEADS.OVERVIEW, { params: { period } });
    return data;
  },

  list: async (filters: LeadFilters): Promise<PaginatedResponse<AdminLead>> => {
    const { data } = await api.get(URLS.LEADS.LIST, { params: compact(filters) });
    return data;
  },

  detail: async (id: string): Promise<AdminLeadDetail> => {
    const { data } = await api.get(URLS.LEADS.DETAIL(id));
    return data;
  },

  interactions: async (filters: InteractionFilters): Promise<PaginatedResponse<LeadInteraction>> => {
    const { data } = await api.get(URLS.LEADS.INTERACTIONS, { params: compact(filters) });
    return data;
  },

  rescore: async (providerId?: string): Promise<{ businesses: number; failed: number }> => {
    const { data } = await api.post(URLS.LEADS.RESCORE, providerId ? { providerId } : {});
    return data;
  },
};
