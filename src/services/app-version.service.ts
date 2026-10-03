import api from './api';
import { URLS } from '../utils/urls';
import type { AppVersionConfig, AppVersionInput } from '../types/app-version';

export const appVersionService = {
  get: () =>
    api.get<AppVersionConfig>(URLS.APP_VERSION.GET).then(r => r.data),

  update: (body: AppVersionInput) =>
    api.put<AppVersionConfig>(URLS.APP_VERSION.UPDATE, body).then(r => r.data),
};
