import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Pause, Play, XCircle, RotateCcw, Copy, Download, Pencil, Trash2, ChevronLeft, Loader2, AlertTriangle, ExternalLink, Users, Clock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useHasPermission } from '../../hooks/usePermissions';
import {
  useWaCampaign, useWaCampaignMessages, useWaTemplate, usePauseWaCampaign, useResumeWaCampaign, useCancelWaCampaign,
  useRetryFailedWaCampaign, useDuplicateWaCampaign, useDeleteWaCampaign, useExportWaCampaign, useWaSettings,
} from '../../hooks/useWhatsApp';
import { CampaignStatusBadge } from '../../components/whatsapp/CampaignStatusBadge';
import { CampaignProgressBar } from '../../components/whatsapp/CampaignProgressBar';
import { MessageStatusIcon } from '../../components/whatsapp/MessageStatusIcon';
import { WaPhonePreview } from '../../components/whatsapp/WaPhonePreview';
import { Skel } from '../../components/whatsapp/Skeleton';
import {
  WA_ROUTES, formatInr, fmtDateTime, fmtRelative, resolveMappingValues, summarizeFilters, apiErrorMessage,
  SKIP_REASON_LABEL, CATEGORY_LABEL, MESSAGE_STATUS_LABEL,
} from '../../components/whatsapp/wa-utils';
import { API_BASE_URL, ROUTES } from '../../utils/constants';
import type { WaMessageRow, WaMessageStatus } from '../../types';

const LIMIT = 20;

/** 9 → "9:00 AM", 21 → "9:00 PM". */
const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
const MSG_TABS: { label: string; value: WaMessageStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Queued', value: 'queued' },
  { label: 'Sent', value: 'sent' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Read', value: 'read' },
  { label: 'Failed', value: 'failed' },
  { label: 'Skipped', value: 'skipped' },
];

type Confirm = 'cancel' | 'delete' | 'retry' | null;

export default function CampaignDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canSend = useHasPermission('whatsapp.send');
  const { data: c, isLoading, isError } = useWaCampaign(id);
  const { data: template } = useWaTemplate(c?.template.id);
  const { data: settings } = useWaSettings();

  const [msgStatus, setMsgStatus] = useState<WaMessageStatus | ''>('');
  const [msgSearch, setMsgSearch] = useState('');
  const [msgPage, setMsgPage] = useState(1);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const live = c?.status === 'sending';
  const { data: messages, isLoading: msgsLoading } = useWaCampaignMessages(id, { page: msgPage, limit: LIMIT, status: msgStatus || undefined, search: msgSearch || undefined }, live);
  // Logo campaigns: show the card one listed recipient got (Tijarah's before any are listed).
  const sampleProviderId = messages?.items.find((m) => m.provider)?.provider?.id;
  const headerPreviewUrl =
    c?.headerMediaSource === 'provider_logo'
      ? `${API_BASE_URL.replace(/\/+$/, '')}/whatsapp/media/logo-card/${sampleProviderId ?? 'tijarah'}.jpg`
      : c?.headerMediaUrl;

  const pause = usePauseWaCampaign();
  const resume = useResumeWaCampaign();
  const cancel = useCancelWaCampaign();
  const retry = useRetryFailedWaCampaign();
  const duplicate = useDuplicateWaCampaign();
  const remove = useDeleteWaCampaign();
  const exportCsv = useExportWaCampaign();

  if (isLoading) return <div className="space-y-4"><Skel className="h-20 w-full" /><Skel className="h-28 w-full" /><Skel className="h-96 w-full" /></div>;
  if (isError || !c) return <EmptyState title="Campaign not found" action={{ label: 'Back to campaigns', onClick: () => navigate(WA_ROUTES.campaigns) }} />;

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    try { await fn(); toast.success(ok); } catch (e) { toast.error(apiErrorMessage(e, fail)); }
    setConfirm(null);
  };

  const onExport = async () => {
    try {
      const blob = await exportCsv.mutateAsync(c.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-campaign-${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Export failed'));
    }
  };

  const onDuplicate = async () => {
    try {
      const d = await duplicate.mutateAsync(c.id);
      toast.success('Draft created');
      navigate(WA_ROUTES.campaignEdit(d.id));
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not duplicate'));
    }
  };

  const values = resolveMappingValues(template, c.variableMapping ?? {}, null);
  const total = Math.max(c.totalRecipients, 1);
  const deliveryRate = c.sentCount ? Math.round((c.deliveredCount / c.sentCount) * 100) : 0;
  const readRate = c.deliveredCount ? Math.round((c.readCount / c.deliveredCount) * 100) : 0;
  const skipEntries = Object.entries(c.skipBreakdown ?? {}).filter(([, n]) => n > 0) as [keyof typeof SKIP_REASON_LABEL, number][];

  const columns: Column<WaMessageRow>[] = [
    {
      key: 'recipient', header: 'Recipient',
      render: (m) => (
        <div className="min-w-0">
          {m.provider ? (
            <Link to={ROUTES.PROVIDER_VIEW.replace(':id', m.provider.id)} onClick={(e) => e.stopPropagation()} className="text-sm font-medium inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--text-primary)' }}>
              {m.provider.brandName} <ExternalLink className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            </Link>
          ) : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No business</span>}
          <p className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>{m.phone}{m.provider?.city ? ` · ${m.provider.city}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (m) => (
        <div className="flex items-center gap-2">
          <MessageStatusIcon status={m.status} />
          <div>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{MESSAGE_STATUS_LABEL[m.status]}{m.skipReason ? ` · ${SKIP_REASON_LABEL[m.skipReason] ?? m.skipReason}` : ''}</p>
            {m.errorMessage && <p className="text-[11px]" style={{ color: 'var(--color-danger)' }}>{m.errorCode ? `${m.errorCode} · ` : ''}{m.errorMessage}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'times', header: 'Timeline',
      render: (m) => (
        <div className="text-[11px] tabular-nums leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {m.sentAt && <div>Sent {fmtRelative(m.sentAt)}</div>}
          {m.deliveredAt && <div>Delivered {fmtRelative(m.deliveredAt)}</div>}
          {m.readAt && <div>Read {fmtRelative(m.readAt)}</div>}
          {m.failedAt && <div style={{ color: 'var(--color-danger)' }}>Failed {fmtRelative(m.failedAt)}{m.attempts > 1 ? ` after ${m.attempts} tries` : ''}</div>}
          {!m.sentAt && !m.failedAt && !m.deliveredAt && '—'}
        </div>
      ),
    },
    { key: 'costInr', header: 'Cost', render: (m) => <span className="text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{m.costInr ? formatInr(m.costInr, 4) : '—'}</span> },
  ];

  const actionBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50';
  const sec = { background: 'var(--surface-2)', color: 'var(--text-primary)' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <button onClick={() => navigate(WA_ROUTES.campaigns)} className="inline-flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--text-muted)' }}><ChevronLeft className="w-3.5 h-3.5" /> Campaigns</button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{c.name}</h2>
            <CampaignStatusBadge status={c.status} size="md" />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-mono">{c.template.name}</span> · {CATEGORY_LABEL[c.template.category]} · created {fmtDateTime(c.createdAt)}{c.createdBy ? ` by ${c.createdBy.name}` : ''}
            {c.scheduledAt && c.status === 'scheduled' && <> · runs <strong>{fmtDateTime(c.scheduledAt)}</strong></>}
            {c.startedAt && <> · started {fmtDateTime(c.startedAt)}</>}
            {c.completedAt && <> · finished {fmtDateTime(c.completedAt)}</>}
          </p>
        </div>
        {canSend && (
          <div className="flex items-center gap-2 flex-wrap">
            {c.status === 'draft' && <button onClick={() => navigate(WA_ROUTES.campaignEdit(c.id))} className={actionBtn} style={{ background: 'var(--color-primary)', color: '#fff' }}><Pencil className="w-3.5 h-3.5" /> Continue setup</button>}
            {c.status === 'sending' && <button onClick={() => run(() => pause.mutateAsync(c.id), 'Campaign paused', 'Could not pause')} disabled={pause.isPending} className={actionBtn} style={sec}><Pause className="w-3.5 h-3.5" /> Pause</button>}
            {c.status === 'paused' && <button onClick={() => run(() => resume.mutateAsync(c.id), 'Campaign resumed', 'Could not resume')} disabled={resume.isPending} className={actionBtn} style={sec}><Play className="w-3.5 h-3.5" /> Resume</button>}
            {(c.status === 'sending' || c.status === 'paused' || c.status === 'scheduled') && <button onClick={() => setConfirm('cancel')} className={actionBtn} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}><XCircle className="w-3.5 h-3.5" /> Cancel</button>}
            {c.failedCount > 0 && c.status !== 'draft' && <button onClick={() => setConfirm('retry')} className={actionBtn} style={sec}><RotateCcw className="w-3.5 h-3.5" /> Retry failed</button>}
            {c.status !== 'draft' && <button onClick={onDuplicate} disabled={duplicate.isPending} className={actionBtn} style={sec}><Copy className="w-3.5 h-3.5" /> Duplicate</button>}
            {c.status !== 'draft' && <button onClick={onExport} disabled={exportCsv.isPending} className={actionBtn} style={sec}>{exportCsv.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV</button>}
            {(c.status === 'draft' || c.status === 'cancelled') && <button onClick={() => setConfirm('delete')} className={actionBtn} style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
          </div>
        )}
      </div>

      {/* A campaign started outside the send window sits at "sending" with nothing
          going out until the window opens — say so, or it looks stuck. */}
      {c.status === 'sending' && c.nextSendAt && (
        <div className="flex gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--color-info-light)', color: 'var(--color-info-dark)' }}>
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Waiting for the send window.</strong>{' '}
            {settings ? `Messages only go out between ${fmtHour(settings.sendWindowStart)} and ${fmtHour(settings.sendWindowEnd)} India time. ` : ''}
            The next ones go at <strong>{fmtDateTime(c.nextSendAt)}</strong>.{' '}
            <Link to={WA_ROUTES.settings} className="underline">Change the window</Link>
          </span>
        </div>
      )}

      {c.failureReason && (
        <div className="flex gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Stopped:</strong> {c.failureReason}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Tile label="Recipients" value={c.totalRecipients} />
        <Tile label="Queued" value={c.queuedCount} accent={live ? 'var(--color-primary)' : undefined} />
        <Tile label="Sent" value={c.sentCount} />
        <Tile label="Delivered" value={c.deliveredCount} sub={`${deliveryRate}% of sent`} accent="var(--color-success)" />
        <Tile label="Read" value={c.readCount} sub={`${readRate}% of delivered`} accent="var(--color-info)" />
        <Tile label="Failed" value={c.failedCount} accent={c.failedCount ? 'var(--color-danger)' : undefined} />
        <Tile label="Skipped" value={c.skippedCount} />
        <Tile label="Replied" value={c.repliedCount} accent="#25D366" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {Math.round(((c.sentCount + c.failedCount + c.skippedCount) / total) * 100)}% processed
            {live && <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>● live, refreshing every 5s</span>}
          </p>
          <p className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            Cost <strong style={{ color: 'var(--text-primary)' }}>{formatInr(c.actualCostInr)}</strong> actual · {formatInr(c.estimatedCostInr)} estimated <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(before GST)</span>
          </p>
        </div>
        <CampaignProgressBar campaign={c} height={12} showLegend />
        {(skipEntries.length > 0 || (c.failureBreakdown?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {skipEntries.map(([k, n]) => (
              <span key={k} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                {SKIP_REASON_LABEL[k] ?? k}: <strong>{n}</strong>
              </span>
            ))}
            {(c.failureBreakdown ?? []).map((f) => (
              <span key={f.code} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }} title={`Meta error ${f.code}`}>
                {f.message}: <strong>{f.count}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="space-y-3">
          <div className="flex gap-1 p-1 rounded-lg w-fit max-w-full overflow-x-auto" style={{ background: 'var(--surface-1)', scrollbarWidth: 'none' }}>
            {MSG_TABS.map((t) => (
              <button key={t.value} onClick={() => { setMsgStatus(t.value); setMsgPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap" style={{ background: msgStatus === t.value ? 'var(--surface-0)' : 'transparent', color: msgStatus === t.value ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: msgStatus === t.value ? 'var(--shadow-sm)' : 'none' }}>
                {t.label}
              </button>
            ))}
          </div>
          <DataTable<WaMessageRow>
            columns={columns}
            data={messages?.items ?? []}
            meta={messages?.meta}
            isLoading={msgsLoading}
            onPageChange={setMsgPage}
            onSearch={(q) => { setMsgSearch(q); setMsgPage(1); }}
            searchValue={msgSearch}
            searchPlaceholder="Search phone or business…"
            rowKey={(m) => m.id}
            emptyIcon={<Users className="w-8 h-8" />}
            emptyTitle={c.status === 'draft' ? 'Recipients are resolved when you send' : 'No recipients in this view'}
            emptyDescription={c.status === 'draft' ? 'The audience is counted live in the wizard; rows appear here once the campaign starts.' : 'Try another status tab or clear the search.'}
          />
        </div>

        <aside className="xl:sticky xl:top-4 space-y-4">
          <WaPhonePreview components={template?.components} values={values} headerImageUrl={headerPreviewUrl} businessName={settings?.phone?.verifiedName || 'Tijarah Connect'} status={c.status === 'draft' ? 'queued' : 'delivered'} />
          <div className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Audience</p>
            <ul className="flex flex-wrap gap-1">
              {summarizeFilters(c.audience ?? {}).map((s) => <li key={s} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{s}</li>)}
            </ul>
            <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>Throttle {c.ratePerMinute ?? settings?.ratePerMinute ?? '—'} / min</p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => cancel.mutateAsync(c.id), 'Campaign cancelled', 'Could not cancel')}
        variant="danger"
        isLoading={cancel.isPending}
        title="Cancel this campaign?"
        description={`${c.queuedCount.toLocaleString('en-IN')} queued messages will be marked skipped and never sent. Messages already delivered (${c.deliveredCount}) are billed as usual — about ${formatInr(c.actualCostInr)} so far.`}
        confirmLabel="Cancel campaign"
      />
      <ConfirmDialog
        open={confirm === 'retry'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(async () => { const r = await retry.mutateAsync(c.id); toast.info(`${r.requeued} messages requeued`); }, 'Retry queued', 'Could not retry')}
        variant="warning"
        isLoading={retry.isPending}
        title={`Retry ${c.failedCount.toLocaleString('en-IN')} failed messages?`}
        description={`Only retryable failures (rate limits, temporary errors, Meta's marketing cap) are requeued. Each delivered retry costs ${formatInr(settings?.rates?.[c.template.category] ?? 0, 4)} + GST.`}
        confirmLabel="Retry failed"
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(async () => { await remove.mutateAsync(c.id); navigate(WA_ROUTES.campaigns); }, 'Campaign deleted', 'Could not delete')}
        variant="danger"
        isLoading={remove.isPending}
        title="Delete this campaign?"
        description="This removes the campaign and its message rows. Nothing is sent and nothing is billed."
        confirmLabel="Delete"
      />
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <div className="card p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: accent ?? 'var(--text-primary)' }}>{value.toLocaleString('en-IN')}</p>
      {sub && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}
