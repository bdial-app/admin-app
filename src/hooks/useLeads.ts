import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsService, type InteractionFilters, type LeadFilters } from '../services/leads.service';
import type { LeadPeriod } from '../types';

export const leadKeys = {
  all: ['leads'] as const,
  overview: (period: LeadPeriod) => [...leadKeys.all, 'overview', period] as const,
  list: (filters: LeadFilters) => [...leadKeys.all, 'list', filters] as const,
  detail: (id: string) => [...leadKeys.all, 'detail', id] as const,
  interactions: (filters: InteractionFilters) => [...leadKeys.all, 'interactions', filters] as const,
};

export function useLeadsOverview(period: LeadPeriod) {
  return useQuery({
    queryKey: leadKeys.overview(period),
    queryFn: () => leadsService.overview(period),
    placeholderData: (prev) => prev,
  });
}

export function useLeadList(filters: LeadFilters, enabled = true) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => leadsService.list(filters),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useLeadDetail(id: string | null) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? ''),
    queryFn: () => leadsService.detail(id!),
    enabled: !!id,
  });
}

export function useLeadInteractions(filters: InteractionFilters, enabled = true) {
  return useQuery({
    queryKey: leadKeys.interactions(filters),
    queryFn: () => leadsService.interactions(filters),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useRescoreLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId?: string) => leadsService.rescore(providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.all }),
  });
}
