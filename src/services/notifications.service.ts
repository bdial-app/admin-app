import api from './api';
import { URLS } from '../utils/urls';
import type {
  PaginatedResponse,
  NotificationBatch,
  NotificationStats,
  SendNotificationPayload,
  BatchFilters,
  NotificationTemplate,
  UpdateTemplatePayload,
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

  // ── Template Management ──────────────────────────────────

  getTemplates: async (category?: string): Promise<NotificationTemplate[]> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.TEMPLATES, {
      params: category ? { category } : undefined,
    });
    return data;
  },

  getTemplate: async (id: string): Promise<NotificationTemplate> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.TEMPLATE_DETAIL(id));
    return data;
  },

  updateTemplate: async (id: string, payload: UpdateTemplatePayload): Promise<NotificationTemplate> => {
    const { data } = await api.put(URLS.NOTIFICATIONS.TEMPLATE_DETAIL(id), payload);
    return data;
  },

  toggleTemplate: async (id: string, isActive: boolean): Promise<NotificationTemplate> => {
    const { data } = await api.patch(URLS.NOTIFICATIONS.TEMPLATE_TOGGLE(id), { isActive });
    return data;
  },
};
