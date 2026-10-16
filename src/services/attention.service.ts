import api from './api';

/** Work waiting on admins — shared by everyone, same counts the pages show. */
export type WaitingKey =
  | 'queue' | 'providersInReview' | 'flaggedReviews' | 'verifications' | 'reports'
  | 'offers' | 'sponsorships' | 'bugReports' | 'womenLed';

/** New since you last opened that page. */
export type FreshKey =
  | 'users' | 'providers' | 'products' | 'reviews' | 'photos'
  | 'chat' | 'payments' | 'subscriptions' | 'cities' | 'logs';

/** `GET /admin/attention` */
export interface Attention {
  waiting: Record<WaitingKey, number>;
  fresh: Record<FreshKey, number>;
  /** Since when each "new" count runs (ISO). */
  since: Record<FreshKey, string>;
}

export const attentionService = {
  get: async (refresh = false): Promise<Attention> => {
    const { data } = await api.get('/admin/attention', { params: refresh ? { refresh: 1 } : undefined });
    return data;
  },
  markSeen: async (sections: FreshKey[]): Promise<void> => {
    await api.post('/admin/attention/seen', { sections });
  },
};
