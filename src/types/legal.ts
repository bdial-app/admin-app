export type LegalRequiredFor = 'everyone' | 'business' | 'none';

export interface LegalDocumentListItem {
  slug: string;
  title: string;
  summary: string;
  requiredFor: LegalRequiredFor;
  version: number;
  publishedAt: string | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  /** People who accepted the current version. */
  acceptedCurrent: number;
}

export interface LegalVersion {
  version: number;
  title: string;
  content: string;
  changeNote: string | null;
  requiresAcceptance: boolean;
  publishedAt: string;
  publishedBy: string | null;
  accepted: number;
}

export interface LegalDocumentDetail {
  slug: string;
  title: string;
  summary: string;
  requiredFor: LegalRequiredFor;
  draft: { title: string; summary: string; content: string; updatedAt: string | null } | null;
  /** Newest first. */
  versions: LegalVersion[];
}

export interface LegalDraftInput {
  title: string;
  summary: string;
  content: string;
}

export interface LegalPublishInput extends LegalDraftInput {
  changeNote: string;
  requiresAcceptance: boolean;
  requiredFor: LegalRequiredFor;
}

export interface UserLegalAcceptances {
  pending: { slug: string; title: string; version: number }[];
  acceptances: { slug: string; version: number; acceptedAt: string; method: string; platform: string | null }[];
}
