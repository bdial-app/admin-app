import { useState } from 'react';
import { Eye } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import StatusBadge from '../components/ui/StatusBadge';
import { useBugReports, useUpdateBugReport } from '../hooks/useBugReports';
import { toast } from 'react-toastify';
import type { BugReport, BugCategory, BugReportStatus } from '../types';
import { BUG_CATEGORY_LABELS, BUG_STATUS_LABELS } from '../types';

const LIMIT = 20;

const STATUS_TABS: { label: string; value: BugReportStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const CATEGORY_OPTIONS: { label: string; value: BugCategory | '' }[] = [
  { label: 'All Categories', value: '' },
  { label: 'Crash', value: 'crash' },
  { label: 'UI Issue', value: 'ui_issue' },
  { label: 'Feature Not Working', value: 'feature_not_working' },
  { label: 'Performance', value: 'performance' },
  { label: 'Login / Auth', value: 'login_auth' },
  { label: 'Payment', value: 'payment' },
  { label: 'Other', value: 'other' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function BugReports() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BugReportStatus | ''>('');
  const [category, setCategory] = useState<BugCategory | ''>('');
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [newStatus, setNewStatus] = useState<BugReportStatus>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useBugReports({ page, limit: LIMIT, status: status || undefined, category: category || undefined });
  const updateMutation = useUpdateBugReport();

  const handleSelect = (row: BugReport) => {
    setSelected(row);
    setNewStatus(row.status);
    setAdminNotes(row.adminNotes ?? '');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        status: newStatus,
        adminNotes: adminNotes || undefined,
      });
      toast.success('Bug report updated');
      setSelected(null);
    } catch {
      toast.error('Failed to update bug report');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<BugReport>[] = [
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span
          className="inline-flex px-2 py-0.5 text-xs font-medium rounded"
          style={{ background: 'var(--color-info-light)', color: 'var(--color-info-dark)' }}
        >
          {BUG_CATEGORY_LABELS[row.category]}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-sm" title={row.description}>
          {row.description.length > 80 ? row.description.slice(0, 80) + '…' : row.description}
        </span>
      ),
    },
    {
      key: 'reporterId',
      header: 'Reporter',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.reporterId ? row.reporterId.slice(0, 8) + '…' : 'Anonymous'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'id',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleSelect(row); }}
          className="p-1.5 rounded hover:bg-accent transition-colors"
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bug Reports"
        description="Review and manage bug reports submitted by users"
      />

      {/* Status Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              status === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-3">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value as BugCategory | ''); setPage(1); }}
          className="text-sm border rounded-md px-3 py-1.5 bg-background"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} report{data.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      <DataTable<BugReport>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data ? { total: data.total, page: data.page, limit: data.limit, totalPages: data.pages } : undefined}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={handleSelect}
      />

      <DetailPanel open={!!selected} title="Bug Report Detail" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium">{BUG_CATEGORY_LABELS[selected.category]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="mt-0.5"><StatusBadge status={selected.status} /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted</span>
                <p className="font-medium">{formatDate(selected.createdAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reporter</span>
                <p className="font-medium">{selected.reporterId ?? 'Anonymous'}</p>
              </div>
            </div>

            <div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Description</span>
              <p className="mt-1 text-sm rounded-lg p-3 whitespace-pre-wrap" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>{selected.description}</p>
            </div>

            {selected.stepsToReproduce && (
              <div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Steps to Reproduce</span>
                <p className="mt-1 text-sm rounded-lg p-3 whitespace-pre-wrap" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>{selected.stepsToReproduce}</p>
              </div>
            )}

            {selected.deviceInfo && (
              <div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Device Info</span>
                <p className="mt-1 text-sm font-mono text-xs rounded-lg p-3" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>{selected.deviceInfo}</p>
              </div>
            )}

            <hr className="border-border" />

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Update Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as BugReportStatus)}
                  className="mt-1 w-full text-sm rounded-lg px-3 py-2"
                  style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                >
                  {(Object.keys(BUG_STATUS_LABELS) as BugReportStatus[]).map((s) => (
                    <option key={s} value={s}>{BUG_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes…"
                  className="mt-1 w-full text-sm rounded-lg px-3 py-2 resize-none"
                  style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : null}
        </DetailPanel>
    </div>
  );
}
