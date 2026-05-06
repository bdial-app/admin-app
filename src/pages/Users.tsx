import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, UserX, Shield, UserPlus, Store, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { useUsers, useSuspendUser, useUnsuspendUser, useSoftDeleteUser } from '../hooks/useUsers';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { User, UserStatus } from '../types';

const LIMIT = 10;
const STATUS_OPTIONS: { label: string; value: UserStatus | '' }[] = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Paused', value: 'paused' },
  { label: 'Deleted', value: 'deleted' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Users() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmPause, setConfirmPause] = useState<User | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const { data, isLoading } = useUsers({
    page,
    limit: LIMIT,
    search: search || undefined,
    status: status || undefined,
  });

  const suspendMutation = useSuspendUser();
  const unsuspendMutation = useUnsuspendUser();
  const deleteMutation = useSoftDeleteUser();

  const handlePause = async () => {
    if (!confirmPause) return;
    try {
      await suspendMutation.mutateAsync(confirmPause.id);
      toast.success('User paused');
      setConfirmPause(null);
      setSelectedUser(null);
    } catch {
      toast.error('Failed to pause user');
    }
  };

  const handleActivate = async () => {
    if (!confirmActivate) return;
    try {
      await unsuspendMutation.mutateAsync(confirmActivate.id);
      toast.success('User activated');
      setConfirmActivate(null);
      setSelectedUser(null);
    } catch {
      toast.error('Failed to activate user');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success('User deleted');
      setConfirmDelete(null);
      setSelectedUser(null);
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'var(--color-primary)' }}
          >
            {(row.name || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.name || '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {row.mobileNumber || row.email || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span
          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize"
          style={{
            background: row.role === 'admin' ? 'var(--color-info-light)' : 'var(--surface-2)',
            color: row.role === 'admin' ? 'var(--color-info-dark)' : 'var(--text-secondary)',
          }}
        >
          {row.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'city',
      header: 'Location',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {[row.area, row.city].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelectedUser(row); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description={data?.meta ? `${data.meta.total.toLocaleString()} users total` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Users' },
        ]}
        actions={
          <button
            onClick={() => navigate(ROUTES.CREATE_USER)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        }
      />

      <DataTable<User>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by name, mobile, or email…"
        searchValue={search}
        rowKey={(row) => row.id}
        onRowClick={setSelectedUser}
        filters={
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as UserStatus | ''); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg focus-ring"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        }
      />

      {/* User Detail Panel */}
      <DetailPanel
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.name || 'User Detail'}
        subtitle={selectedUser?.mobileNumber || selectedUser?.email || undefined}
        actions={
          selectedUser && (
            <>
              {selectedUser.status === 'active' && !selectedUser.provider && (
                <button
                  onClick={() => navigate(`${ROUTES.CREATE_PROVIDER}?mobile=${selectedUser.mobileNumber}`)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Store className="w-4 h-4 inline mr-1.5" />
                  Make Provider
                </button>
              )}
              {selectedUser.status === 'active' && (
                <button
                  onClick={() => setConfirmPause(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-warning, #f59e0b)' }}
                >
                  <UserX className="w-4 h-4 inline mr-1.5" />
                  Pause
                </button>
              )}
              {selectedUser.status === 'paused' && (
                <button
                  onClick={() => setConfirmActivate(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-success)' }}
                >
                  <Shield className="w-4 h-4 inline mr-1.5" />
                  Activate
                </button>
              )}
              {selectedUser.status !== 'deleted' && selectedUser.role !== 'admin' && (
                <button
                  onClick={() => setConfirmDelete(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-danger)' }}
                >
                  <Trash2 className="w-4 h-4 inline mr-1.5" />
                  Delete
                </button>
              )}
            </>
          )
        }
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {(selectedUser.name || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedUser.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {selectedUser.role} · <StatusBadge status={selectedUser.status} />
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mobile', value: selectedUser.mobileNumber },
                { label: 'Email', value: selectedUser.email },
                { label: 'Gender', value: selectedUser.gender },
                { label: 'City', value: selectedUser.city },
                { label: 'Area', value: selectedUser.area },
                { label: 'Pincode', value: selectedUser.pincode },
                { label: 'Language', value: selectedUser.preferredLanguage },
                { label: 'Mode', value: selectedUser.preferredMode },
                { label: 'Joined', value: formatDate(selectedUser.createdAt) },
                { label: 'Last Seen', value: selectedUser.lastSeenAt ? formatDate(selectedUser.lastSeenAt) : null },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {field.value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Pause Confirmation */}
      <ConfirmDialog
        open={!!confirmPause}
        onClose={() => setConfirmPause(null)}
        onConfirm={handlePause}
        title="Pause User"
        description={`Are you sure you want to pause ${confirmPause?.name || 'this user'}? They will be blocked from logging in, their provider will be hidden, and their chats will be deactivated. This is reversible.`}
        confirmLabel="Pause User"
        variant="danger"
        isLoading={suspendMutation.isPending}
      />

      {/* Activate Confirmation */}
      <ConfirmDialog
        open={!!confirmActivate}
        onClose={() => setConfirmActivate(null)}
        onConfirm={handleActivate}
        title="Activate User"
        description={`Are you sure you want to re-activate ${confirmActivate?.name || 'this user'}? They will regain full access, their provider will be restored, and chats reactivated.`}
        confirmLabel="Activate"
        variant="default"
        isLoading={unsuspendMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to permanently delete ${confirmDelete?.name || 'this user'}? This will soft-delete their account and disable their provider. This action cannot be easily reversed.`}
        confirmLabel="Delete User"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
