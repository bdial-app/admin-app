import { useState, useMemo } from 'react';
import { Eye, Plus, AlertTriangle, Search, Filter, Calendar, X, Clock, CheckCircle2, Shield, User } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useWarnings, useCreateWarning } from '../hooks/useWarnings';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { ProviderWarning } from '../types';

const LIMIT = 20;

const WARNING_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Report Warning', value: 'report_warning' },
  { label: 'Policy Violation', value: 'policy_violation' },
  { label: 'Content Warning', value: 'content_warning' },
];

const READ_STATUSES = [
  { label: 'All', value: '' },
  { label: 'Unread', value: 'false' },
  { label: 'Read', value: 'true' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  report_warning: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-dark)', icon: '🚨' },
  policy_violation: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)', icon: '⚠️' },
  content_warning: { bg: 'var(--color-info-light)', text: 'var(--color-info)', icon: '📝' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

export default function Warnings() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warningType, setWarningType] = useState('');
  const [isRead, setIsRead] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<ProviderWarning | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ providerId: '', warningType: 'policy_violation', title: '', message: '' });

  const { data, isLoading } = useWarnings({
    page,
    limit: LIMIT,
    warningType: warningType || undefined,
    search: search || undefined,
    isRead: isRead || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const createMutation = useCreateWarning();

  // Computed stats from current dataset
  const stats = useMemo(() => {
    if (!data) return null;
    const items = data.items || [];
    const unreadCount = items.filter((w) => !w.isRead).length;
    return {
      total: data.meta?.total || 0,
      unreadOnPage: unreadCount,
      readOnPage: items.length - unreadCount,
    };
  }, [data]);

  const activeFilterCount = [warningType, isRead, dateFrom, dateTo].filter(Boolean).length;

  const handleCreate = async () => {
    if (!createForm.providerId || !createForm.title || !createForm.message) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await createMutation.mutateAsync(createForm);
      toast.success('Warning issued successfully');
      setShowCreate(false);
      setCreateForm({ providerId: '', warningType: 'policy_violation', title: '', message: '' });
    } catch {
      toast.error('Failed to create warning');
    }
  };

  const clearFilters = () => {
    setWarningType('');
    setIsRead('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const columns: Column<ProviderWarning>[] = [
    {
      key: 'title',
      header: 'Warning',
      render: (row) => {
        const typeInfo = TYPE_COLORS[row.warningType] || TYPE_COLORS.content_warning;
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: typeInfo.bg }}
            >
              {typeInfo.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {row.title || '—'}
                </p>
                {!row.isRead && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
                )}
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {row.message?.slice(0, 60)}{(row.message?.length || 0) > 60 ? '…' : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {row.provider?.brandName || '—'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            ID: {row.providerId?.slice(0, 8)}…
          </p>
        </div>
      ),
    },
    {
      key: 'warningType',
      header: 'Type',
      render: (row) => {
        const typeInfo = TYPE_COLORS[row.warningType] || TYPE_COLORS.content_warning;
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize"
            style={{ background: typeInfo.bg, color: typeInfo.text }}
          >
            {row.warningType?.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'isRead',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.isRead ? (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
          ) : (
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
          )}
          <span className="text-xs font-medium" style={{ color: row.isRead ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {row.isRead ? 'Read' : 'Unread'}
          </span>
        </div>
      ),
    },
    {
      key: 'issuedBy',
      header: 'Issued By',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {row.issuer?.name || 'System'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'When',
      sortable: true,
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }} title={formatDateTime(row.createdAt)}>
          {timeAgo(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <button
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelected(row); }}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Provider Warnings"
        description={data?.meta ? `${data.meta.total.toLocaleString()} total warnings` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Warnings' },
        ]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2"
            style={{ background: 'var(--color-warning)' }}
          >
            <Plus className="w-4 h-4" />
            Issue Warning
          </button>
        }
      />

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Warnings" value={stats.total} icon={<AlertTriangle className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Unread (this page)" value={stats.unreadOnPage} icon={<Clock className="w-5 h-5" />} accent="var(--color-danger)" />
          <StatCard title="Read (this page)" value={stats.readOnPage} icon={<CheckCircle2 className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Page Size" value={LIMIT} icon={<Filter className="w-5 h-5" />} accent="var(--color-info)" />
        </div>
      )}

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by title, message, or provider name…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-2)]">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            style={{
              background: showFilters || activeFilterCount > 0 ? 'var(--color-primary-light)' : 'var(--surface-1)',
              color: showFilters || activeFilterCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--color-primary)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div
            className="flex flex-wrap items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
          >
            <select
              value={warningType}
              onChange={(e) => { setWarningType(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {WARNING_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={isRead}
              onChange={(e) => { setIsRead(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {READ_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors"
                style={{ color: 'var(--color-danger)' }}
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      <DataTable<ProviderWarning>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
        emptyIcon={<AlertTriangle className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle="No warnings found"
        emptyDescription={search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'No warnings have been issued yet'}
      />

      {/* Warning Detail Panel */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Warning Details"
        subtitle={selected?.title || undefined}
        width="lg"
      >
        {selected && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: selected.isRead ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                border: `1px solid ${selected.isRead ? 'var(--color-success)' : 'var(--color-warning)'}20`,
              }}
            >
              {selected.isRead ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
              ) : (
                <Clock className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: selected.isRead ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
                  {selected.isRead ? 'Read by provider' : 'Not yet read'}
                </p>
                {selected.readAt && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Read at: {formatDateTime(selected.readAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Provider</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.provider?.brandName || '—'}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Warning Type</p>
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded capitalize"
                  style={{ background: (TYPE_COLORS[selected.warningType] || TYPE_COLORS.content_warning).bg, color: (TYPE_COLORS[selected.warningType] || TYPE_COLORS.content_warning).text }}
                >
                  {selected.warningType?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Issued By</p>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.issuer?.name || 'System'}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Issued On</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDateTime(selected.createdAt)}</p>
              </div>
            </div>

            {/* Warning Message */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Warning Message</p>
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {selected.message || '—'}
                </p>
              </div>
            </div>

            {/* Provider ID for reference */}
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                Warning ID: {selected.id}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>•</span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                Provider ID: {selected.providerId}
              </span>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Create Warning Panel */}
      <DetailPanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Issue New Warning"
        subtitle="Send a formal warning to a provider"
        actions={
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--color-warning)' }}
          >
            <AlertTriangle className="w-4 h-4" />
            {createMutation.isPending ? 'Issuing…' : 'Issue Warning'}
          </button>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Provider ID *
            </label>
            <input
              type="text"
              value={createForm.providerId}
              onChange={(e) => setCreateForm({ ...createForm, providerId: e.target.value })}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Paste provider UUID"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Warning Type *
            </label>
            <select
              value={createForm.warningType}
              onChange={(e) => setCreateForm({ ...createForm, warningType: e.target.value })}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="policy_violation">Policy Violation</option>
              <option value="content_warning">Content Warning</option>
              <option value="report_warning">Report Warning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Title *
            </label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="e.g. Inappropriate content detected"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Message *
            </label>
            <textarea
              value={createForm.message}
              onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'none' }}
              rows={5}
              placeholder="Describe the reason and consequences of this warning…"
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              This message will be shown to the provider in their app.
            </p>
          </div>
        </div>
      </DetailPanel>
    </div>
  );
}
