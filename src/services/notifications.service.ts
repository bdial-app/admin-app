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
  CreateTemplatePayload,
  CreateCampaignPayload,
  PushAudience,
  PushAudienceOptions,
  PushAudiencePreview,
  PushKind,
  PushMessage,
  PushTestResult,
  PushTestTarget,
  TemplateStat,
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

  createTemplate: async (payload: CreateTemplatePayload): Promise<NotificationTemplate> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.TEMPLATES, payload);
    return data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(URLS.NOTIFICATIONS.TEMPLATE_DETAIL(id));
  },

  resetTemplate: async (id: string): Promise<NotificationTemplate> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.TEMPLATE_RESET(id));
    return data;
  },

  testTemplate: async (
    id: string,
    payload: PushTestTarget & { variables?: Record<string, string> },
  ): Promise<PushTestResult> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.TEMPLATE_TEST(id), payload);
    return data;
  },

  getTemplateStats: async (days = 30): Promise<TemplateStat[]> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.TEMPLATE_STATS, { params: { days } });
    return data;
  },

  // ── Push campaigns ───────────────────────────────────────

  getAudienceOptions: async (): Promise<PushAudienceOptions> => {
    const { data } = await api.get(URLS.NOTIFICATIONS.AUDIENCE_OPTIONS);
    return data;
  },

  previewAudience: async (audience: PushAudience, type: PushKind): Promise<PushAudiencePreview> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.AUDIENCE_PREVIEW, { audience, type });
    return data;
  },

  createCampaign: async (
    payload: CreateCampaignPayload,
  ): Promise<{ id: string; status: string; scheduledAt: string | null }> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.CAMPAIGNS, payload);
    return data;
  },

  cancelCampaign: async (id: string): Promise<void> => {
    await api.delete(URLS.NOTIFICATIONS.BATCH_DETAIL(id));
  },

  sendTest: async (payload: PushMessage & PushTestTarget): Promise<PushTestResult> => {
    const { data } = await api.post(URLS.NOTIFICATIONS.TEST, payload);
    return data;
  },
};
