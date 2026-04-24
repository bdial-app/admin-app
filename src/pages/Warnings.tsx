import { useState } from 'react';
import { Eye, Plus, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import StatusBadge from '../components/ui/StatusBadge';
import { useWarnings, useCreateWarning } from '../hooks/useWarnings';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { ProviderWarning } from '../types';

const LIMIT = 10;

const WARNING_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Report Warning', value: 'report_warning' },
  { label: 'Policy Violation', value: 'policy_violation' },
  { label: 'Content Warning', value: 'content_warning' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Warnings() {
  const [page, setPage] = useState(1);
  const [warningType, setWarningType] = useState('');
  const [selected, setSelected] = useState<ProviderWarning | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ providerId: '', warningType: 'policy_violation', title: '', message: '' });

  const { data, isLoading } = useWarnings({
    page,
    limit: LIMIT,
    warningType: warningType || undefined,
  });

  const createMutation = useCreateWarning();

  const handleCreate = async () => {
    if (!createForm.providerId || !createForm.title || !createForm.message) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await createMutation.mutateAsync(createForm);
      toast.success('Warning issued');
      setShowCreate(false);
      setCreateForm({ providerId: '', warningType: 'policy_violation', title: '', message: '' });
    } catch {
      toast.error('Failed to create warning');
    }
  };

  const columns: Column<ProviderWarning>[] = [
    {
      key: 'title',
      header: 'Warning',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.title || '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {row.provider?.brandName || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'warningType',
      header: 'Type',
      render: (row) => (
        <span
          className="inline-flex px-2 py-0.5 text-xs font-medium rounded capitalize"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          {row.warningType?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'isRead',
      header: 'Read',
      render: (row) => (
        <StatusBadge status={row.isRead ? 'read' : 'unread'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Issued',
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
          onClick={(e) => { e.stopPropagation(); setSelected(row); }}
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
        title="Warnings"
        description={data?.meta ? `${data.meta.total.toLocaleString()} warnings issued` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Warnings' },
        ]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4 inline mr-1.5" />
            Issue Warning
          </button>
        }
      />

      <DataTable<ProviderWarning>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
        filters={
          <select
            value={warningType}
            onChange={(e) => { setWarningType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg focus-ring"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            {WARNING_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        }
      />

      {/* Warning Detail */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Warning Detail'}
        subtitle={selected?.provider?.brandName || undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Provider', value: selected.provider?.brandName },
                { label: 'Type', value: selected.warningType?.replace(/_/g, ' ') },
                { label: 'Read', value: selected.isRead ? 'Yes' : 'No' },
                { label: 'Issued', value: formatDate(selected.createdAt) },
                { label: 'Issued By', value: selected.issuer?.name },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{field.label}</p>
                  <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{field.value || '—'}</p>
                </div>
              ))}
            </div>

            {selected.message && (
              <div>
                <p className="text-xs font-medium uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Message</p>
                <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
                  {selected.message}
                </p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Create Warning Panel */}
      <DetailPanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Issue Warning"
        actions={
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--color-warning)' }}
          >
            {createMutation.isPending ? 'Issuing…' : 'Issue Warning'}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Provider ID *
            </label>
            <input
              type="text"
              value={createForm.providerId}
              onChange={(e) => setCreateForm({ ...createForm, providerId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Enter provider ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Warning Type *
            </label>
            <select
              value={createForm.warningType}
              onChange={(e) => setCreateForm({ ...createForm, warningType: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="policy_violation">Policy Violation</option>
              <option value="content_warning">Content Warning</option>
              <option value="report_warning">Report Warning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Title *
            </label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Warning title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Message *
            </label>
            <textarea
              value={createForm.message}
              onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'none' }}
              rows={4}
              placeholder="Describe the reason for this warning…"
            />
          </div>
        </div>
      </DetailPanel>
    </div>
  );
}
