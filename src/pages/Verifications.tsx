import { useState, useEffect, useCallback } from 'react';
import { Eye, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../services/api';

// ── Types matching the backend response exactly ──────────────────────────────
type DocStatus    = 'pending' | 'approved' | 'rejected';
type IjamatStatus = 'pending' | 'approved' | 'rejected' | 'not_submitted';

interface VerificationUser {
  id: string;
  name: string | null;
  mobileNumber: string;
}

interface Verification {
  id: string;
  userId: string;
  aadhaarStatus: DocStatus;
  ijamatStatus: IjamatStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: VerificationUser;
  aadhaarUrl?: string | null;
  ijamatUrl?: string | null;
  ijamatNumber?: string | null;
  ijamatExpiry?: string | null;
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const ROWS = 10;

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    approved:      'bg-green-100 text-green-800',
    rejected:      'bg-red-100 text-red-800',
    not_submitted: 'bg-gray-100 text-gray-500',
    pending:       'bg-yellow-100 text-yellow-800',
  };
  const labels: Record<string, string> = {
    approved: 'Approved', rejected: 'Rejected',
    not_submitted: 'Not Submitted', pending: 'Pending',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded font-medium ${map[status] ?? map.pending}`}>
      {labels[status] ?? status}
    </span>
  );
};

// ── Component ────────────────────────────────────────────────────────────────
const Registrations = () => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [pagination, setPagination]       = useState<Pagination | null>(null);
  const [page, setPage]                   = useState(1);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // Review modal state
  const [selected,        setSelected]        = useState<Verification | null>(null);
  const [aadhaarStatus,   setAadhaarStatus]   = useState<DocStatus>('pending');
  const [ijamatStatus,    setIjamatStatus]    = useState<IjamatStatus>('pending');
  const [adminNotes,      setAdminNotes]      = useState('');
  const [isSaving,        setIsSaving]        = useState(false);

  const fetchVerifications = useCallback(async (p: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/admin/verifications?page=${p}&rows=${ROWS}`);
      
      // Safely unwrap in case of multi-nested responses (e.g. { data: { data: [], pagination: {} } })
      let payload = res.data;
      while (payload && !payload.pagination && payload.data && payload.data.pagination) {
        payload = payload.data;
      }

      setVerifications(Array.isArray(payload?.data) ? payload.data : []);
      setPagination(payload?.pagination ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load verifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchVerifications(page); }, [fetchVerifications, page]);

  const openReview = (v: Verification) => {
    setSelected(v);
    setAadhaarStatus(v.aadhaarStatus);
    setIjamatStatus(v.ijamatStatus);
    setAdminNotes(v.adminNotes ?? '');
  };

  const handleReview = async (overallAction?: 'approved' | 'rejected') => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await api.patch(`/admin/verifications/${selected.id}/review`, {
        aadhaarStatus: overallAction ?? aadhaarStatus,
        ijamatStatus,
        adminNotes,
      });
      await fetchVerifications(page);
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to update verification');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Provider Verifications</h2>
          {pagination && !isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.totalCount} pending verification{pagination.totalCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Provider', 'Mobile', 'Submitted', 'Aadhaar', 'iJamat', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-red-500 text-sm">{error}</td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No pending verifications at the moment.
                  </td>
                </tr>
              ) : verifications.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">

                  {/* Provider */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {(v.user.name ?? v.user.mobileNumber).charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{v.user.name ?? '—'}</span>
                    </div>
                  </td>

                  {/* Mobile */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {v.user.mobileNumber}
                  </td>

                  {/* Submitted */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Aadhaar */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={v.aadhaarStatus} />
                  </td>

                  {/* iJamat */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={v.ijamatStatus} />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Dialog.Root>
                      <Dialog.Trigger asChild>
                        <button
                          onClick={() => openReview(v)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 text-sm"
                        >
                          <Eye className="h-4 w-4" /> Review
                        </button>
                      </Dialog.Trigger>

                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                          <Dialog.Title className="text-lg font-bold text-gray-900 mb-1">
                            Review Verification
                          </Dialog.Title>
                          <p className="text-sm text-gray-500 mb-5">
                            {selected?.user.name ?? selected?.user.mobileNumber}
                          </p>

                          <div className="space-y-4">
                            {/* Aadhaar status */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                                Aadhaar Status
                              </label>
                              <select
                                value={aadhaarStatus}
                                onChange={e => setAadhaarStatus(e.target.value as DocStatus)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>

                            {/* iJamat status */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                                iJamat Status
                              </label>
                              <select
                                value={ijamatStatus}
                                onChange={e => setIjamatStatus(e.target.value as IjamatStatus)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="not_submitted">Not Submitted</option>
                              </select>
                            </div>

                            {/* Admin notes */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                                Admin Notes
                              </label>
                              <textarea
                                rows={3}
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                placeholder="Leave a note regarding this verification…"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          {/* Footer actions */}
                          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                            <div className="flex gap-2">
                              <Dialog.Close asChild>
                                <button
                                  onClick={() => handleReview('rejected')}
                                  disabled={isSaving}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" /> Reject
                                </button>
                              </Dialog.Close>
                              <Dialog.Close asChild>
                                <button
                                  onClick={() => handleReview('approved')}
                                  disabled={isSaving}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-md disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Approve
                                </button>
                              </Dialog.Close>
                            </div>

                            <div className="flex gap-2">
                              <Dialog.Close asChild>
                                <button className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md">
                                  Cancel
                                </button>
                              </Dialog.Close>
                              <Dialog.Close asChild>
                                <button
                                  onClick={() => handleReview()}
                                  disabled={isSaving}
                                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                                >
                                  {isSaving ? 'Saving…' : 'Save'}
                                </button>
                              </Dialog.Close>
                            </div>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && !isLoading && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">{(page - 1) * ROWS + 1}</span>–
              <span className="font-medium">{Math.min(page * ROWS, pagination.totalCount)}</span>
              {' '}of{' '}
              <span className="font-medium">{pagination.totalCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={!pagination.hasPreviousPage}
                className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNextPage}
                className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Registrations;
