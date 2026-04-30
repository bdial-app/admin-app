import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '../services/reports.service';
import type { ReportFilters, ReportAction } from '../types';

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (filters: ReportFilters) => [...reportKeys.lists(), filters] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
  stats: () => [...reportKeys.all, 'stats'] as const,
};

export function useReports(filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.list(filters),
    queryFn: () => reportsService.list(filters),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => reportsService.getById(id),
    enabled: !!id,
  });
}

export function useReviewReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, adminNotes }: { id: string; action: ReportAction; adminNotes?: string }) =>
      reportsService.review(id, { action, adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useReportStats() {
  return useQuery({
    queryKey: reportKeys.stats(),
    queryFn: () => reportsService.getStats(),
  });
}
