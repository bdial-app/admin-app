import type { ReportEntityType, ReportReason, ReportStatus, ReportAction } from './enums';

export interface Report {
  id: string;
  reporterId: string;
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  adminAction: ReportAction | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Relations
  reporter?: import('./user').User;
  reviewer?: import('./user').User;
  // Hydrated target summary from report queue
  targetSummary?: {
    name: string;
    imageUrl?: string;
    status?: string;
    totalReports: number;
  };
}

export interface ReportDetail extends Report {
  reporterCredibility?: {
    totalFiled: number;
    dismissedCount: number;
    actionCount: number;
    credibilityRatio: string;
  };
  otherReportsOnTarget?: Report[];
  targetEntity?: Record<string, unknown>;
  // Legacy fields kept for backwards compat
  relatedReports?: Report[];
}

export interface ReportFilters {
  page?: number;
  limit?: number;
  status?: ReportStatus | '';
  entityType?: ReportEntityType | '';
}

export interface ReportStats {
  pendingCount: number;
  reportsThisWeek: number;
  topReported: Array<{
    entityId: string;
    entityType: string;
    count: number;
  }>;
}
