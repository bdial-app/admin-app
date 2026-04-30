import api from './api';
import { URLS } from '../utils/urls';
import type {
  PaginatedResponse,
  NotificationBatch,
  NotificationStats,
  SendNotificationPayload,
  BatchFilters,
} from '../types';

export const notificationsService = {
  send: async (payload: SendNotificationPayload): Promise<NotificationBatch> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.SEND, payload);
    return data;
  },

  getBatches: async (filters: BatchFilters = {}): Promise<PaginatedResponse<NotificationBatch>> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.BATCHES, { params: filters });
    return {
      items: data?.items ?? data?.data ?? [],
      meta: data?.meta ?? {
        total: data?.total ?? 0,
        page: data?.page ?? filters.page ?? 1,
        limit: data?.limit ?? filters.limit ?? 10,
        totalPages: data?.totalPages ?? 1,
      },
    };
  },

  getBatchById: async (id: string): Promise<NotificationBatch> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.BATCH_DETAIL(id));
    return data;
  },

  getStats: async (): Promise<NotificationStats> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.STATS);
    return data;
  },
};
