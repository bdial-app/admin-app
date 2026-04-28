import api from './api';
import { URLS } from '../utils/urls';
import type { ExportEntity } from '../types';

export const exportService = {
  downloadCsv: async (entity: ExportEntity): Promise<Blob> => {
    const { data } = await api.get(URLS.EXPORT.CSV(entity), {
      responseType: 'blob',
    });
    return data;
  },
};
