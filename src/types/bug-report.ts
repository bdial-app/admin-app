export type BugCategory = 'crash' | 'ui_issue' | 'feature_not_working' | 'performance' | 'login_auth' | 'payment' | 'other';
export type BugReportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface BugReport {
  id: string;
  reporterId: string | null;
  category: BugCategory;
  description: string;
  stepsToReproduce: string | null;
  deviceInfo: string | null;
  status: BugReportStatus;
  adminNotes: string | null;
  createdAt: string;
}

export interface BugReportFilters {
  page?: number;
  limit?: number;
  status?: BugReportStatus | '';
  category?: BugCategory | '';
}

export interface BugReportListResponse {
  items: BugReport[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const BUG_CATEGORY_LABELS: Record<BugCategory, string> = {
  crash: 'Crash',
  ui_issue: 'UI Issue',
  feature_not_working: 'Feature Not Working',
  performance: 'Performance',
  login_auth: 'Login / Auth',
  payment: 'Payment',
  other: 'Other',
};

export const BUG_STATUS_LABELS: Record<BugReportStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
