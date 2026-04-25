import { useState } from 'react';
import { Send, Clock, Eye, Bell, Users, User, BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import StatusBadge from '../components/ui/StatusBadge';
import {
  useNotificationBatches,
  useSendNotification,
  useNotificationStats,
} from '../hooks/useNotifications';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { NotificationBatch, BatchStatus, BatchTargetType } from '../types';

const LIMIT = 10;

const STATUS_TABS: { label: string; value: BatchStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Sent', value: 'sent' },
  { label: 'Sending', value: 'sending' },
  { label: 'Failed', value: 'failed' },
  { label: 'Draft', value: 'draft' },
];

const TARGET_OPTIONS: { label: string; value: BatchTargetType }[] = [
  { label: 'All Users', value: 'all' },
  { label: 'Segment', value: 'segment' },
  { label: 'Individual', value: 'individual' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const EMPTY_FORM = {
  title: '',
  body: '',
  imageUrl: '',
  targetType: 'all' as BatchTargetType,
  city: '',
  role: '',
  userIds: '',
};

export default function Notifications() {
  // ── Tab state ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');

  // ── History state ─────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('');
  const [selected, setSelected] = useState<NotificationBatch | null>(null);

  // ── Send form state ───────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Queries & mutations ───────────────────────────────
  const { data: batches, isLoading } = useNotificationBatches({
    page,
    limit: LIMIT,
    status: statusFilter || undefined,
  });
  const { data: stats } = useNotificationStats();
  const sendMutation = useSendNotification();

  // ── Handlers ──────────────────────────────────────────
  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    const payload: Parameters<typeof sendMutation.mutateAsync>[0] = {
      title: form.title.trim(),
      body: form.body.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      targetType: form.targetType,
    };

    if (form.targetType === 'segment') {
      payload.targetCriteria = {
        ...(form.city && { city: form.city.trim() }),
        ...(form.role && { role: form.role.trim() }),
      };
    } else if (form.targetType === 'individual') {
      const ids = form.userIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        toast.error('Please enter at least one user ID');
        return;
      }
      payload.targetCriteria = { userIds: ids };
    }

    try {
      await sendMutation.mutateAsync(payload);
      toast.success('Notification sent successfully');
      setForm(EMPTY_FORM);
      setActiveTab('history');
    } catch {
      toast.error('Failed to send notification');
    }
  };

  // ── Table columns ─────────────────────────────────────
  const columns: Column<NotificationBatch>[] = [
    {
      key: 'title',
      header: 'Notification',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.title}
            </p>
            <p className="text-xs truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }}>
              {row.body}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'targetType',
      header: 'Target',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.targetType === 'all' ? (
            <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          ) : row.targetType === 'individual' ? (
            <User className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          )}
          <span
            className="inline-flex px-2 py-0.5 text-xs font-medium rounded capitalize"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {row.targetType}
          </span>
        </div>
      ),
    },
    {
      key: 'totalRecipients',
      header: 'Recipients',
      render: (row) => (
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {row.totalRecipients.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'sentAt',
      header: 'Sent',
      sortable: true,
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {row.sentAt ? formatDate(row.sentAt) : '—'}
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
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // ── Stats description ─────────────────────────────────
  const statsDesc = stats
    ? `${stats.sentToday} sent today · ${stats.totalSent.toLocaleString()} total · ${stats.readRate}% read rate`
    : undefined;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={statsDesc}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Notifications' },
        ]}
      />

      {/* Main Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
        style={{ background: 'var(--surface-1)' }}
      >
        {[
          { label: 'Send', value: 'send' as const, icon: Send },
          { label: 'History', value: 'history' as const, icon: Clock },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              background: activeTab === tab.value ? 'var(--surface-0)' : 'transparent',
              color: activeTab === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────── Send Tab ────────────────────── */}
      {activeTab === 'send' && (
        <div
          className="rounded-xl p-6 max-w-2xl"
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border-default)',
          }}
        >
          <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
            Compose Notification
          </h3>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label
                className="block text-xs font-medium uppercase mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Notification title"
                maxLength={200}
              />
            </div>

            {/* Body */}
            <div>
              <label
                className="block text-xs font-medium uppercase mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Body *
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  resize: 'none',
                }}
                rows={3}
                placeholder="Notification body text…"
                maxLength={1000}
              />
            </div>

            {/* Image URL */}
            <div>
              <label
                className="block text-xs font-medium uppercase mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Image URL (optional)
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                placeholder="https://…"
              />
            </div>

            {/* Target Type */}
            <div>
              <label
                className="block text-xs font-medium uppercase mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Target Audience *
              </label>
              <div className="flex gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setForm({ ...form, targetType: opt.value, city: '', role: '', userIds: '' })
                    }
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      background:
                        form.targetType === opt.value
                          ? 'var(--color-primary)'
                          : 'var(--surface-1)',
                      color: form.targetType === opt.value ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${
                        form.targetType === opt.value
                          ? 'var(--color-primary)'
                          : 'var(--border-default)'
                      }`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment Criteria */}
            {form.targetType === 'segment' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-medium uppercase mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium uppercase mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">All Roles</option>
                    <option value="user">Users</option>
                    <option value="provider">Providers</option>
                  </select>
                </div>
              </div>
            )}

            {/* Individual User IDs */}
            {form.targetType === 'individual' && (
              <div>
                <label
                  className="block text-xs font-medium uppercase mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  User IDs (comma-separated) *
                </label>
                <textarea
                  value={form.userIds}
                  onChange={(e) => setForm({ ...form, userIds: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    resize: 'none',
                  }}
                  rows={2}
                  placeholder="uuid-1, uuid-2, uuid-3"
                />
              </div>
            )}

            {/* Preview Card */}
            {(form.title || form.body) && (
              <div>
                <p
                  className="text-xs font-medium uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Preview
                </p>
                <div
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {form.title || 'Notification Title'}
                    </p>
                    <p
                      className="text-sm mt-0.5 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {form.body || 'Notification body text…'}
                    </p>
                  </div>
                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Send Button */}
            <div className="pt-2">
              <button
                onClick={handleSend}
                disabled={sendMutation.isPending || !form.title.trim() || !form.body.trim()}
                className="px-6 py-2.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
                style={{ background: 'var(--color-primary)' }}
              >
                {sendMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{
                        borderColor: 'rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                      }}
                    />
                    Sending…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Notification
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── History Tab ────────────────── */}
      {activeTab === 'history' && (
        <>
          {/* Status Filter Tabs */}
          <div
            className="flex gap-1 mb-4 p-1 rounded-lg w-fit"
            style={{ background: 'var(--surface-1)' }}
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                style={{
                  background:
                    statusFilter === tab.value ? 'var(--surface-0)' : 'transparent',
                  color:
                    statusFilter === tab.value
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                  boxShadow: statusFilter === tab.value ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <DataTable<NotificationBatch>
            columns={columns}
            data={batches?.items ?? []}
            meta={batches?.meta}
            isLoading={isLoading}
            onPageChange={setPage}
            rowKey={(row) => row.id}
            onRowClick={setSelected}
          />
        </>
      )}

      {/* ────────────────────── Detail Panel ───────────────── */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Batch Detail"
        subtitle={selected?.title || undefined}
      >
        {selected && (
          <div className="space-y-5">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Status', value: selected.status },
                { label: 'Target', value: selected.targetType },
                {
                  label: 'Recipients',
                  value: selected.totalRecipients.toLocaleString(),
                },
                {
                  label: 'Delivered',
                  value: selected.deliveredCount.toLocaleString(),
                },
                { label: 'Read', value: selected.readCount.toLocaleString() },
                { label: 'Failed', value: selected.failedCount.toLocaleString() },
                {
                  label: 'Read Rate',
                  value:
                    selected.totalRecipients > 0
                      ? `${Math.round(
                          (selected.readCount / selected.totalRecipients) * 100,
                        )}%`
                      : '—',
                },
                {
                  label: 'Sent At',
                  value: selected.sentAt ? formatDate(selected.sentAt) : '—',
                },
              ].map((field) => (
                <div key={field.label}>
                  <p
                    className="text-xs font-medium uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {field.label}
                  </p>
                  <p
                    className="text-sm font-medium mt-0.5 capitalize"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {field.value || '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Body */}
            <div>
              <p
                className="text-xs font-medium uppercase mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Message
              </p>
              <p
                className="text-sm leading-relaxed p-3 rounded-lg"
                style={{
                  background: 'var(--surface-1)',
                  color: 'var(--text-secondary)',
                }}
              >
                {selected.body}
              </p>
            </div>

            {/* Image */}
            {selected.imageUrl && (
              <div>
                <p
                  className="text-xs font-medium uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Image
                </p>
                <img
                  src={selected.imageUrl}
                  alt=""
                  className="w-full max-w-xs rounded-lg object-cover"
                />
              </div>
            )}

            {/* Target Criteria */}
            {selected.targetCriteria && (
              <div>
                <p
                  className="text-xs font-medium uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Target Criteria
                </p>
                <pre
                  className="text-xs p-3 rounded-lg overflow-auto"
                  style={{
                    background: 'var(--surface-1)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {JSON.stringify(selected.targetCriteria, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
