import api from './api';
import { URLS } from '../utils/urls';
import type { AdminCreateProviderWithUserPayload } from './admin-create.service';

/** One sheet row as sent to the backend — the single-create payload plus a stable row key. */
export interface BulkProviderRowPayload extends AdminCreateProviderWithUserPayload {
  rowId: string;
  instagramHandle?: string;
  whatsappNumber?: string;
  websiteUrl?: string;
  facebookHandle?: string;
}

export interface BulkValidateRowResult {
  rowId: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  existingUser: { id: string; name: string } | null;
  existingProvider: { id: string; brandName: string; status: string } | null;
  contactNumberOwner: { id: string; brandName: string; city: string } | null;
  brandNameClash: { id: string; brandName: string; city: string } | null;
}

export interface BulkImportRowResult {
  rowId: string;
  ok: boolean;
  providerId?: string;
  userId?: string;
  brandName?: string;
  error?: string;
}

export interface BulkImportResult {
  total: number;
  created: number;
  failed: number;
  skipped: number;
  results: BulkImportRowResult[];
}

export const bulkImportService = {
  validate: async (rows: BulkProviderRowPayload[]): Promise<{ results: BulkValidateRowResult[] }> => {
    const { data } = await api.post(URLS.ADMIN_CREATE.BULK_VALIDATE, { rows });
    return data;
  },

  importRows: async (rows: BulkProviderRowPayload[], sourceLabel?: string): Promise<BulkImportResult> => {
    const { data } = await api.post(URLS.ADMIN_CREATE.BULK_IMPORT, { rows, continueOnError: true, sourceLabel });
    return data;
  },
};
