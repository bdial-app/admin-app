import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';
import type {
  BatchFilters,
  CreateCampaignPayload,
  CreateTemplatePayload,
  PushAudience,
  PushKind,
  PushMessage,
  PushTestTarget,
  SendNotificationPayload,
  UpdateTemplatePayload,
} from '../types';

export const notificationKeys = {
  all: ['notifications'] as const,
  batches: () => [...notificationKeys.all, 'batches'] as const,
  batchList: (filters: BatchFilters) => [...notificationKeys.batches(), filters] as const,
  batchDetail: (id: string) => [...notificationKeys.all, 'batch', id] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
  templatesByCategory: (category?: string) => [...notificationKeys.templates(), category] as const,
  templateStats: (days: number) => [...notificationKeys.all, 'template-stats', days] as const,
  audienceOptions: () => [...notificationKeys.all, 'audience-options'] as const,
  audiencePreview: (audience: PushAudience, type: PushKind) =>
    [...notificationKeys.all, 'audience-preview', audience, type] as const,
};

export function useNotificationBatches(filters: BatchFilters) {
  return useQuery({
    queryKey: notificationKeys.batchList(filters),
    queryFn: () => notificationsService.getBatches(filters),
    // Watch a campaign go out.
    refetchInterval: (q) => (q.state.data?.items.some((b) => b.status === 'sending') ? 3000 : false),
  });
}

export function useNotificationBatch(id: string) {
  return useQuery({
    queryKey: notificationKeys.batchDetail(id),
    queryFn: () => notificationsService.getBatchById(id),
    enabled: !!id,
  });
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendNotificationPayload) =>
      notificationsService.send(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.batches() });
      qc.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: () => notificationsService.getStats(),
    refetchInterval: 60_000,
  });
}

// ── Template Hooks ────────────────────────────────────────

export function useNotificationTemplates(category?: string) {
  return useQuery({
    queryKey: notificationKeys.templatesByCategory(category),
    queryFn: () => notificationsService.getTemplates(category),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      notificationsService.updateTemplate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.templates() });
    },
  });
}

export function useToggleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      notificationsService.toggleTemplate(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.templates() });
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => notificationsService.createTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.templates() }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.templates() }),
  });
}

export function useResetTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.resetTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.templates() }),
  });
}

export function useTestTemplate() {
  return useMutation({
    mutationFn: ({ id, ...payload }: PushTestTarget & { id: string; variables?: Record<string, string> }) =>
      notificationsService.testTemplate(id, payload),
  });
}

export function useTemplateStats(days = 30) {
  return useQuery({
    queryKey: notificationKeys.templateStats(days),
    queryFn: () => notificationsService.getTemplateStats(days),
    staleTime: 5 * 60_000,
  });
}

// ── Push campaign hooks ───────────────────────────────────

export function usePushAudienceOptions() {
  return useQuery({
    queryKey: notificationKeys.audienceOptions(),
    queryFn: () => notificationsService.getAudienceOptions(),
    staleTime: 10 * 60_000,
  });
}

export function usePushAudiencePreview(audience: PushAudience, type: PushKind, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.audiencePreview(audience, type),
    queryFn: () => notificationsService.previewAudience(audience, type),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) => notificationsService.createCampaign(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.batches() });
      qc.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.cancelCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.batches() }),
  });
}

export function useSendTestPush() {
  return useMutation({
    mutationFn: (payload: PushMessage & PushTestTarget) => notificationsService.sendTest(payload),
  });
}
