import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { fetchUsers, type ApiUser } from '../store/slices/usersSlice';
import type { AppDispatch, RootState } from '../store/store';

const LIMIT = 10;

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Active',    value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Deleted',   value: 'deleted' },
];

const statusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':    return 'bg-green-100 text-green-800';
    case 'suspended': return 'bg-red-100 text-red-800';
    case 'deleted':   return 'bg-gray-100 text-gray-500';
    default:          return 'bg-yellow-100 text-yellow-800';
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Page-number helper ──────────────────────────────────────────────────────
const pageNumbers = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
};

// ── Component ───────────────────────────────────────────────────────────────
const Users = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { users, meta, isLoading, error } = useSelector((s: RootState) => s.users);

  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [page,       setPage]       = useState(1);
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, status]);

  const load = useCallback(() => {
    dispatch(fetchUsers({
      page,
      limit: LIMIT,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
    }));
  }, [dispatch, page, search, status]);

  // Debounce text search; instant for page / status
  useEffect(() => {
    const id = setTimeout(load, search ? 500 : 0);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Users</h2>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {meta.total > 0 ? `${meta.total} users total` : 'No users found'}
            </p>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(search || status) && (
          <button
            onClick={() => { setSearch(''); setStatus(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['User', 'Mobile', 'Location', 'Joined', 'Status', 'Action'].map((h) => (
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No users found.</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">

                  {/* User */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {(u.name ?? u.mobileNumber).charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{u.name ?? '—'}</span>
                    </div>
                  </td>

                  {/* Mobile */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {u.mobileNumber}
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{u.city ?? '—'}</span>
                    {u.area && <span className="block text-xs text-gray-400">{u.area}</span>}
                  </td>

                  {/* Joined */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(u.status)}`}>
                      {u.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Dialog.Root>
                      <Dialog.Trigger asChild>
                        <button
                          onClick={() => setDetailUser(u)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 text-sm"
                        >
                          <Eye className="h-4 w-4" /> View
                        </button>
                      </Dialog.Trigger>

                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                          <Dialog.Title className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
                            User Details
                          </Dialog.Title>

                          {detailUser && (
                            <div className="space-y-4 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Name"   value={detailUser.name ?? '—'} />
                                <Field label="Mobile" value={detailUser.mobileNumber} />
                                <Field label="Gender" value={detailUser.gender ?? '—'} capitalize />
                                <Field label="Role"   value={detailUser.role} capitalize />
                                <Field label="Status" value={detailUser.status} capitalize />
                                <Field label="Joined" value={formatDate(detailUser.createdAt)} />
                              </div>

                              {(detailUser.city || detailUser.area || detailUser.pincode) && (
                                <div className="pt-3 border-t">
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Location</p>
                                  <div className="bg-gray-50 rounded-md p-3 grid grid-cols-2 gap-3">
                                    <Field label="City"    value={detailUser.city    ?? '—'} />
                                    <Field label="Area"    value={detailUser.area    ?? '—'} />
                                    <Field label="Pincode" value={detailUser.pincode ?? '—'} />
                                  </div>
                                </div>
                              )}

                              {detailUser._count && (
                                <div className="pt-3 border-t grid grid-cols-2 gap-4">
                                  <Field label="Listings" value={String(detailUser._count.listings)} />
                                  <Field label="Reviews"  value={String(detailUser._count.reviews)} />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-6 flex justify-end">
                            <Dialog.Close asChild>
                              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium">
                                Close
                              </button>
                            </Dialog.Close>
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

        {/* ── Pagination ── */}
        {!isLoading && meta.totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">{(page - 1) * LIMIT + 1}</span>–
              <span className="font-medium">{Math.min(page * LIMIT, meta.total)}</span>
              {' '}of{' '}
              <span className="font-medium">{meta.total}</span> users
            </p>

            <div className="flex items-center gap-2">
              <PaginationBtn
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                label={<ChevronLeft className="h-4 w-4" />}
              />
              <PaginationBtn
                onClick={() => setPage((p) => p + 1)}
                disabled={page === meta.totalPages}
                label={<ChevronRight className="h-4 w-4" />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Small reusable sub-components ───────────────────────────────────────────
const Field = ({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) => (
  <div>
    <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
    <p className={`mt-0.5 text-sm text-gray-900 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
  </div>
);

const PaginationBtn = ({
  onClick, disabled, active, label,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`min-w-[34px] h-[34px] px-1 rounded-md text-sm font-medium border transition-colors
      ${active
        ? 'bg-blue-600 text-white border-blue-600'
        : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
      disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {label}
  </button>
);

export default Users;
