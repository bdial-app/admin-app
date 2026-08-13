import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersService, type ProviderImagesPayload } from '../services/providers.service';
import type { ProviderFilters, Provider, BulkActionPayload } from '../types';
import { toast } from 'react-toastify';

export const providerKeys = {
  all: ['providers'] as const,
  lists: () => [...providerKeys.all, 'list'] as const,
  list: (filters: ProviderFilters) => [...providerKeys.lists(), filters] as const,
  pending: () => [...providerKeys.all, 'pending'] as const,
  details: () => [...providerKeys.all, 'detail'] as const,
  detail: (id: string) => [...providerKeys.details(), id] as const,
  warnings: (id: string) => [...providerKeys.all, 'warnings', id] as const,
};

export function useProviders(filters: ProviderFilters) {
  return useQuery({
    queryKey: providerKeys.list(filters),
    queryFn: () => providersService.list(filters),
  });
}

export function usePendingProviders() {
  return useQuery({
    queryKey: providerKeys.pending(),
    queryFn: () => providersService.getPending(),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: providerKeys.detail(id),
    queryFn: () => providersService.getById(id),
    enabled: !!id,
  });
}

export function useApproveProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useSuspendProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.suspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useUnsuspendProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.unsuspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Provider> }) =>
      providersService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useUpdateProviderImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProviderImagesPayload }) =>
      providersService.updateImages(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useUpdateProviderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryIds }: { id: string; categoryIds: string[] }) =>
      providersService.updateCategories(id, categoryIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useProviderWarnings(id: string) {
  return useQuery({
    queryKey: providerKeys.warnings(id),
    queryFn: () => providersService.getWarnings(id),
    enabled: !!id,
  });
}

export function useDisableProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.disable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
      toast.success('Provider disabled');
    },
    onError: () => toast.error('Failed to disable provider'),
  });
}

export function useEnableProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.enable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
      toast.success('Provider enabled');
    },
    onError: () => toast.error('Failed to enable provider'),
  });
}

export function useSoftDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.softDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
      toast.success('Provider deleted');
    },
    onError: () => toast.error('Failed to delete provider'),
  });
}

export function useToggleFeaturedProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      providersService.toggleFeatured(id, isFeatured),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
      toast.success('Featured status updated');
    },
    onError: () => toast.error('Failed to update featured status'),
  });
}

export function useBulkProviderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkActionPayload) => providersService.bulkAction(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
      toast.success(`Bulk action applied to ${data.affected} providers`);
    },
    onError: () => toast.error('Bulk action failed'),
  });
}

export function useUpdateContactNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contactNumber, otp }: { id: string; contactNumber: string; otp: string }) =>
      providersService.updateContactNumber(id, contactNumber, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}
