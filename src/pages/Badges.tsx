import { useState } from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { FormField } from '../components/ui/FormField';
import { useBadges, useCreateBadge, useUpdateBadge, useDeleteBadge } from '../hooks/useBadges';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { ProviderBadge, BadgeType } from '../types';

const LIMIT = 10;

const BADGE_TYPES: { label: string; value: BadgeType }[] = [
  { label: 'Gold Seller', value: 'gold_seller' },
  { label: 'Top Rated', value: 'top_rated' },
  { label: 'Express Service', value: 'express_service' },
  { label: 'Trusted', value: 'trusted' },
  { label: 'Rising Star', value: 'rising_star' },
];

const BADGE_EMOJI: Record<string, string> = {
  gold_seller: '🥇',
  top_rated: '⭐',
  express_service: '⚡',
  trusted: '✅',
  rising_star: '🌟',
};

const TYPE_TABS = [
  { label: 'All', value: '' },
  ...BADGE_TYPES.map(b => ({ label: b.label, value: b.value })),
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Badges() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<ProviderBadge | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProviderBadge | null>(null);
  const [form, setForm] = useState({ providerId: '', type: 'gold_seller' as string, source: 'earned' as string, expiresAt: '' });

  const { data, isLoading } = useBadges({ page, limit: LIMIT, type: type || undefined });
  const createMutation = useCreateBadge();
  const updateMutation = useUpdateBadge();
  const deleteMutation = useDeleteBadge();

  const openCreate = () => {
    setForm({ providerId: '', type: 'gold_seller', source: 'earned', expiresAt: '' });
    setCreating(true);
    setSelected(null);
  };

  const handleCreate = async () => {
    if (!form.providerId.trim()) { toast.error('Provider ID is required'); return; }
    try {
      await createMutation.mutateAsync({
        providerId: form.providerId,
        type: form.type,
        source: form.source,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success('Badge awarded');
      setCreating(false);
    } catch {
      toast.error('Failed to award badge');
    }
  };

  const handleToggleActive = async (badge: ProviderBadge) => {
    try {
      await updateMutation.mutateAsync({ id: badge.id, body: { isActive: !badge.isActive } });
      toast.success(badge.isActive ? 'Badge deactivated' : 'Badge activated');
    } catch {
      toast.error('Failed to update badge');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success('Badge revoked');
      setConfirmDelete(null);
      setSelected(null);
    } catch {
      toast.error('Failed to revoke badge');
    }
  };

  const columns: Column<ProviderBadge>[] = [
    {
      key: 'badge',
      header: 'Badge',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: 'var(--color-warning-light)' }}>
            {BADGE_EMOJI[row.type] || '🏅'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
              {row.type.replace(/_/g, ' ')}
            </p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{row.source}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {row.provider?.brandName || row.providerId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const isExpired = row.expiresAt && new Date(row.expiresAt) < new Date();
        if (!row.isActive) return <StatusBadge status="disabled" />;
        if (isExpired) return <StatusBadge status="expired" />;
        return <StatusBadge status="active" />;
      },
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {row.expiresAt ? formatDate(row.expiresAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Awarded',
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(row); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-danger)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Revoke"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Provider Badges"
        description="Manage badges awarded to providers"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Badges' }]}
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: 'var(--color-primary)' }}>
            <Plus className="w-4 h-4" /> Award Badge
          </button>
        }
      />

      {/* Type Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit overflow-x-auto" style={{ background: 'var(--surface-1)' }}>
        {TYPE_TABS.map((tab) => (
          <button key={tab.value} onClick={() => { setType(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap" style={{
            background: type === tab.value ? 'var(--surface-0)' : 'transparent',
            color: type === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: type === tab.value ? 'var(--shadow-sm)' : 'none',
          }}>
            {tab.value ? `${BADGE_EMOJI[tab.value] || ''} ${tab.label}` : tab.label}
          </button>
        ))}
      </div>

      <DataTable<ProviderBadge>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={setSelected}
      />

      {/* Badge Detail */}
      <DetailPanel
        open={!!selected && !creating}
        onClose={() => setSelected(null)}
        title="Badge Details"
        subtitle={selected ? selected.type.replace(/_/g, ' ') : undefined}
        actions={
          selected ? (
            <div className="flex gap-2">
              <button onClick={() => handleToggleActive(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                {selected.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => setConfirmDelete(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-danger)' }}>Revoke</button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <span className="text-5xl">{BADGE_EMOJI[selected.type] || '🏅'}</span>
              <p className="text-lg font-bold capitalize mt-2" style={{ color: 'var(--text-primary)' }}>
                {selected.type.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Provider', value: selected.provider?.brandName || selected.providerId.slice(0, 8) },
                { label: 'Source', value: selected.source },
                { label: 'Expires', value: selected.expiresAt ? formatDate(selected.expiresAt) : 'Never' },
                { label: 'Awarded', value: formatDate(selected.createdAt) },
              ].map((field) => (
                <div key={field.label} className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{field.label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate capitalize" style={{ color: 'var(--text-primary)' }}>{field.value}</p>
                </div>
              ))}
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Status</p>
                <div className="mt-1">
                  {(() => {
                    const isExpired = selected.expiresAt && new Date(selected.expiresAt) < new Date();
                    if (!selected.isActive) return <StatusBadge status="disabled" />;
                    if (isExpired) return <StatusBadge status="expired" />;
                    return <StatusBadge status="active" />;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Create Form */}
      <DetailPanel
        open={creating}
        onClose={() => setCreating(false)}
        title="Award Badge"
        actions={
          <button onClick={handleCreate} disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
            {createMutation.isPending ? 'Awarding…' : 'Award'}
          </button>
        }
      >
        <div className="space-y-4">
          <FormField label="Provider ID" required>
            <input type="text" value={form.providerId} onChange={(e) => setForm(prev => ({ ...prev, providerId: e.target.value }))} placeholder="Enter provider UUID" className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </FormField>
          <FormField label="Badge Type" required>
            <select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              {BADGE_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{BADGE_EMOJI[bt.value]} {bt.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Source">
            <select value={form.source} onChange={(e) => setForm(prev => ({ ...prev, source: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="earned">Earned</option>
              <option value="paid">Paid</option>
            </select>
          </FormField>
          <FormField label="Expires At">
            <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm(prev => ({ ...prev, expiresAt: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Leave empty for permanent badge</p>
          </FormField>
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Revoke Badge"
        description={`Are you sure you want to permanently revoke this "${confirmDelete?.type.replace(/_/g, ' ')}" badge? This action cannot be undone.`}
        confirmLabel="Revoke"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
