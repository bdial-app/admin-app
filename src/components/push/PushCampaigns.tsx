import { useState } from 'react';
import { CalendarClock, Copy, Loader2, Megaphone, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { DataTable, type Column } from '../ui/DataTable';
import { DetailPanel } from '../ui/DetailPanel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useCancelCampaign, useNotificationBatches, usePushAudienceOptions } from '../../hooks/useNotifications';
import type { BatchStatus, CampaignData, NotificationBatch, PushAudience, PushKind } from '../../types';
import { apiErrorMessage } from '../whatsapp/wa-utils';
import { PushPhonePreview } from './PushPhonePreview';
import { describeAudience, fmtWhen, linkLabel, pct } from './push-utils';
import type { PushDraft } from './PushComposer';

const LIMIT = 15;

const STATUS_TABS: { label: string; value: BatchStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Scheduled', value: 'draft' },
  { label: 'Sending', value: 'sending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
];

const dataOf = (b: NotificationBatch) => (b.data ?? {}) as CampaignData;

/** The audience a batch went to, including ones sent before audiences existed. */
function audienceOf(b: NotificationBatch): PushAudience | undefined {
  const c = (b.targetCriteria ?? {}) as { audience?: PushAudience; city?: string; role?: string; userIds?: string[] };
  if (c.audience) return c.audience;
  if (b.targetType === 'individual') return { kind: 'people', userIds: c.userIds ?? [] };
  return { kind: 'everyone', cities: c.city ? [c.city] : undefined };
}

function progress(b: NotificationBatch) {
  const s = dataOf(b).stats;
  const done = s ? s.pushed + s.inbox + s.failed : b.deliveredCount + b.failedCount;
  return b.totalRecipients > 0 ? Math.min(100, Math.round((done / b.totalRecipients) * 100)) : 0;
}

function StatusPill({ b }: { b: NotificationBatch }) {
  const map: Record<BatchStatus, { label: string; bg: string; fg: string }> = {
    draft: { label: 'Scheduled', bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
    sending: { label: `Sending ${progress(b)}%`, bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' },
    sent: { label: 'Sent', bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)' },
    failed: { label: 'Failed', bg: 'var(--color-danger-light)', fg: 'var(--color-danger-dark)' },
  };
  const m = map[b.status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: m.bg, color: m.fg }}>
      {b.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
      {b.status === 'draft' && <CalendarClock className="w-3 h-3" />}
      {m.label}
    </span>
  );
}

export function PushCampaigns({ onDuplicate }: { onDuplicate?: (draft: PushDraft) => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BatchStatus | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<NotificationBatch | null>(null);
  const { data, isLoading } = useNotificationBatches({ page, limit: LIMIT, status: status || undefined });
  const { data: options } = usePushAudienceOptions();
  const cancel = useCancelCampaign();
  const catName = (id: string) => options?.categories.find((c) => c.id === id)?.name;
  // Re-read from the list so a sending campaign's numbers move in the panel too.
  const selected = data?.items.find((b) => b.id === selectedId) ?? null;

  const duplicate = (b: NotificationBatch) => {
    const d = dataOf(b);
    onDuplicate?.({
      title: b.title,
      body: b.body,
      imageUrl: b.imageUrl ?? undefined,
      route: d.route ?? '/',
      type: (d.type as PushKind) ?? 'promotional',
      audience: audienceOf(b),
      templateId: d.templateId ?? undefined,
    });
  };

  const doCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling.id);
      toast.success('Scheduled push cancelled');
      setCancelling(null);
      setSelectedId(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not cancel it'));
    }
  };

  const columns: Column<NotificationBatch>[] = [
    {
      key: 'title',
      header: 'Push',
      render: (b) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[320px]" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
            <p className="text-xs truncate max-w-[320px]" style={{ color: 'var(--text-muted)' }}>{b.body}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'audience',
      header: 'To',
      render: (b) => (
        <span className="text-xs line-clamp-2 max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>
          {describeAudience(audienceOf(b), catName)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <StatusPill b={b} /> },
    {
      key: 'reach',
      header: 'Reached',
      render: (b) => (
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {b.status === 'draft' ? '—' : `${b.deliveredCount.toLocaleString('en-IN')} / ${b.totalRecipients.toLocaleString('en-IN')}`}
        </span>
      ),
    },
    {
      key: 'opened',
      header: 'Opened',
      render: (b) => (
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {b.status === 'draft' ? '—' : pct(b.readCount, b.totalRecipients)}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'When',
      render: (b) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {b.status === 'draft' ? `For ${fmtWhen(b.scheduledAt)}` : fmtWhen(b.sentAt ?? b.createdAt)}
        </span>
      ),
    },
  ];

  const s = selected ? dataOf(selected).stats : undefined;

  return (
    <>
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatus(t.value); setPage(1); }}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
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

      <DataTable<NotificationBatch>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(b) => b.id}
        onRowClick={(b) => setSelectedId(b.id)}
      />

      <DetailPanel
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Push campaign"
        subtitle={selected ? describeAudience(audienceOf(selected), catName) : undefined}
        actions={
          selected && (
            <div className="flex gap-2">
              {onDuplicate && <button
                onClick={() => { duplicate(selected); setSelectedId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
              >
                <Copy className="w-3.5 h-3.5" /> Send again
              </button>}
              {onDuplicate && selected.status === 'draft' && (
                <button
                  onClick={() => setCancelling(selected)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
                  style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StatusPill b={selected} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {selected.status === 'draft'
                  ? `Goes out ${fmtWhen(selected.scheduledAt)}`
                  : `Sent ${fmtWhen(selected.sentAt ?? selected.createdAt)}`}
                {selected.sender ? ` by ${selected.sender.name ?? 'an admin'}` : ''}
              </span>
            </div>

            {selected.status === 'sending' && (
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full transition-all" style={{ width: `${progress(selected)}%`, background: 'var(--color-primary)' }} />
              </div>
            )}

            {selected.status !== 'draft' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'People', value: selected.totalRecipients.toLocaleString('en-IN'), hint: 'Matched the audience' },
                  { label: 'Reached a phone', value: selected.deliveredCount.toLocaleString('en-IN'), hint: pct(selected.deliveredCount, selected.totalRecipients) },
                  { label: 'Opened', value: selected.readCount.toLocaleString('en-IN'), hint: `${pct(selected.readCount, selected.totalRecipients)} of people` },
                  {
                    label: 'In-app only',
                    value: s ? s.inbox.toLocaleString('en-IN') : '—',
                    hint: 'Pushes off, quiet hours or no phone',
                  },
                  ...(selected.failedCount
                    ? [{ label: 'Failed', value: selected.failedCount.toLocaleString('en-IN'), hint: 'Phone could not be reached' }]
                    : []),
                ].map((t) => (
                  <div key={t.label} className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.label}</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t.value}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.hint}</p>
                  </div>
                ))}
              </div>
            )}

            <PushPhonePreview
              title={selected.title}
              body={selected.body}
              imageUrl={selected.imageUrl}
              caption={`Opens: ${linkLabel(dataOf(selected).route)} · ${dataOf(selected).type === 'system_announcement' ? 'Announcement' : 'Promotion'}`}
            />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Shown as written; each person saw their own name, city and business.
            </p>
          </div>
        )}
      </DetailPanel>

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={doCancel}
        isLoading={cancel.isPending}
        variant="danger"
        title="Cancel this scheduled push?"
        description={cancelling ? `“${cancelling.title}” won't go out. You can always set it up again.` : undefined}
        confirmLabel="Cancel push"
        cancelLabel="Keep it"
      />
    </>
  );
}
