import api from './api';
import { URLS } from '../utils/urls';
import type { FeatureFlag } from '../types';

export const featureFlagsService = {
  list: async (): Promise<FeatureFlag[]> => {
    const { data } = await api.get(URLS.FEATURE_FLAGS.LIST);
    return data;
  },

  update: async (flags: { key: string; value: string }[]): Promise<FeatureFlag[]> => {
    const { data } = await api.patch(URLS.FEATURE_FLAGS.UPDATE, { flags });
    return data;
  },
};
