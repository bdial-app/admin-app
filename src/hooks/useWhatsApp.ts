import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { whatsappService } from '../services/whatsapp.service';
import type {
  WaSettingsUpdate,
  WaSettingsTestSendPayload,
  WaTemplateFilters,
  WaTemplatePayload,
  WaTemplateComponent,
  WaAudiencePreviewPayload,
  WaRecipientsPayload,
  WaContactFilters,
  WaContactUpdate,
  WaSegmentPayload,
  WaCampaignFilters,
  WaCampaignPayload,
  WaCampaignMessageFilters,
  WaConversationFilters,
  WaReplyPayload,
} from '../types';

// ── Key factory ───────────────────────────────────────────
export const whatsappKeys = {
  all: ['whatsapp'] as const,
  settings: () => [...whatsappKeys.all, 'settings'] as const,
  overview: (days: number) => [...whatsappKeys.all, 'overview', days] as const,
  templates: () => [...whatsappKeys.all, 'templates'] as const,
  templateList: (filters: WaTemplateFilters) => [...whatsappKeys.templates(), 'list', filters] as const,
  templateDetail: (id: string) => [...whatsappKeys.templates(), 'detail', id] as const,
  audience: () => [...whatsappKeys.all, 'audience'] as const,
  audiencePreview: (payload: WaAudiencePreviewPayload) => [...whatsappKeys.audience(), 'preview', payload] as const,
  audienceOptions: () => [...whatsappKeys.audience(), 'options'] as const,
  contacts: () => [...whatsappKeys.audience(), 'contacts'] as const,
  contactList: (filters: WaContactFilters) => [...whatsappKeys.contacts(), filters] as const,
  segments: () => [...whatsappKeys.audience(), 'segments'] as const,
  campaigns: () => [...whatsappKeys.all, 'campaigns'] as const,
  campaignList: (filters: WaCampaignFilters) => [...whatsappKeys.campaigns(), 'list', filters] as const,
  campaignDetail: (id: string) => [...whatsappKeys.campaigns(), 'detail', id] as const,
  campaignMessages: (id: string, filters: WaCampaignMessageFilters) =>
    [...whatsappKeys.campaigns(), 'messages', id, filters] as const,
  inbox: () => [...whatsappKeys.all, 'inbox'] as const,
  conversations: (filters: WaConversationFilters) => [...whatsappKeys.inbox(), 'conversations', filters] as const,
  thread: (contactId: string) => [...whatsappKeys.inbox(), 'thread', contactId] as const,
  unread: () => [...whatsappKeys.inbox(), 'unread'] as const,
  provider: (providerId: string) => [...whatsappKeys.all, 'provider', providerId] as const,
};

// ── Settings ──────────────────────────────────────────────
export function useWaSettings() {
  return useQuery({
    queryKey: whatsappKeys.settings(),
    queryFn: () => whatsappService.getSettings(),
    staleTime: 30_000,
  });
}

export function useUpdateWaSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WaSettingsUpdate) => whatsappService.updateSettings(payload),
    onSuccess: (data) => {
      qc.setQueryData(whatsappKeys.settings(), data);
      qc.invalidateQueries({ queryKey: whatsappKeys.overview(30) });
    },
  });
}

export function useRefreshWaPhoneMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.refreshPhoneMeta(),
    onSuccess: (data) => qc.setQueryData(whatsappKeys.settings(), data),
  });
}

export function useWaSettingsTestSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WaSettingsTestSendPayload) => whatsappService.settingsTestSend(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.inbox() }),
  });
}

// ── Overview ──────────────────────────────────────────────
export function useWaOverview(days = 30) {
  return useQuery({
    queryKey: whatsappKeys.overview(days),
    queryFn: () => whatsappService.getOverview(days),
    refetchInterval: 60_000,
  });
}

// ── Templates ─────────────────────────────────────────────
export function useWaTemplates(filters: WaTemplateFilters = {}) {
  return useQuery({
    queryKey: whatsappKeys.templateList(filters),
    queryFn: () => whatsappService.getTemplates(filters),
    placeholderData: keepPreviousData,
  });
}

export function useWaTemplate(id: string | undefined) {
  return useQuery({
    queryKey: whatsappKeys.templateDetail(id ?? ''),
    queryFn: () => whatsappService.getTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WaTemplatePayload) => whatsappService.createTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.templates() }),
  });
}

export function useUpdateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WaTemplatePayload }) =>
      whatsappService.updateTemplate(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(whatsappKeys.templateDetail(data.id), data);
      qc.invalidateQueries({ queryKey: whatsappKeys.templates() });
    },
  });
}

export function useSubmitWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => whatsappService.submitTemplate(id),
    onSuccess: (data) => {
      qc.setQueryData(whatsappKeys.templateDetail(data.id), data);
      qc.invalidateQueries({ queryKey: whatsappKeys.templates() });
    },
  });
}

export function useDeleteWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => whatsappService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.templates() }),
  });
}

export function useSyncWaTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.syncTemplates(),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.templates() }),
  });
}

export function useSeedWaTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappService.seedTemplates(),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.templates() }),
  });
}

export function usePreviewWaTemplate() {
  return useMutation({
    mutationFn: (payload: { templateId?: string; components?: WaTemplateComponent[]; variables: Record<string, string> }) =>
      whatsappService.previewTemplate(payload),
  });
}

// ── Audience ──────────────────────────────────────────────
/** Live count card. Pass an already-debounced payload; `enabled` gates the request. */
export function useWaAudiencePreview(payload: WaAudiencePreviewPayload, enabled = true) {
  return useQuery({
    queryKey: whatsappKeys.audiencePreview(payload),
    queryFn: () => whatsappService.previewAudience(payload),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function usePreviewWaAudience() {
  return useMutation({
    mutationFn: (payload: WaAudiencePreviewPayload) => whatsappService.previewAudience(payload),
  });
}

/** Every recipient, paged — for reviewing and excluding people one by one. */
export function useWaAudienceRecipients(payload: WaRecipientsPayload, enabled = true) {
  return useQuery({
    queryKey: [...whatsappKeys.audience(), 'recipients', payload] as const,
    queryFn: () => whatsappService.getAudienceRecipients(payload),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useWaCustomerSearch(search: string) {
  return useQuery({
    queryKey: [...whatsappKeys.audience(), 'customers', search] as const,
    queryFn: () => whatsappService.searchCustomers(search),
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useWaAudienceOptions() {
  return useQuery({
    queryKey: whatsappKeys.audienceOptions(),
    queryFn: () => whatsappService.getAudienceOptions(),
    staleTime: 5 * 60_000,
  });
}

export function useWaContacts(filters: WaContactFilters) {
  return useQuery({
    queryKey: whatsappKeys.contactList(filters),
    queryFn: () => whatsappService.getContacts(filters),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateWaContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WaContactUpdate }) =>
      whatsappService.updateContact(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.contacts() });
      qc.invalidateQueries({ queryKey: whatsappKeys.thread(vars.id) });
      qc.invalidateQueries({ queryKey: [...whatsappKeys.inbox(), 'conversations'] });
      qc.invalidateQueries({ queryKey: [...whatsappKeys.all, 'provider'] });
    },
  });
}

export function useWaSegments() {
  return useQuery({
    queryKey: whatsappKeys.segments(),
    queryFn: () => whatsappService.getSegments(),
  });
}

export function useCreateWaSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WaSegmentPayload) => whatsappService.createSegment(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.segments() }),
  });
}

export function useUpdateWaSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WaSegmentPayload }) =>
      whatsappService.updateSegment(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.segments() }),
  });
}

export function useDeleteWaSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => whatsappService.deleteSegment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappKeys.segments() }),
  });
}

// ── Campaigns ─────────────────────────────────────────────
export function useWaCampaigns(filters: WaCampaignFilters) {
  return useQuery({
    queryKey: whatsappKeys.campaignList(filters),
    queryFn: () => whatsappService.getCampaigns(filters),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((c) => c.status === 'sending' || c.status === 'scheduled') ? 10_000 : false;
    },
  });
}

/** Detail refetches every 5s while the campaign is sending. */
export function useWaCampaign(id: string | undefined) {
  return useQuery({
    queryKey: whatsappKeys.campaignDetail(id ?? ''),
    queryFn: () => whatsappService.getCampaign(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'sending' || s === 'scheduled' ? 5_000 : false;
    },
  });
}

export function useWaCampaignMessages(id: string | undefined, filters: WaCampaignMessageFilters, live = false) {
  return useQuery({
    queryKey: whatsappKeys.campaignMessages(id ?? '', filters),
    queryFn: () => whatsappService.getCampaignMessages(id!, filters),
    enabled: !!id,
    placeholderData: keepPreviousData,
    refetchInterval: live ? 5_000 : false,
  });
}

function useCampaignMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  extra?: (qc: ReturnType<typeof useQueryClient>, data: TData, vars: TVars) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.campaigns() });
      qc.invalidateQueries({ queryKey: whatsappKeys.overview(30) });
      extra?.(qc, data, vars);
    },
  });
}

export function useCreateWaCampaign() {
  return useCampaignMutation((payload: WaCampaignPayload) => whatsappService.createCampaign(payload));
}

export function useUpdateWaCampaign() {
  return useCampaignMutation(
    ({ id, payload }: { id: string; payload: WaCampaignPayload }) => whatsappService.updateCampaign(id, payload),
    (qc, data) => qc.setQueryData(whatsappKeys.campaignDetail(data.id), data),
  );
}

export function useSendWaCampaign() {
  return useCampaignMutation(
    ({ id, scheduledAt }: { id: string; scheduledAt?: string }) => whatsappService.sendCampaign(id, scheduledAt),
    (qc, data) => qc.setQueryData(whatsappKeys.campaignDetail(data.id), data),
  );
}

export function usePauseWaCampaign() {
  return useCampaignMutation(
    (id: string) => whatsappService.pauseCampaign(id),
    (qc, data) => qc.setQueryData(whatsappKeys.campaignDetail(data.id), data),
  );
}

export function useResumeWaCampaign() {
  return useCampaignMutation(
    (id: string) => whatsappService.resumeCampaign(id),
    (qc, data) => qc.setQueryData(whatsappKeys.campaignDetail(data.id), data),
  );
}

export function useCancelWaCampaign() {
  return useCampaignMutation(
    (id: string) => whatsappService.cancelCampaign(id),
    (qc, data) => qc.setQueryData(whatsappKeys.campaignDetail(data.id), data),
  );
}

export function useRetryFailedWaCampaign() {
  return useCampaignMutation(
    (id: string) => whatsappService.retryFailed(id),
    (qc, _data, id) => qc.invalidateQueries({ queryKey: [...whatsappKeys.campaigns(), 'messages', id] }),
  );
}

export function useDuplicateWaCampaign() {
  return useCampaignMutation((id: string) => whatsappService.duplicateCampaign(id));
}

export function useDeleteWaCampaign() {
  return useCampaignMutation((id: string) => whatsappService.deleteCampaign(id));
}

export function useWaCampaignTestSend() {
  return useMutation({
    mutationFn: ({ id, phone }: { id: string; phone: string }) => whatsappService.campaignTestSend(id, phone),
  });
}

export function useExportWaCampaign() {
  return useMutation({
    mutationFn: (id: string) => whatsappService.exportCampaign(id),
  });
}

// ── Inbox ─────────────────────────────────────────────────
/** Conversation list polls every 15s. */
export function useWaConversations(filters: WaConversationFilters) {
  return useQuery({
    queryKey: whatsappKeys.conversations(filters),
    queryFn: () => whatsappService.getConversations(filters),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

/** Open thread polls every 5s. */
export function useWaThread(contactId: string | undefined) {
  return useQuery({
    queryKey: whatsappKeys.thread(contactId ?? ''),
    queryFn: () => whatsappService.getThread(contactId!),
    enabled: !!contactId,
    refetchInterval: 5_000,
  });
}

export function useWaReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, payload }: { contactId: string; payload: WaReplyPayload }) =>
      whatsappService.reply(contactId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.thread(vars.contactId) });
      qc.invalidateQueries({ queryKey: [...whatsappKeys.inbox(), 'conversations'] });
    },
  });
}

export function useMarkWaRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => whatsappService.markRead(contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.unread() });
      qc.invalidateQueries({ queryKey: [...whatsappKeys.inbox(), 'conversations'] });
      qc.invalidateQueries({ queryKey: whatsappKeys.contacts() });
    },
  });
}

/** Sidebar badge; polls every 60s. Failures are silent — the badge just hides. */
export function useWaUnreadCount() {
  return useQuery({
    queryKey: whatsappKeys.unread(),
    queryFn: () => whatsappService.getUnreadCount(),
    refetchInterval: 60_000,
    retry: false,
  });
}

// ── Provider page ─────────────────────────────────────────
export function useWaProviderInfo(providerId: string | undefined) {
  return useQuery({
    queryKey: whatsappKeys.provider(providerId ?? ''),
    queryFn: () => whatsappService.getProviderInfo(providerId!),
    enabled: !!providerId,
  });
}

export function useSendWaToProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, payload }: { providerId: string; payload: WaReplyPayload }) =>
      whatsappService.sendToProvider(providerId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: whatsappKeys.provider(vars.providerId) });
      qc.invalidateQueries({ queryKey: whatsappKeys.inbox() });
    },
  });
}
