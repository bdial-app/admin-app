import { useState } from 'react';
import { Shield, UserPlus, Loader2, Search, Trash2, Edit, Phone, Mail } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAdminUsers, useCreateAdminUser, useUpdateAdminUser, useRemoveAdminUser } from '../hooks/useAdminUsers';
import { ROUTES } from '../utils/constants';
import type { User } from '../types/user';

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers({ page, limit: 20, search: search || undefined });
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const removeMutation = useRemoveAdminUser();

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [form, setForm] = useState({ mobileNumber: '', name: '', email: '', gender: 'female' });
  const [editForm, setEditForm] = useState({ name: '', status: '' });

  const handleCreate = () => {
    if (!form.mobileNumber || !form.name) return;
    createMutation.mutate(
      { mobileNumber: form.mobileNumber, name: form.name, email: form.email || undefined, gender: form.gender },
      { onSuccess: () => { setShowCreate(false); setForm({ mobileNumber: '', name: '', email: '', gender: 'female' }); } },
    );
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ name: user.name, status: user.status });
  };

  const handleUpdate = () => {
    if (!editUser) return;
    updateMutation.mutate(
      { id: editUser.id, name: editForm.name, status: editForm.status },
      { onSuccess: () => setEditUser(null) },
    );
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeMutation.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
  };

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description="Manage admin access and permissions"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Admin Users' }]}
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-dark transition-colors">
            <UserPlus className="w-4 h-4" /> Add Admin
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard title="Total Admins" value={data?.meta.total?.toString() ?? '—'} icon={<Shield className="w-5 h-5" />} accent="var(--color-primary)" />
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none transition-colors"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Name</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Contact</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Joined</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((user) => (
                <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {user.mobileNumber && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Phone className="w-3 h-3" /> {user.mobileNumber}
                        </div>
                      )}
                      {user.email && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{
                      background: user.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                      color: user.status === 'active' ? 'var(--color-success-dark)' : 'var(--color-danger-dark)',
                    }}>{user.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(user)} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setRemoveTarget(user)} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--color-danger)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No admin users found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
            </span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-md disabled:opacity-40" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>Prev</button>
              <button disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-md disabled:opacity-40" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Panel */}
      <DetailPanel open={showCreate} onClose={() => setShowCreate(false)} title="Add Admin User">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Mobile Number *</label>
            <input value={form.mobileNumber} onChange={(e) => setForm(f => ({ ...f, mobileNumber: e.target.value }))} placeholder="9876543210" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Gender</label>
            <select value={form.gender} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={createMutation.isPending || !form.mobileNumber || !form.name} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Admin
          </button>
        </div>
      </DetailPanel>

      {/* Edit Panel */}
      <DetailPanel open={!!editUser} onClose={() => setEditUser(null)} title="Edit Admin User">
        {editUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        )}
      </DetailPanel>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Admin Access"
        description={`Remove admin privileges from ${removeTarget?.name}? They will be demoted to a regular customer account.`}
        confirmLabel="Remove Admin"
        variant="danger"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
