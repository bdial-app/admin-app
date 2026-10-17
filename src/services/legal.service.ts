import api from './api';
import { URLS } from '../utils/urls';
import type {
  LegalDocumentDetail,
  LegalDocumentListItem,
  LegalDraftInput,
  LegalPublishInput,
  UserLegalAcceptances,
} from '../types/legal';

export const legalService = {
  list: () => api.get<LegalDocumentListItem[]>(URLS.LEGAL.LIST).then((r) => r.data),

  get: (slug: string) => api.get<LegalDocumentDetail>(URLS.LEGAL.DOC(slug)).then((r) => r.data),

  saveDraft: (slug: string, body: LegalDraftInput) =>
    api.put<LegalDocumentDetail>(URLS.LEGAL.DRAFT(slug), body).then((r) => r.data),

  discardDraft: (slug: string) => api.delete<LegalDocumentDetail>(URLS.LEGAL.DRAFT(slug)).then((r) => r.data),

  publish: (slug: string, body: LegalPublishInput) =>
    api.post<LegalDocumentDetail>(URLS.LEGAL.PUBLISH(slug), body).then((r) => r.data),

  userAcceptances: (userId: string) =>
    api.get<UserLegalAcceptances>(URLS.LEGAL.USER(userId)).then((r) => r.data),
};
