import api from './api';
import { URLS } from '../utils/urls';
import type { AuditLogEntry, AuditLogFilters, AuditLogStats } from '../types/audit-log';
import type { PaginatedResponse } from '../types/common';

export const auditLogService = {
  list: (filters: AuditLogFilters = {}) =>
    api.get<PaginatedResponse<AuditLogEntry>>(URLS.AUDIT_LOGS.LIST, {
      params: {
        page: filters.page,
        rows: filters.limit,
        adminId: filters.adminId || undefined,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      },
    }).then(r => r.data),

  stats: () =>
    api.get<AuditLogStats>(URLS.AUDIT_LOGS.STATS).then(r => r.data),
};
