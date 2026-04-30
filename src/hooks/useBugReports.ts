import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bugReportsService } from '../services/bug-reports.service';
import type { BugReportFilters } from '../types';

const bugReportKeys = {
  all: ['bug-reports'] as const,
  list: (filters: BugReportFilters) => [...bugReportKeys.all, 'list', filters] as const,
  detail: (id: string) => [...bugReportKeys.all, 'detail', id] as const,
};

export function useBugReports(filters: BugReportFilters = {}) {
  return useQuery({
    queryKey: bugReportKeys.list(filters),
    queryFn: () => bugReportsService.list(filters),
  });
}

export function useBugReport(id: string) {
  return useQuery({
    queryKey: bugReportKeys.detail(id),
    queryFn: () => bugReportsService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateBugReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; adminNotes?: string }) =>
      bugReportsService.update(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bugReportKeys.all });
      queryClient.setQueryData(bugReportKeys.detail(data.id), data);
    },
  });
}
