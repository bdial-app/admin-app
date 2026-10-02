import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, UserX, Shield, UserPlus, Store, Trash2, Pencil, Bell, Users as UsersIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EditUserDialog } from '../components/users/EditUserDialog';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import { USER_FILTER_DEFS, USER_FILTER_KEYS, USER_SORTS, userSegments, withCityOptions } from '../components/users/user-filters';
import StatusBadge from '../components/ui/StatusBadge';
import { useUsers, useUserFilterOptions, useSuspendUser, useUnsuspendUser, useSoftDeleteUser } from '../hooks/useUsers';
import { ROUTES } from '../utils/constants';
import { PermissionGate } from '../components/auth/PermissionGate';
import { toast } from 'react-toastify';
import type { User, UserFilters } from '../types';

const LIMIT = 10;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

const PLATFORM_LABEL = { android: 'Android', ios: 'iPhone', web: 'Web' } as const;

export default function Users() {
  const navigate = useNavigate();
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(USER_FILTER_KEYS);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmPause, setConfirmPause] = useState<User | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  const { data, isLoading } = useUsers({
    ...(filters as UserFilters),
    sort: (sort || undefined) as UserFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = useUserFilterOptions();

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
            <p className="text-xs truncate flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              {row.mobileNumber || row.email || '—'}
              {Array.isArray(row.pushPlatforms) && row.pushPlatforms.length > 0 && (
                <span title={`Push enabled: ${row.pushPlatforms.map((p) => PLATFORM_LABEL[p]).join(', ')}`} className="inline-flex">
                  <Bell className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
                </span>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'business',
      header: 'Business',
      render: (row) =>
        row.provider ? (
          <div className="min-w-0 flex flex-col items-start gap-1">
            <Link
              to={ROUTES.PROVIDER_VIEW.replace(':id', row.provider.id)}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium truncate max-w-[12rem] hover:underline"
              style={{ color: 'var(--text-primary)' }}
            >
              {row.provider.brandName}
            </Link>
            <StatusBadge status={row.provider.status} />
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Customer</span>
        ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span
          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize"
          style={{
            background: row.role !== 'customer' ? 'var(--color-info-light)' : 'var(--surface-2)',
            color: row.role !== 'customer' ? 'var(--color-info-dark)' : 'var(--text-secondary)',
          }}
        >
          {row.role.replace('_', ' ')}
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
      key: 'lastSeenAt',
      header: 'Last active',
      render: (row) => (
        <span
          className="text-sm whitespace-nowrap"
          title={row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString('en-IN') : 'No activity recorded'}
          style={{ color: row.lastSeenAt ? 'var(--text-secondary)' : 'var(--text-muted)' }}
        >
          {timeAgo(row.lastSeenAt)}
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
        description={
          data?.meta
            ? hasNarrowing && filterOptions
              ? `${data.meta.total.toLocaleString()} of ${filterOptions.counts.total.toLocaleString()} users match your filters`
              : `${data.meta.total.toLocaleString()} users total`
            : undefined
        }
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

      <FilterBar
        defs={withCityOptions(USER_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by name, mobile, or email…' }}
        sort={{ options: USER_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: newest first' }}
        segments={userSegments(filterOptions)}
        resultCount={hasNarrowing ? data?.meta?.total : undefined}
        totalCount={filterOptions?.counts.total}
      />

      <DataTable<User>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelectedUser}
        emptyIcon={<UsersIcon className="w-10 h-10" />}
        emptyTitle={hasNarrowing ? 'No users match these filters' : 'No users yet'}
        emptyDescription={hasNarrowing ? 'Remove a filter or pick a different segment above.' : undefined}
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
              <PermissionGate permission="users.update">
                <button
                  onClick={() => setEditUser(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                >
                  <Pencil className="w-4 h-4 inline mr-1.5" />
                  Edit
                </button>
              </PermissionGate>
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
                <PermissionGate permission="users.suspend">
                <button
                  onClick={() => setConfirmPause(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-warning, #f59e0b)' }}
                >
                  <UserX className="w-4 h-4 inline mr-1.5" />
                  Pause
                </button>
                </PermissionGate>
              )}
              {selectedUser.status === 'paused' && (
                <PermissionGate permission="users.suspend">
                <button
                  onClick={() => setConfirmActivate(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-success)' }}
                >
                  <Shield className="w-4 h-4 inline mr-1.5" />
                  Activate
                </button>
                </PermissionGate>
              )}
              {selectedUser.status !== 'deleted' && selectedUser.role !== 'admin' && (
                <PermissionGate permission="users.delete">
                <button
                  onClick={() => setConfirmDelete(selectedUser)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-danger)' }}
                >
                  <Trash2 className="w-4 h-4 inline mr-1.5" />
                  Delete
                </button>
                </PermissionGate>
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

      {/* Edit User */}
      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSaved={(updated) => {
          setEditUser(updated);
          // Keep the panel behind the dialog in step with what was just saved.
          setSelectedUser((prev) => (prev && prev.id === updated.id ? updated : prev));
        }}
      />

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
