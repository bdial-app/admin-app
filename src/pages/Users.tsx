import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Eye, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { fetchUsers, type ApiUser } from '../store/slices/usersSlice';
import type { AppDispatch, RootState } from '../store/store';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const LIMIT = 10;
const STATUS_OPTIONS = [
  { label: 'All Status', value: '' }, { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' }, { label: 'Deleted', value: 'deleted' },
];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const Users = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { users, meta, isLoading, error } = useSelector((s: RootState) => s.users);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);

  useEffect(() => { setPage(1); }, [search, status]);

  const load = useCallback(() => {
    dispatch(fetchUsers({ page, limit: LIMIT, ...(search ? { search } : {}), ...(status ? { status } : {}) }));
  }, [dispatch, page, search, status]);

  useEffect(() => { const id = setTimeout(load, search ? 500 : 0); return () => clearTimeout(id); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Platform Users</h2>
        {!isLoading && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {meta.total > 0 ? `${meta.total} users total` : 'No users found'}
        </p>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or mobile…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg focus-ring cursor-pointer"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(search || status) && <button onClick={() => { setSearch(''); setStatus(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>
          <X className="w-3.5 h-3.5" />Clear</button>}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-40 rounded" /><div className="skeleton h-3 w-24 rounded" /></div>
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          ))}</div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p></div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full">
            <thead><tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-default)' }}>
              {['User', 'Mobile', 'Location', 'Joined', 'Status', 'Action'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--surface-0)' }}
                onMouseEnter={e => (e.currentTarget).style.background = 'var(--surface-1)'}
                onMouseLeave={e => (e.currentTarget).style.background = 'var(--surface-0)'}>
                <td className="px-5 py-3.5"><div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--color-info-light)', color: 'var(--color-info-dark)' }}>
                    {(u.name ?? u.mobileNumber).charAt(0).toUpperCase()}</div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name ?? '—'}</span>
                </div></td>
                <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{u.mobileNumber}</td>
                <td className="px-5 py-3.5">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{u.city ?? '—'}</span>
                  {u.area && <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{u.area}</span>}
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={u.status} /></td>
                <td className="px-5 py-3.5">
                  <button onClick={() => setDetailUser(u)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                    style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <Eye className="h-3.5 w-3.5" />View</button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}

        {/* Pagination */}
        {!isLoading && meta.totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Showing <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(page - 1) * LIMIT + 1}</span>–
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.min(page * LIMIT, meta.total)}</span> of{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.total}</span>
            </p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages}
                className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <Dialog.Root open={!!detailUser} onOpenChange={open => { if (!open) setDetailUser(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-in-up"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', padding: '24px' }}>
            <Dialog.Title className="text-lg font-bold pb-3 mb-4" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}>User Details</Dialog.Title>
            {detailUser && <div className="space-y-4 text-sm">
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
                  style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  {(detailUser.name ?? detailUser.mobileNumber).charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{detailUser.name ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{detailUser.mobileNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Gender" value={detailUser.gender ?? '—'} capitalize />
                <Field label="Role" value={detailUser.role} capitalize />
                <Field label="Status" value={detailUser.status} capitalize />
                <Field label="Joined" value={formatDate(detailUser.createdAt)} />
              </div>
              {(detailUser.city || detailUser.area || detailUser.pincode) && (
                <div className="pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Location</p>
                  <div className="p-3 rounded-xl grid grid-cols-2 gap-3" style={{ background: 'var(--surface-1)' }}>
                    <Field label="City" value={detailUser.city ?? '—'} />
                    <Field label="Area" value={detailUser.area ?? '—'} />
                    <Field label="Pincode" value={detailUser.pincode ?? '—'} />
                  </div>
                </div>
              )}
              {detailUser._count && (
                <div className="pt-3 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <Field label="Listings" value={String(detailUser._count.listings)} />
                  <Field label="Reviews" value={String(detailUser._count.reviews)} />
                </div>
              )}
            </div>}
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild><button className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>Close</button></Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

const Field = ({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
    <p className={`mt-0.5 text-sm font-medium ${capitalize ? 'capitalize' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</p>
  </div>
);

export default Users;
