export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousState: Record<string, any> | null;
  newState: Record<string, any> | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { id: string; name: string } | null;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogStats {
  total: number;
  thisWeek: number;
  actionBreakdown: { action: string; count: number }[];
}
