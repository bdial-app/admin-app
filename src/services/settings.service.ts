import api from './api';
import { URLS } from '../utils/urls';
import type { SystemSetting } from '../types/system-setting';

export const settingsService = {
  list: () =>
    api.get<SystemSetting[]>(URLS.SETTINGS.LIST).then(r => r.data),

  update: (settings: { key: string; value: string }[]) =>
    api.patch<SystemSetting[]>(URLS.SETTINGS.UPDATE, { settings }).then(r => r.data),

  create: (body: { key: string; value: string; type?: string; group?: string; description?: string }) =>
    api.post<SystemSetting>(URLS.SETTINGS.CREATE, body).then(r => r.data),

  remove: (id: string) =>
    api.delete(URLS.SETTINGS.DELETE(id)).then(r => r.data),
};
