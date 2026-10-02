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
  /** When the applicant submitted. */
  createdAt?: string;
  /** Whole days since submission while still undecided; null once approved/rejected. */
  waitingDays?: number | null;
  // Relations
  user?: import('./user').User;
  reviewer?: import('./user').User;
}

export type VerificationSort = 'oldest' | 'newest' | 'waiting_longest';

/** Query params for GET /admin/verifications. */
export interface VerificationFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: VerificationOverallStatus | '';
  aadhaar?: DocStatus | '';
  ijamat?: IjamatStatus | '';
  submittedFrom?: string;
  submittedTo?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  /** Created more than N days ago and not yet approved/rejected. */
  waitingDays?: string;
  city?: string;
  hasProvider?: string;
  /** reviewed_by user id. */
  reviewer?: string;
  sort?: VerificationSort | '';
}

export interface VerificationFilterOptions {
  cities: { name: string; count: number }[];
  reviewers: { id: string; name: string; count: number }[];
  counts: {
    total: number;
    needsReview: number;
    waiting3d: number;
    approvedThisWeek: number;
    rejected: number;
    ijamatMissing: number;
  };
}
