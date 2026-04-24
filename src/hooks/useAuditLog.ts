import { useQuery } from '@tanstack/react-query';
import { auditLogService } from '../services/audit-log.service';
import type { AuditLogFilters } from '../types/audit-log';

const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.all, 'list', filters] as const,
  stats: () => [...auditLogKeys.all, 'stats'] as const,
};

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () => auditLogService.list(filters),
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: auditLogKeys.stats(),
    queryFn: () => auditLogService.stats(),
  });
}
