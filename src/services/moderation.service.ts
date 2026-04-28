import api from './api';
import { URLS } from '../utils/urls';
import type { ModerationQueue } from '../types';

export const moderationService = {
  getQueue: async (): Promise<ModerationQueue> => {
    const { data } = await api.get(URLS.MODERATION.QUEUE);
    return data;
  },
};
