import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  AlertTriangle, BadgeCheck, CheckCircle2, ExternalLink, FileText, Loader2, Phone, Search, ShieldCheck, Users, XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { useHasPermission, useMinRole } from '../hooks/usePermissions';
import { providersService } from '../services/providers.service';
import {
  ROLE_LABEL, SOURCE_LABEL, womenLedService,
  type WomenLedRow, type WomenLedTab,
} from '../services/women-led.service';
import { apiErrorMessage } from '../components/whatsapp/wa-utils';

const LIMIT = 25;
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TABS: { key: WomenLedTab; label: string; count?: 'pending' | 'approved' | 'notApproved' }[] = [
  { key: 'pending', label: 'Waiting for review', count: 'pending' },
  { key: 'approved', label: 'Women-Led now', count: 'approved' },
  { key: 'not_approved', label: 'Not approved / removed', count: 'notApproved' },
  { key: 'all', label: 'Everything' },
];

const REJECT_REASONS = [
  "The name on the ID doesn't match the woman named in the request.",
  "We couldn't confirm that she owns or runs the business.",
  'There is no ID on file yet. Please complete verification first, then ask again.',
  "We couldn't reach you on your phone number to confirm.",
];
const REVOKE_REASONS = [
  'We found that the business is not owned or run by a woman.',
  'The owner asked us to remove it.',
  'The business changed hands.',
];

/** The badge's state, in words and colour. */
function StatePill({ row }: { row: Pick<WomenLedRow, 'status' | 'endedReason'> }) {
  const s =
    row.status === 'pending' ? { t: 'Waiting', c: '#b45309', b: '#fef3c7' }
      : row.status === 'approved' ? { t: 'Women-Led', c: '#7e22ce', b: '#f3e8ff' }
        : row.status === 'rejected' ? { t: 'Not approved', c: '#b91c1c', b: '#fee2e2' }
          : row.status === 'ended' && row.endedReason === 'revoked' ? { t: 'Removed by team', c: '#b91c1c', b: '#fee2e2' }
            : row.status === 'ended' ? { t: 'Turned off by owner', c: 'var(--text-muted)', b: 'var(--surface-2)' }
              : { t: 'Withdrawn', c: 'var(--text-muted)', b: 'var(--surface-2)' };
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ color: s.c, background: s.b }}>{s.t}</span>;
}

function IdPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>No ID on file</span>;
  const ok = status === 'approved';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: ok ? 'var(--color-success)' : 'var(--text-secondary)' }}>
      <ShieldCheck className="w-3.5 h-3.5" /> ID {ok ? 'verified' : status}
    </span>
  );
}

export default function WomenLed() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<WomenLedTab>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const openId = params.get('request');
  const setOpenId = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('request', id); else next.delete('request');
    setParams(next, { replace: true });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['women-led', 'list', tab, page, search],
    queryFn: () => womenLedService.list({ tab, page, limit: LIMIT, search: search.trim() || undefined }),
    placeholderData: (prev) => prev,
  });
  // Platform share (admins only; the page works without it).
  const { data: analytics } = useQuery({
    queryKey: ['women-led-analytics'],
    queryFn: () => providersService.getWomenLedAnalytics(),
    retry: false,
  });

  const columns: Column<WomenLedRow>[] = [
    {
      key: 'business', header: 'Business',
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.provider.brandName}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[r.provider.area, r.provider.city].filter(Boolean).join(', ') || '—'}</p>
        </div>
      ),
    },
    {
      key: 'woman', header: 'Woman named',
      render: (r) => (
        <div className="min-w-0">
          <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{r.womanName}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[r.role]}</p>
        </div>
      ),
    },
    {
      key: 'check', header: 'To check against',
      render: (r) => (
        <div className="space-y-0.5">
          <IdPill status={r.idCheck.aadhaarStatus} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Account: {r.owner.name || '—'}{r.owner.gender ? ` · ${r.owner.gender}` : ''}{r.hasProof ? ' · proof attached' : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'requested', header: 'Asked',
      render: (r) => (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.requestedAt)}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{SOURCE_LABEL[r.source] ?? r.source}</p>
        </div>
      ),
    },
    { key: 'state', header: 'State', render: (r) => <StatePill row={r} /> },
  ];

  const counts = data?.counts;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Women-Led businesses"
        description="Every badge is checked by the team: the woman named and her role, against the ID she gave for verification. Owners can turn it off at any time; turning it on again comes back here."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Waiting for review', value: counts?.pending, icon: AlertTriangle, color: '#d97706' },
          { label: 'Women-Led now', value: counts?.approved, icon: BadgeCheck, color: '#9333ea' },
          { label: 'Of all businesses', value: analytics ? `${analytics.percentageOfPlatform}%` : '—', icon: Users, color: '#059669' },
          { label: 'Approved this month', value: analytics ? `+${analytics.newApprovedThisMonth}` : '—', icon: CheckCircle2, color: '#2563eb' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable<WomenLedRow>
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpenId(r.id)}
        meta={data ? { total: data.total, page: data.page, limit: data.limit, totalPages: Math.max(1, Math.ceil(data.total / data.limit)) } : undefined}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchValue={search}
        searchPlaceholder="Search business, woman's name or phone…"
        filters={
          <div className="flex gap-1 p-1 rounded-lg flex-wrap" style={{ background: 'var(--surface-1)' }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
                style={{ background: tab === t.key ? 'var(--surface-0)' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none' }}
              >
                {t.label}{t.count && counts ? ` (${counts[t.count]})` : ''}
              </button>
            ))}
          </div>
        }
        emptyIcon={<Search className="w-8 h-8" />}
        emptyTitle={tab === 'pending' ? 'Nothing waiting' : 'Nothing here'}
        emptyDescription={tab === 'pending' ? 'New Women-Led requests show up here.' : 'Try another tab or search.'}
      />

      {openId && <ReviewPanel id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** One request: what was asked, what to check it against, the history, and the decision. */
function ReviewPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const canReview = useHasPermission('womenLed.review');
  const isAdmin = useMinRole('admin');
  const { data: d, isLoading } = useQuery({ queryKey: ['women-led', 'detail', id], queryFn: () => womenLedService.detail(id) });
  const [mode, setMode] = useState<'approve' | 'reject' | 'revoke' | null>(null);
  const [text, setText] = useState('');
  const [openingProof, setOpeningProof] = useState(false);

  const done = (msg: string) => {
    toast.success(msg);
    setMode(null);
    setText('');
    qc.invalidateQueries({ queryKey: ['women-led'] });
    qc.invalidateQueries({ queryKey: ['women-led-analytics'] });
  };
  const fail = (e: unknown) => toast.error(apiErrorMessage(e, 'Could not save'));
  const approve = useMutation({ mutationFn: () => womenLedService.approve(id, text.trim() || undefined), onSuccess: () => done('Approved: the badge shows now'), onError: fail });
  const reject = useMutation({ mutationFn: () => womenLedService.reject(id, text.trim()), onSuccess: () => done('Not approved: the owner sees your reason'), onError: fail });
  const revoke = useMutation({ mutationFn: () => womenLedService.revoke(d!.provider.id, text.trim()), onSuccess: () => done('Badge removed: the owner sees your reason'), onError: fail });
  const busy = approve.isPending || reject.isPending || revoke.isPending;

  const r = d?.request;
  const phone = d?.owner?.phone || d?.provider.contactNumber || null;
  const checks = useMemo(() => (d ? [
    `The name on her ID matches “${d.request.womanName}”.`,
    `She is the ${ROLE_LABEL[d.request.role].toLowerCase()} of ${d.provider.brandName}.`,
    phone ? `If anything is unclear, call ${phone} before deciding.` : 'If anything is unclear, ask the owner before deciding.',
  ] : []), [d, phone]);

  const footer = !d ? null : mode ? (
    <div className="w-full space-y-2">
      {mode !== 'approve' && (
        <div className="flex flex-wrap gap-1.5">
          {(mode === 'reject' ? REJECT_REASONS : REVOKE_REASONS).map((s) => (
            <button key={s} type="button" onClick={() => setText(s)} className="text-[11px] px-2 py-1 rounded-md text-left" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{s}</button>
          ))}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        rows={2}
        autoFocus
        placeholder={mode === 'approve' ? 'Note for the record (optional), e.g. “Name matches Aadhaar”' : 'Reason the owner will see (required)'}
        className="w-full px-3 py-2 text-sm rounded-lg"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setMode(null); setText(''); }} className="px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>Back</button>
        <button
          disabled={busy || (mode !== 'approve' && text.trim().length < 5)}
          onClick={() => (mode === 'approve' ? approve.mutate() : mode === 'reject' ? reject.mutate() : revoke.mutate())}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
          style={{ background: mode === 'approve' ? '#9333ea' : 'var(--color-danger)' }}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'approve' ? 'Approve' : mode === 'reject' ? 'Send “not approved”' : 'Remove the badge'}
        </button>
      </div>
    </div>
  ) : r?.status === 'pending' && canReview ? (
    <div className="flex gap-2 w-full justify-end">
      <button onClick={() => setMode('reject')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
        <XCircle className="w-4 h-4" /> Not approved
      </button>
      <button onClick={() => setMode('approve')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: '#9333ea' }}>
        <CheckCircle2 className="w-4 h-4" /> Approve
      </button>
    </div>
  ) : r?.status === 'approved' && isAdmin ? (
    <div className="flex w-full justify-end">
      <button onClick={() => setMode('revoke')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
        <XCircle className="w-4 h-4" /> Remove the badge
      </button>
    </div>
  ) : null;

  return (
    <DetailPanel open onClose={onClose} title={d?.provider.brandName ?? 'Women-Led request'} subtitle={r ? `Asked ${fmtDate(r.createdAt)} · ${SOURCE_LABEL[r.source] ?? r.source}` : undefined} width="560px" actions={footer}>
      {isLoading || !d || !r ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <StatePill row={{ status: r.status, endedReason: d.history.find((h) => h.id === r.id)?.endedReason ?? null }} />
            <Link to={`/providers/${d.provider.id}`} className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              Open the business <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <Block title="What they told us">
            <Row label="Woman">{r.womanName}</Row>
            <Row label="Her role">{ROLE_LABEL[r.role]}</Row>
            {r.note && <Row label="Note">{r.note}</Row>}
            {r.decisionNote && r.status !== 'pending' && <Row label={r.status === 'approved' ? 'Team note' : 'Reason given'}>{r.decisionNote}</Row>}
          </Block>

          <Block title="Check it against">
            <Row label="Account">
              {d.owner?.name || '—'}{d.owner?.gender ? <span style={{ color: 'var(--text-muted)' }}> · {d.owner.gender}</span> : null}
            </Row>
            <Row label="Phone">
              {phone ? (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--color-primary)' }}><Phone className="w-3.5 h-3.5" /> {phone}</a>
              ) : '—'}
            </Row>
            <Row label="ID">
              {d.idCheck ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <IdPill status={d.idCheck.aadhaarStatus} />
                  {d.idCheck.aadhaarDocUrl && <a href={d.idCheck.aadhaarDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Open Aadhaar <ExternalLink className="w-3 h-3" /></a>}
                  {d.idCheck.ijamatDocUrl && <a href={d.idCheck.ijamatDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Open iJamat <ExternalLink className="w-3 h-3" /></a>}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>No ID on file. Call before approving, or ask them to complete verification.</span>
              )}
            </Row>
            <Row label="Proof">
              {r.hasProof ? (
                <button
                  disabled={openingProof}
                  onClick={async () => {
                    setOpeningProof(true);
                    try { await womenLedService.openProof(id); } catch (e) { fail(e); } finally { setOpeningProof(false); }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {openingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Open {r.evidenceName || 'proof'}
                </button>
              ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>None attached (optional)</span>}
            </Row>
          </Block>

          {r.status === 'pending' && (
            <Block title="Before you approve">
              <ul className="space-y-1.5">
                {checks.map((c) => (
                  <li key={c} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#9333ea' }} /> {c}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          <Block title="History">
            <ol className="space-y-2.5">
              {d.history.map((h) => (
                <li key={h.id} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatePill row={h} />
                    <span>{h.womanName} · {ROLE_LABEL[h.role]}</span>
                  </div>
                  <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Asked {fmtDate(h.requestedAt)}{h.requestedBy ? ` by ${h.requestedBy}` : ''}
                    {h.decidedAt ? ` · decided ${fmtDate(h.decidedAt)}${h.decidedBy ? ` by ${h.decidedBy}` : ''}` : ''}
                    {h.endedAt ? ` · ended ${fmtDate(h.endedAt)}${h.endedBy ? ` by ${h.endedBy}` : ''}` : ''}
                  </p>
                  {(h.decisionNote || h.endNote) && <p className="mt-0.5 italic">“{h.endNote || h.decisionNote}”</p>}
                </li>
              ))}
            </ol>
          </Block>
        </div>
      )}
    </DetailPanel>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-1)' }}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-20 shrink-0 text-xs pt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="min-w-0 flex-1" style={{ color: 'var(--text-primary)' }}>{children}</span>
    </div>
  );
}
