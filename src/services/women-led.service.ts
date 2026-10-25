import api from './api';

export type WomenLedRole = 'owner' | 'co_owner' | 'runs_it';
export type WomenLedTab = 'pending' | 'approved' | 'not_approved' | 'all';
export type WomenLedRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'ended';

export const ROLE_LABEL: Record<WomenLedRole, string> = {
  owner: 'Owner',
  co_owner: 'Co-owner',
  runs_it: 'Runs it day to day',
};

export const SOURCE_LABEL: Record<string, string> = {
  owner: 'Owner asked in the app',
  onboarding: 'Ticked when listing the business',
  admin: 'Recorded by the team',
  import: 'Bulk import',
  legacy: 'From before reviews were recorded',
};

export interface WomenLedRow {
  id: string;
  status: WomenLedRequestStatus;
  source: string;
  womanName: string;
  role: WomenLedRole;
  note: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  endedAt: string | null;
  endedReason: 'turned_off' | 'revoked' | null;
  endNote: string | null;
  hasProof: boolean;
  provider: { id: string; brandName: string; slug: string; city: string | null; area: string | null; status: string };
  owner: { name: string | null; phone: string | null; gender: string | null };
  idCheck: { aadhaarStatus: string | null; verificationStatus: string | null };
}

export interface WomenLedList {
  items: WomenLedRow[];
  total: number;
  page: number;
  limit: number;
  counts: { pending: number; approved: number; notApproved: number };
}

export interface WomenLedHistoryItem {
  id: string;
  status: WomenLedRequestStatus;
  source: string;
  womanName: string;
  role: WomenLedRole;
  requestedAt: string;
  requestedBy: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  endedAt: string | null;
  endedBy: string | null;
  endedReason: 'turned_off' | 'revoked' | null;
  endNote: string | null;
}

export interface WomenLedDetail {
  request: {
    id: string;
    status: WomenLedRequestStatus;
    source: string;
    womanName: string;
    role: WomenLedRole;
    note: string | null;
    createdAt: string;
    decisionNote: string | null;
    hasProof: boolean;
    evidenceName: string | null;
    evidenceType: string | null;
  };
  provider: {
    id: string;
    brandName: string;
    slug: string;
    city: string | null;
    area: string | null;
    status: string;
    contactNumber: string | null;
    profilePhotoUrl: string | null;
    womenLedStatus: string;
  };
  owner: { id: string; name: string | null; phone: string | null; gender: string | null } | null;
  idCheck: {
    status: string;
    aadhaarStatus: string;
    aadhaarDocUrl: string | null;
    ijamatStatus: string;
    ijamatDocUrl: string | null;
    reviewerName: string | null;
  } | null;
  history: WomenLedHistoryItem[];
}

export const womenLedService = {
  list: async (params: { tab: WomenLedTab; page?: number; limit?: number; search?: string }): Promise<WomenLedList> => {
    const { data } = await api.get('/admin/women-led/requests', { params });
    return data;
  },
  detail: async (id: string): Promise<WomenLedDetail> => {
    const { data } = await api.get(`/admin/women-led/requests/${id}`);
    return data;
  },
  /** The private proof file, opened in a new tab. */
  openProof: async (id: string): Promise<void> => {
    const { data } = await api.get(`/admin/women-led/requests/${id}/proof`, { responseType: 'blob' });
    const url = URL.createObjectURL(data as Blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  approve: async (id: string, note?: string) => (await api.patch(`/admin/women-led/requests/${id}/approve`, { note })).data,
  reject: async (id: string, reason: string) => (await api.patch(`/admin/women-led/requests/${id}/reject`, { reason })).data,
  revoke: async (providerId: string, reason: string) => (await api.post(`/admin/women-led/business/${providerId}/revoke`, { reason })).data,
  grant: async (providerId: string, body: { womanName?: string; role?: WomenLedRole; note?: string }) =>
    (await api.post(`/admin/women-led/business/${providerId}/grant`, body)).data,
  forProvider: async (providerId: string): Promise<{ state: string; requestId: string | null; womanName: string | null; role: WomenLedRole | null }> =>
    (await api.get(`/admin/women-led/business/${providerId}`)).data,
};
