// ── Pagination ───────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ── Filter helpers ───────────────────────────────────────
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

// ── API response wrapper ─────────────────────────────────
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
