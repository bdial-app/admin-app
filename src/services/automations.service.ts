import api from './api';
import type { WaTemplateStatus } from '../types';

/** One automated WhatsApp message (GET /admin/automations). */
export interface Automation {
  key: string;
  name: string;
  when: string;
  audience: 'owner' | 'customer';
  category: 'utility' | 'marketing';
  templateName: string;
  templateBody: string;
  templateStatus: WaTemplateStatus | 'missing';
  /** What Meta has it as now (it can re-file utility as marketing). */
  templateCategory: string | null;
  /** False when the existing template has a different number of blanks than this automation fills. */
  templateMatches?: boolean;
  /** Where the page lists it. */
  section?: 'alerts' | 'listing_updates' | 'asking' | 'customers';
  enabled: boolean;
  monthlyBudgetInr: number | null;
  last7Days: {
    scheduled: number;
    sent: number;
    failed: number;
    waiting: number;
    opened: number;
    costInr: number;
    skipped: Record<string, number>;
  };
}

export interface AutomationJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  status: 'pending' | 'processing' | 'sent' | 'skipped' | 'cancelled' | 'failed';
  reason: string | null;
  phone: string | null;
  providerId: string | null;
  businessName: string | null;
  userName: string | null;
}

export const automationsService = {
  list: async (): Promise<Automation[]> => (await api.get('/admin/automations')).data,
  jobs: async (key: string): Promise<AutomationJob[]> => (await api.get(`/admin/automations/${key}/jobs`, { params: { limit: 50 } })).data,
  update: async (key: string, body: { enabled?: boolean; monthlyBudgetInr?: number | null }) => {
    await api.patch(`/admin/automations/${key}`, body);
  },
  test: async (key: string, phone: string): Promise<{ ok: boolean; reason?: string }> =>
    (await api.post(`/admin/automations/${key}/test`, { phone })).data,
};
