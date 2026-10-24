import api from './api';

export interface BusinessLinkInfo {
  slug: string;
  /** False while the business is suspended, disabled or deleted: its page answers "not found". */
  isPublic: boolean;
  /** Links it had before, newest first. Each still redirects here. */
  previous: { slug: string; changedAt: string }[];
}

export interface SlugCheck {
  /** What the input becomes once tidied ("Pronttera Official" → "pronttera-official"). */
  slug: string;
  available: boolean;
  reason: string | null;
  /** Free alternatives, when this one can't be used. */
  suggestions: string[];
}

export const slugsService = {
  info: async (providerId: string): Promise<BusinessLinkInfo> =>
    (await api.get(`/admin/slugs/business/${providerId}`)).data,

  check: async (providerId: string, slug: string, signal?: AbortSignal): Promise<SlugCheck> =>
    (await api.get(`/admin/slugs/business/${providerId}/check`, { params: { slug }, signal })).data,

  set: async (providerId: string, slug: string): Promise<{ slug: string }> =>
    (await api.patch(`/admin/slugs/business/${providerId}`, { slug })).data,
};
