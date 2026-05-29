import type { DocStatus, IjamatStatus, VerificationOverallStatus } from './enums';

export interface Verification {
  id: string;
  userId: string;
  aadhaarDocUrl: string;
  aadhaarStatus: DocStatus;
  ijamatNumber: string | null;
  ijamatExpiry: string | null;
  ijamatDocUrl: string | null;
  ijamatStatus: IjamatStatus;
  status: VerificationOverallStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  // Relations
  user?: import('./user').User;
  reviewer?: import('./user').User;
}

export interface VerificationFilters {
  page?: number;
  limit?: number;
  status?: DocStatus | 'in_review' | '';
  search?: string;
}
