import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';
import type { BatchFilters, SendNotificationPayload, UpdateTemplatePayload } from '../types';

export const notificationKeys = {
  all: ['notifications'] as const,
  batches: () => [...notificationKeys.all, 'batches'] as const,
  batchList: (filters: BatchFilters) => [...notificationKeys.batches(), filters] as const,
  batchDetail: (id: string) => [...notificationKeys.all, 'batch', id] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
  templatesByCategory: (category?: string) => [...notificationKeys.templates(), category] as const,
};

export function useNotificationBatches(filters: BatchFilters) {
  return useQuery({
    queryKey: notificationKeys.batchList(filters),
    queryFn: () => notificationsService.getBatches(filters),
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
