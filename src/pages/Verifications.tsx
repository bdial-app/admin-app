import { useState, useEffect, useCallback } from 'react';
import { Eye, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, Shield, EyeOff } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

type DocStatus = 'pending' | 'approved' | 'rejected';
type IjamatStatus = 'pending' | 'approved' | 'rejected' | 'not_submitted';

interface VerificationUser { id: string; name: string | null; mobileNumber: string; }
interface Verification {
  id: string; userId: string; aadhaarStatus: DocStatus; ijamatStatus: IjamatStatus;
  adminNotes: string | null; reviewedAt: string | null; createdAt: string; user: VerificationUser;
  aadhaarUrl?: string | null; ijamatUrl?: string | null; ijamatNumber?: string | null; ijamatExpiry?: string | null;
}
interface Pagination { currentPage: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; }

const ROWS = 10;
const TABS = ['all', 'pending', 'approved', 'rejected'] as const;

const Registrations = () => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selected, setSelected] = useState<Verification | null>(null);
  const [aadhaarStatus, setAadhaarStatus] = useState<DocStatus>('pending');
  const [ijamatStatus, setIjamatStatus] = useState<IjamatStatus>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const fetchVerifications = useCallback(async (p: number) => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get(`/admin/verifications?page=${p}&rows=${ROWS}`);
      let payload = res.data;
      while (payload && !payload.pagination && payload.data && payload.data.pagination) payload = payload.data;
      setVerifications(Array.isArray(payload?.data) ? payload.data : []);
      setPagination(payload?.pagination ?? null);
    } catch (err: any) { setError(err.response?.data?.message ?? 'Failed to load verifications'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchVerifications(page); }, [fetchVerifications, page]);

  const openReview = (v: Verification) => {
    setSelected(v); setAadhaarStatus(v.aadhaarStatus); setIjamatStatus(v.ijamatStatus);
    setAdminNotes(v.adminNotes ?? ''); setShowDoc(false);
  };

  const handleReview = async (action?: 'approved' | 'rejected') => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await api.patch(`/admin/verifications/${selected.id}/review`, {
        aadhaarStatus: action ?? aadhaarStatus, ijamatStatus, adminNotes,
      });
      await fetchVerifications(page);
    } catch (err: any) { alert(err.response?.data?.message ?? 'Failed'); }
    finally { setIsSaving(false); }
  };

  const filteredVerifications = activeTab === 'all' ? verifications :
    verifications.filter(v => v.aadhaarStatus === activeTab || v.ijamatStatus === activeTab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Provider Verifications</h2>
        {pagination && !isLoading && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {pagination.totalCount} verification{pagination.totalCount !== 1 ? 's' : ''} total
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-2)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all"
            style={{
              background: activeTab === tab ? 'var(--surface-0)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
            }}>{tab}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-40 rounded" /><div className="skeleton h-3 w-28 rounded" /></div>
              <div className="skeleton h-6 w-16 rounded-full" /><div className="skeleton h-6 w-16 rounded-full" />
            </div>
          ))}</div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p></div>
        ) : filteredVerifications.length === 0 ? (
          <EmptyState icon={Shield} title="No verifications" description="No verifications match this filter." />
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full">
            <thead><tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-default)' }}>
              {['Provider', 'Mobile', 'Submitted', 'Aadhaar', 'iJamat', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filteredVerifications.map(v => (
              <tr key={v.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--surface-0)' }}
                onMouseEnter={e => (e.currentTarget).style.background = 'var(--surface-1)'}
                onMouseLeave={e => (e.currentTarget).style.background = 'var(--surface-0)'}>
                <td className="px-5 py-3.5"><div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}>
                    {(v.user.name ?? v.user.mobileNumber).charAt(0).toUpperCase()}</div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v.user.name ?? '—'}</span>
                </div></td>
                <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{v.user.mobileNumber}</td>
                <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-5 py-3.5"><StatusBadge status={v.aadhaarStatus} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={v.ijamatStatus} /></td>
                <td className="px-5 py-3.5">
                  <Dialog.Root><Dialog.Trigger asChild>
                    <button onClick={() => openReview(v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <Eye className="h-3.5 w-3.5" />Review</button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in-up"
                      style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', padding: '24px' }}>
                      <Dialog.Title className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Review Verification</Dialog.Title>
                      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{selected?.user.name ?? selected?.user.mobileNumber}</p>

                      {/* Secure document toggle */}
                      <button onClick={() => setShowDoc(!showDoc)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg mb-4 transition-colors"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                        {showDoc ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showDoc ? 'Hide' : 'View'} Documents
                      </button>
                      {showDoc && <div className="p-3 rounded-xl mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Document preview area — Aadhaar & iJamat documents will display here when available.</p>
                      </div>}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Aadhaar Status</label>
                          <select value={aadhaarStatus} onChange={e => setAadhaarStatus(e.target.value as DocStatus)}
                            className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                            <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>iJamat Status</label>
                          <select value={ijamatStatus} onChange={e => setIjamatStatus(e.target.value as IjamatStatus)}
                            className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                            <option value="pending">Pending</option><option value="approved">Approved</option>
                            <option value="rejected">Rejected</option><option value="not_submitted">Not Submitted</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Admin Notes</label>
                          <textarea rows={3} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                            placeholder="Leave a note…" className="w-full px-3 py-2 text-sm rounded-xl focus-ring"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'none' }} />
                        </div>
                      </div>
                      <div className="mt-6 pt-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                        <div className="flex gap-2">
                          <Dialog.Close asChild><button onClick={() => handleReview('rejected')} disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                            <XCircle className="h-4 w-4" />Reject</button></Dialog.Close>
                          <Dialog.Close asChild><button onClick={() => handleReview('approved')} disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 text-white"
                            style={{ background: 'var(--color-success)' }}>
                            <CheckCircle2 className="h-4 w-4" />Approve</button></Dialog.Close>
                        </div>
                        <div className="flex gap-2">
                          <Dialog.Close asChild><button className="px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>Cancel</button></Dialog.Close>
                          <Dialog.Close asChild><button onClick={() => handleReview()} disabled={isSaving}
                            className="px-3 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                            {isSaving ? 'Saving…' : 'Save'}</button></Dialog.Close>
                        </div>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal></Dialog.Root>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && !isLoading && (
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Showing <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(page - 1) * ROWS + 1}</span>–
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.min(page * ROWS, pagination.totalCount)}</span> of{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pagination.totalCount}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPreviousPage}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                <ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Registrations;
