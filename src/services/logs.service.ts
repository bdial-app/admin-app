import api from './api';

/** One entry in the admin Logs timeline (GET /admin/logs). */
export interface LogItem {
  id: string;
  at: string;
  source: string;
  level: 'error' | 'warn' | 'info';
  event: string;
  message: string;
  userId: string | null;
  userName: string | null;
  userMobile: string | null;
  userRole: string | null;
  providerId: string | null;
  businessName: string | null;
  entityType: string | null;
  entityId: string | null;
  sessionId: string | null;
  requestId: string | null;
  path: string | null;
  statusCode: number | null;
  platform: string | null;
  appVersion: string | null;
  details: Record<string, unknown> | null;
}

/** The URL filters, as the API takes them. */
export type LogFilters = Partial<Record<
  'from' | 'to' | 'sources' | 'levels' | 'q' | 'user' | 'business' | 'event' | 'entityId' | 'sessionId' | 'requestId' | 'path' | 'status' | 'platform' | 'appVersion',
  string
>>;

const clean = (f: LogFilters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));

export const logsService = {
  feed: async (filters: LogFilters, before?: string, limit = 60): Promise<{ items: LogItem[]; nextCursor: string | null; from: string; to: string }> => {
    const { data } = await api.get('/admin/logs', { params: { ...clean(filters), before, limit } });
    return data;
  },

  counts: async (filters: LogFilters): Promise<{ bySource: Record<string, number>; byLevel: Record<string, number> }> => {
    const { data } = await api.get('/admin/logs/counts', { params: clean(filters) });
    return data;
  },

  /** Downloads the filtered timeline as CSV (up to 5,000 rows). */
  exportCsv: async (filters: LogFilters): Promise<void> => {
    const res = await api.get('/admin/logs/export', { params: clean(filters), responseType: 'blob', timeout: 120_000 });
    const name = /filename="?([^"]+)"?/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'logs.csv';
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  },
};
