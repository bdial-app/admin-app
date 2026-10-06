import api from './api';
import { URLS } from '../utils/urls';
import type {
  PaginatedResponse,
  WaSettings,
  WaSettingsUpdate,
  WaSettingsTestSendPayload,
  WaOverview,
  WaTemplate,
  WaTemplateFilters,
  WaTemplatePayload,
  WaTemplateComponent,
  WaRenderedTemplate,
  WaAudiencePreview,
  WaAudiencePreviewPayload,
  WaAudienceOptions,
  WaRecipientsPayload,
  WaRecipientRow,
  WaCustomerHit,
  WaContact,
  WaContactFilters,
  WaContactUpdate,
  WaSegment,
  WaSegmentPayload,
  WaCampaign,
  WaCampaignSummary,
  WaCampaignFilters,
  WaCampaignPayload,
  WaMessageRow,
  WaCampaignMessageFilters,
  WaConversation,
  WaConversationFilters,
  WaThread,
  WaMessage,
  WaReplyPayload,
  WaProviderInfo,
} from '../types';

const U = URLS.WHATSAPP;

/** Normalise `{ items, meta }` so pages never guess at the envelope. */
function paginated<T>(data: unknown, fallback: { page?: number; limit?: number }): PaginatedResponse<T> {
  const d = (data ?? {}) as { items?: T[]; meta?: PaginatedResponse<T>['meta']; total?: number };
  const items = d.items ?? [];
  return {
    items,
    meta: d.meta ?? {
      total: d.total ?? items.length,
      page: fallback.page ?? 1,
      limit: fallback.limit ?? items.length,
      totalPages: 1,
    },
  };
}

export const whatsappService = {
  // ── Settings ──────────────────────────────────────────
  getSettings: async (): Promise<WaSettings> => {
    const { data } = await api.get(U.SETTINGS);
    return data;
  },
  updateSettings: async (payload: WaSettingsUpdate): Promise<WaSettings> => {
    const { data } = await api.put(U.SETTINGS, payload);
    return data;
  },
  refreshPhoneMeta: async (): Promise<WaSettings> => {
    const { data } = await api.post(U.SETTINGS_REFRESH);
    return data;
  },
  settingsTestSend: async (payload: WaSettingsTestSendPayload): Promise<{ waMessageId: string; messageId: string }> => {
    const { data } = await api.post(U.SETTINGS_TEST_SEND, payload);
    return data;
  },

  // ── Overview ──────────────────────────────────────────
  getOverview: async (days = 30): Promise<WaOverview> => {
    const { data } = await api.get(U.OVERVIEW, { params: { days } });
    return data;
  },

  // ── Templates ─────────────────────────────────────────
  getTemplates: async (filters: WaTemplateFilters = {}): Promise<WaTemplate[]> => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get(U.TEMPLATES, { params });
    return data?.items ?? [];
  },
  getTemplate: async (id: string): Promise<WaTemplate> => {
    const { data } = await api.get(U.TEMPLATE(id));
    return data;
  },
  createTemplate: async (payload: WaTemplatePayload): Promise<WaTemplate> => {
    const { data } = await api.post(U.TEMPLATES, payload);
    return data;
  },
  updateTemplate: async (id: string, payload: WaTemplatePayload): Promise<WaTemplate> => {
    const { data } = await api.put(U.TEMPLATE(id), payload);
    return data;
  },
  submitTemplate: async (id: string): Promise<WaTemplate> => {
    const { data } = await api.post(U.TEMPLATE_SUBMIT(id));
    return data;
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(U.TEMPLATE(id));
  },
  syncTemplates: async (): Promise<{ synced: number; created: number; updated: number }> => {
    const { data } = await api.post(U.TEMPLATES_SYNC);
    return data;
  },
  seedTemplates: async (): Promise<{ created: number }> => {
    const { data } = await api.post(U.TEMPLATES_SEED);
    return data;
  },
  previewTemplate: async (
    payload: { templateId?: string; components?: WaTemplateComponent[]; variables: Record<string, string> },
  ): Promise<WaRenderedTemplate> => {
    const { data } = await api.post(U.TEMPLATES_PREVIEW, payload);
    return data;
  },

  // ── Audience ──────────────────────────────────────────
  previewAudience: async (payload: WaAudiencePreviewPayload): Promise<WaAudiencePreview> => {
    const { data } = await api.post(U.AUDIENCE_PREVIEW, payload);
    return data;
  },
  getAudienceOptions: async (): Promise<WaAudienceOptions> => {
    const { data } = await api.get(U.AUDIENCE_OPTIONS);
    return {
      cities: data?.cities ?? [],
      categories: data?.categories ?? [],
      areas: data?.areas ?? [],
      campaigns: data?.campaigns ?? [],
      tags: data?.tags ?? [],
    };
  },
  getAudienceRecipients: async (payload: WaRecipientsPayload): Promise<PaginatedResponse<WaRecipientRow>> => {
    const { data } = await api.post(U.AUDIENCE_RECIPIENTS, payload);
    return paginated<WaRecipientRow>(data, payload);
  },
  searchCustomers: async (search: string): Promise<WaCustomerHit[]> => {
    const { data } = await api.get(U.AUDIENCE_CUSTOMERS, { params: { search } });
    return data ?? [];
  },
  getContacts: async (filters: WaContactFilters = {}): Promise<PaginatedResponse<WaContact>> => {
    const params: Record<string, string | number | boolean> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.consent) params.consent = filters.consent;
    if (filters.city) params.city = filters.city;
    if (filters.hasProvider !== undefined) params.hasProvider = filters.hasProvider;
    if (filters.tag) params.tag = filters.tag;
    const { data } = await api.get(U.CONTACTS, { params });
    return paginated<WaContact>(data, filters);
  },
  updateContact: async (id: string, payload: WaContactUpdate): Promise<WaContact> => {
    const { data } = await api.patch(U.CONTACT(id), payload);
    return data;
  },
  getSegments: async (): Promise<WaSegment[]> => {
    const { data } = await api.get(U.SEGMENTS);
    return data?.items ?? [];
  },
  createSegment: async (payload: WaSegmentPayload): Promise<WaSegment> => {
    const { data } = await api.post(U.SEGMENTS, payload);
    return data;
  },
  updateSegment: async (id: string, payload: WaSegmentPayload): Promise<WaSegment> => {
    const { data } = await api.put(U.SEGMENT(id), payload);
    return data;
  },
  deleteSegment: async (id: string): Promise<void> => {
    await api.delete(U.SEGMENT(id));
  },

  // ── Campaigns ─────────────────────────────────────────
  getCampaigns: async (filters: WaCampaignFilters = {}): Promise<PaginatedResponse<WaCampaignSummary>> => {
    const params: Record<string, string | number> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get(U.CAMPAIGNS, { params });
    return paginated<WaCampaignSummary>(data, filters);
  },
  getCampaign: async (id: string): Promise<WaCampaign> => {
    const { data } = await api.get(U.CAMPAIGN(id));
    return data;
  },
  createCampaign: async (payload: WaCampaignPayload): Promise<WaCampaign> => {
    const { data } = await api.post(U.CAMPAIGNS, payload);
    return data;
  },
  updateCampaign: async (id: string, payload: WaCampaignPayload): Promise<WaCampaign> => {
    const { data } = await api.put(U.CAMPAIGN(id), payload);
    return data;
  },
  sendCampaign: async (id: string, scheduledAt?: string): Promise<WaCampaign> => {
    const { data } = await api.post(U.CAMPAIGN_SEND(id), scheduledAt ? { scheduledAt } : {});
    return data;
  },
  pauseCampaign: async (id: string): Promise<WaCampaign> => {
    const { data } = await api.post(U.CAMPAIGN_PAUSE(id));
    return data;
  },
  resumeCampaign: async (id: string): Promise<WaCampaign> => {
    const { data } = await api.post(U.CAMPAIGN_RESUME(id));
    return data;
  },
  cancelCampaign: async (id: string): Promise<WaCampaign> => {
    const { data } = await api.post(U.CAMPAIGN_CANCEL(id));
    return data;
  },
  retryFailed: async (id: string): Promise<{ requeued: number }> => {
    const { data } = await api.post(U.CAMPAIGN_RETRY_FAILED(id));
    return data;
  },
  campaignTestSend: async (id: string, phone: string): Promise<{ waMessageId: string }> => {
    const { data } = await api.post(U.CAMPAIGN_TEST_SEND(id), { phone });
    return data;
  },
  duplicateCampaign: async (id: string): Promise<WaCampaign> => {
    const { data } = await api.post(U.CAMPAIGN_DUPLICATE(id));
    return data;
  },
  deleteCampaign: async (id: string): Promise<void> => {
    await api.delete(U.CAMPAIGN(id));
  },
  getCampaignMessages: async (
    id: string,
    filters: WaCampaignMessageFilters = {},
  ): Promise<PaginatedResponse<WaMessageRow>> => {
    const params: Record<string, string | number> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get(U.CAMPAIGN_MESSAGES(id), { params });
    return paginated<WaMessageRow>(data, filters);
  },
  exportCampaign: async (id: string): Promise<Blob> => {
    const { data } = await api.get(U.CAMPAIGN_EXPORT(id), { responseType: 'blob' });
    return data as Blob;
  },

  // ── Inbox ─────────────────────────────────────────────
  getConversations: async (filters: WaConversationFilters = {}): Promise<PaginatedResponse<WaConversation>> => {
    const params: Record<string, string | number> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.filter) params.filter = filters.filter;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get(U.CONVERSATIONS, { params });
    return paginated<WaConversation>(data, filters);
  },
  getThread: async (contactId: string, opts: { before?: string; limit?: number } = {}): Promise<WaThread> => {
    const params: Record<string, string | number> = {};
    if (opts.before) params.before = opts.before;
    params.limit = opts.limit ?? 50;
    const { data } = await api.get(U.CONVERSATION_MESSAGES(contactId), { params });
    return { items: data?.items ?? [], contact: data?.contact, windowExpiresAt: data?.windowExpiresAt ?? null };
  },
  reply: async (contactId: string, payload: WaReplyPayload): Promise<WaMessage> => {
    const { data } = await api.post(U.CONVERSATION_REPLY(contactId), payload);
    return data;
  },
  markRead: async (contactId: string): Promise<{ ok: boolean }> => {
    const { data } = await api.post(U.CONVERSATION_READ(contactId));
    return data;
  },
  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get(U.UNREAD_COUNT);
    return Number(data?.count ?? 0);
  },

  // ── Provider page hook ────────────────────────────────
  getProviderInfo: async (providerId: string): Promise<WaProviderInfo> => {
    const { data } = await api.get(U.PROVIDER(providerId));
    return {
      contact: data?.contact ?? null,
      phoneCandidates: data?.phoneCandidates ?? [],
      windowExpiresAt: data?.windowExpiresAt ?? null,
      messages: data?.messages ?? [],
    };
  },
  sendToProvider: async (providerId: string, payload: WaReplyPayload): Promise<WaMessage> => {
    const { data } = await api.post(U.PROVIDER_SEND(providerId), payload);
    return data;
  },
};
