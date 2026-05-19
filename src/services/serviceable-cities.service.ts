import api from './api';
import { URLS } from '../utils/urls';

export interface ServiceableCity {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'coming_soon' | 'disabled';
  launchDate: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
  createdAt: string;
  updatedAt: string;
  requestCount?: number;
  lastRequestAt?: string | null;
}

export interface CityRequestStat {
  city: string;
  count: number;
  lastRequestAt: string;
}

export interface CityRequestInsights {
  platformStats: { platform: string; count: number }[];
  deviceTypeStats: { deviceType: string; count: number }[];
  recentRequests: {
    id: string;
    city: string;
    platform: string | null;
    deviceType: string | null;
    osVersion: string | null;
    appVersion: string | null;
    lat: number | null;
    lng: number | null;
    createdAt: string;
  }[];
}

export const serviceableCitiesService = {
  list: async (): Promise<ServiceableCity[]> => {
    const { data } = await api.get(URLS.SERVICEABLE_CITIES.LIST);
    return data;
  },

  updateStatus: async (id: string, status: 'active' | 'coming_soon' | 'disabled'): Promise<ServiceableCity> => {
    const { data } = await api.patch(URLS.SERVICEABLE_CITIES.UPDATE(id), { status });
    return data;
  },

  getRequestStats: async (): Promise<CityRequestStat[]> => {
    const { data } = await api.get(URLS.SERVICEABLE_CITIES.REQUEST_STATS);
    return data;
  },

  getRequestInsights: async (): Promise<CityRequestInsights> => {
    const { data } = await api.get(URLS.SERVICEABLE_CITIES.REQUEST_INSIGHTS);
    return data;
  },
};
