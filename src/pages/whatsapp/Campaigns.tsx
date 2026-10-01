import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone, MessageSquareReply } from 'lucide-react';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useWaCampaigns, useWaSettings } from '../../hooks/useWhatsApp';
import { useHasPermission } from '../../hooks/usePermissions';
import { CampaignStatusBadge } from '../../components/whatsapp/CampaignStatusBadge';
import { CampaignProgressBar } from '../../components/whatsapp/CampaignProgressBar';
import { WA_ROUTES, formatInr, fmtDateTime, CATEGORY_LABEL } from '../../components/whatsapp/wa-utils';
import type { WaCampaignStatus, WaCampaignSummary } from '../../types';

const LIMIT = 15;

const STATUS_TABS: { label: string; value: WaCampaignStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Sending', value: 'sending' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

export default function Campaigns() {
  const navigate = useNavigate();
  const canSend = useHasPermission('whatsapp.send');
  const { data: settings } = useWaSettings();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<WaCampaignStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useWaCampaigns({ page, limit: LIMIT, status: status || undefined, search: search || undefined });

  const columns: Column<WaCampaignSummary>[] = [
    {
      key: 'name', header: 'Campaign',
      render: (c) => (
        <div className="min-w-0 max-w-[280px]">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {c.createdBy?.name ? `by ${c.createdBy.name}` : ''}{c.scheduledAt && c.status === 'scheduled' ? ` · runs ${fmtDateTime(c.scheduledAt)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'template', header: 'Template',
      render: (c) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono truncate max-w-[180px]" style={{ color: 'var(--text-secondary)' }}>{c.template.name}</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0"
            style={{
              background: c.template.category === 'marketing' ? 'var(--color-warning-light)' : 'var(--color-info-light)',
              color: c.template.category === 'marketing' ? 'var(--color-warning-dark)' : 'var(--color-info-dark)',
            }}
          >
            {CATEGORY_LABEL[c.template.category]}
          </span>
        </div>
      ),
    },
    {
      key: 'progress', header: 'Progress', className: 'min-w-[200px]',
      render: (c) => (
        <div>
          <CampaignProgressBar campaign={c} height={6} />
          <p className="text-[11px] mt-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {c.sentCount.toLocaleString('en-IN')}/{c.totalRecipients.toLocaleString('en-IN')} sent
            {c.deliveredCount > 0 && ` · ${c.deliveredCount} delivered`}
            {c.readCount > 0 && ` · ${c.readCount} read`}
            {c.failedCount > 0 && <span style={{ color: 'var(--color-danger)' }}> · {c.failedCount} failed</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'repliedCount', header: 'Replies', sortable: true,
      render: (c) => (
        <span className="inline-flex items-center gap-1 text-sm tabular-nums" style={{ color: c.repliedCount ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          <MessageSquareReply className="w-3.5 h-3.5" />{c.repliedCount}
        </span>
      ),
    },
    {
      key: 'cost', header: 'Cost',
      render: (c) => (
        <div className="tabular-nums">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatInr(c.actualCostInr)}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>est. {formatInr(c.estimatedCostInr)}</p>
        </div>
      ),
    },
    { key: 'createdAt', header: 'Created', sortable: true, render: (c) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDateTime(c.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (c) => <CampaignStatusBadge status={c.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg w-fit max-w-full overflow-x-auto" style={{ background: 'var(--surface-1)', scrollbarWidth: 'none' }}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              style={{
                background: status === t.value ? 'var(--surface-0)' : 'transparent',
                color: status === t.value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: status === t.value ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {canSend && (
          <button
            onClick={() => navigate(WA_ROUTES.campaignNew)}
            disabled={settings?.configured === false}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
            title={settings?.configured === false ? 'Configure WhatsApp first' : undefined}
          >
            <Plus className="w-4 h-4" /> New campaign
          </button>
        )}
      </div>

      <DataTable<WaCampaignSummary>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchValue={search}
        searchPlaceholder="Search campaigns…"
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(c.status === 'draft' && canSend ? WA_ROUTES.campaignEdit(c.id) : WA_ROUTES.campaign(c.id))}
        emptyIcon={<Megaphone className="w-8 h-8" />}
        emptyTitle={status ? `No ${status} campaigns` : 'No campaigns yet'}
        emptyDescription={canSend ? 'Click “New campaign” to build an audience and send an approved template.' : 'Campaigns created by admins will appear here.'}
      />
    </div>
  );
}
