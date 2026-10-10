import { useMemo, useState, type ComponentType } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  AlertOctagon, BadgeCheck, Bell, Bug, Copy, CreditCard, Download, Flag, KeyRound, Loader2, MessageCircle,
  MousePointerClick, Radio, Search, Server, ShieldCheck, SlidersHorizontal, Smartphone, Star, Store, UserPlus, X,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ROUTES } from '../utils/constants';
import { logsService, type LogFilters, type LogItem } from '../services/logs.service';

type SourceMeta = { label: string; icon: ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; hint: string };

/** Every source in the timeline, with what it holds. */
const SOURCES: Record<string, SourceMeta> = {
  server: { label: 'Server errors', icon: Server, color: '#DC2626', hint: 'API failures and rejected requests' },
  app: { label: 'App errors', icon: Smartphone, color: '#EA580C', hint: 'Crashes and failed calls reported by the apps' },
  auth: { label: 'Sign-in', icon: KeyRound, color: '#7C3AED', hint: 'OTPs sent, sign-ins, and why they failed' },
  admin: { label: 'Admin actions', icon: ShieldCheck, color: '#4F46E5', hint: 'Everything done in this console' },
  activity: { label: 'Customer activity', icon: MousePointerClick, color: '#0284C7', hint: 'Views, calls, chats, saves' },
  search: { label: 'Searches', icon: Search, color: '#0D9488', hint: 'What people searched (zero results flagged)' },
  notification: { label: 'Notifications', icon: Bell, color: '#2563EB', hint: 'In-app and push notifications sent' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#16A34A', hint: 'Messages sent, delivered and failed' },
  payment: { label: 'Payments', icon: CreditCard, color: '#059669', hint: 'Payments and their status' },
  report: { label: 'Reports', icon: Flag, color: '#E11D48', hint: 'Content reported by users' },
  bug: { label: 'Bug reports', icon: Bug, color: '#D97706', hint: 'Bugs users reported in the app' },
  review: { label: 'Reviews', icon: Star, color: '#CA8A04', hint: 'Reviews posted (low ratings flagged)' },
  verification: { label: 'Verifications', icon: BadgeCheck, color: '#0891B2', hint: 'Verification submissions' },
  signup: { label: 'Sign-ups', icon: UserPlus, color: '#9333EA', hint: 'New accounts (and imported ones)' },
  listing: { label: 'New businesses', icon: Store, color: '#C026D3', hint: 'Businesses listed' },
};

const LEVELS = [
  { key: 'error', label: 'Errors', color: '#DC2626' },
  { key: 'warn', label: 'Warnings', color: '#D97706' },
  { key: 'info', label: 'Info', color: '#64748B' },
] as const;

const FILTER_KEYS = ['range', 'from', 'to', 'sources', 'levels', 'q', 'user', 'business', 'event', 'entityId', 'sessionId', 'requestId', 'path', 'status', 'platform', 'appVersion'] as const;
type Key = (typeof FILTER_KEYS)[number];
type Filters = Partial<Record<Key, string>>;

/** A moment as the API's India-time minute ('YYYY-MM-DDTHH:mm'). */
const istMinute = (ms: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};
const istDay = (daysAgo = 0) => istMinute(Date.now() - daysAgo * 864e5).slice(0, 10);

/** Ranges stay relative ("last hour" keeps meaning the last hour in live mode). */
const RANGES: { key: string; label: string; range: () => { from: string; to?: string } }[] = [
  { key: '15m', label: 'Last 15 min', range: () => ({ from: istMinute(Date.now() - 15 * 60_000) }) },
  { key: '1h', label: 'Last hour', range: () => ({ from: istMinute(Date.now() - 3600_000) }) },
  { key: '24h', label: 'Last 24 hours', range: () => ({ from: istMinute(Date.now() - 864e5) }) },
  { key: 'today', label: 'Today', range: () => ({ from: istDay() }) },
  { key: 'yesterday', label: 'Yesterday', range: () => ({ from: istDay(1), to: istDay(1) }) },
  { key: '7d', label: 'Last 7 days', range: () => ({ from: istDay(6) }) },
  { key: '30d', label: 'Last 30 days', range: () => ({ from: istDay(29) }) },
];

/** One-click views for the questions that come up most. */
const QUICK: { label: string; patch: Filters }[] = [
  { label: 'Everything', patch: {} },
  { label: 'All errors', patch: { levels: 'error' } },
  { label: 'Server errors', patch: { sources: 'server' } },
  { label: 'App crashes', patch: { sources: 'app', levels: 'error' } },
  { label: 'Failed sign-ins', patch: { sources: 'auth', event: '_failed' } },
  { label: 'Searches with no results', patch: { sources: 'search', event: 'search_no_results' } },
  { label: 'WhatsApp failures', patch: { sources: 'whatsapp', levels: 'error' } },
  { label: 'Failed payments', patch: { sources: 'payment', levels: 'error' } },
  { label: 'Bug reports', patch: { sources: 'bug' } },
  { label: 'Admin actions', patch: { sources: 'admin' } },
];

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const inputStyle = { borderColor: 'var(--border-default)', background: 'var(--surface-0)', color: 'var(--text-primary)' };

/** URL filters → what the API takes (a relative range resolved now). */
function toApi(f: Filters): LogFilters {
  const { range, ...rest } = f;
  const r = RANGES.find((x) => x.key === (range ?? (f.from || f.to ? '' : '24h')));
  return { ...rest, ...(r ? r.range() : {}) };
}

/**
 * Every log in one place — server and app errors, sign-in attempts, admin
 * actions, customer activity, searches, notifications, WhatsApp, payments,
 * reports and more — with the filters to follow one person's problem from
 * the app to the database.
 */
export default function Logs() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<Filters>(() => {
    const out: Filters = {};
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) out[k] = v;
    }
    return out;
  }, [params]);
  const set = (patch: Filters, replaceAll = false) =>
    setParams(
      (prev) => {
        const next = replaceAll ? new URLSearchParams() : new URLSearchParams(prev);
        if (replaceAll && prev.get('range')) next.set('range', prev.get('range') as string);
        if (replaceAll && prev.get('from')) next.set('from', prev.get('from') as string);
        if (replaceAll && prev.get('to')) next.set('to', prev.get('to') as string);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true },
    );

  const [live, setLive] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selected, setSelected] = useState<LogItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(filters.q ?? '');
  const [syncedQ, setSyncedQ] = useState(filters.q ?? '');
  if ((filters.q ?? '') !== syncedQ) {
    setSyncedQ(filters.q ?? '');
    setSearch(filters.q ?? '');
  }

  const feed = useInfiniteQuery({
    queryKey: ['logs', filters],
    queryFn: ({ pageParam }) => logsService.feed(toApi(filters), pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: live ? 10_000 : false,
  });
  const counts = useQuery({
    queryKey: ['logs', 'counts', filters],
    queryFn: () => logsService.counts(toApi(filters)),
    staleTime: 30_000,
    refetchInterval: live ? 30_000 : false,
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const activeSources = filters.sources?.split(',').filter(Boolean) ?? [];
  const activeLevels = filters.levels?.split(',').filter(Boolean) ?? [];
  const toggleIn = (key: 'sources' | 'levels', value: string) => {
    const now = (filters[key] ?? '').split(',').filter(Boolean);
    const next = now.includes(value) ? now.filter((v) => v !== value) : [...now, value];
    set({ [key]: next.join(',') });
  };
  const rangeKey = filters.range ?? (filters.from || filters.to ? 'custom' : '24h');
  const moreCount = (['event', 'entityId', 'sessionId', 'requestId', 'path', 'status', 'platform', 'appVersion'] as const).filter((k) => filters[k]).length;
  const quickOn = (patch: Filters) => {
    const keys = new Set([...Object.keys(patch), 'sources', 'levels', 'q', 'user', 'business', 'event', 'entityId', 'sessionId', 'requestId', 'path', 'status', 'platform', 'appVersion']);
    return [...keys].every((k) => (filters[k as Key] ?? '') === ((patch as Record<string, string>)[k] ?? ''));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await logsService.exportCsv(toApi(filters));
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Logs"
        description="Every error, sign-in, admin action and customer event in one timeline — newest first, in India time"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Logs' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive((l) => !l)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ ...inputStyle, borderColor: live ? '#16A34A' : 'var(--border-default)', color: live ? '#16A34A' : 'var(--text-primary)' }}
              title="Refresh every 10 seconds"
            >
              <Radio className={`h-4 w-4 ${live ? 'animate-pulse' : ''}`} /> {live ? 'Live' : 'Go live'}
            </button>
            <button onClick={() => void exportCsv()} disabled={exporting} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50" style={inputStyle}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
            </button>
          </div>
        }
      />

      {/* Quick views */}
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {QUICK.map((v) => {
          const on = quickOn(v.patch);
          return (
            <button
              key={v.label}
              onClick={() => set(v.patch, true)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: on ? 'var(--color-primary)' : 'var(--border-default)', background: on ? 'var(--color-primary)' : 'var(--surface-0)', color: on ? '#fff' : 'var(--text-secondary)' }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Main filters */}
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && set({ q: search.trim() })}
            onBlur={() => search.trim() !== (filters.q ?? '') && set({ q: search.trim() })}
            placeholder="Search messages, errors, ids, details…"
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
            style={inputStyle}
          />
        </div>
        <SmallInput placeholder="User — phone, name or id" value={filters.user} onCommit={(v) => set({ user: v })} />
        <SmallInput placeholder="Business — name, phone or id" value={filters.business} onCommit={(v) => set({ business: v })} />
        <select
          value={rangeKey}
          onChange={(e) => (e.target.value === 'custom' ? set({ range: '', from: istMinute(Date.now() - 864e5), to: '' }) : set({ range: e.target.value, from: '', to: '' }))}
          className="rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          <option value="custom">Custom range…</option>
        </select>
      </div>
      {rangeKey === 'custom' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          From
          <input type="datetime-local" value={filters.from?.length === 10 ? `${filters.from}T00:00` : (filters.from ?? '')} onChange={(e) => set({ from: e.target.value })} className="rounded-lg border px-2 py-1.5 text-xs" style={inputStyle} />
          to
          <input type="datetime-local" value={filters.to?.length === 10 ? `${filters.to}T23:59` : (filters.to ?? '')} onChange={(e) => set({ to: e.target.value })} className="rounded-lg border px-2 py-1.5 text-xs" style={inputStyle} />
          <span>(India time; leave “to” empty for now)</span>
        </div>
      )}

      {/* Levels + sources with counts */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {LEVELS.map((l) => {
          const on = activeLevels.includes(l.key);
          return (
            <button key={l.key} onClick={() => toggleIn('levels', l.key)} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: on ? l.color : 'var(--border-default)', background: on ? `${l.color}14` : 'var(--surface-0)', color: on ? l.color : 'var(--text-secondary)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} /> {l.label}
              <span className="tabular-nums opacity-70">{counts.data?.byLevel[l.key]?.toLocaleString() ?? '·'}</span>
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px" style={{ background: 'var(--border-default)' }} />
        <button onClick={() => setMoreOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium" style={{ ...inputStyle, borderColor: moreCount ? 'var(--color-primary)' : 'var(--border-default)' }}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> More filters{moreCount ? ` · ${moreCount}` : ''}
        </button>
      </div>
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {Object.entries(SOURCES).map(([key, m]) => {
          const on = activeSources.includes(key);
          const n = counts.data?.bySource[key];
          const Icon = m.icon;
          return (
            <button key={key} onClick={() => toggleIn('sources', key)} title={m.hint}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{ borderColor: on ? m.color : 'var(--border-default)', background: on ? `${m.color}12` : 'var(--surface-0)', color: on ? m.color : 'var(--text-secondary)', opacity: n === 0 && !on ? 0.55 : 1 }}>
              <Icon className="h-3.5 w-3.5" style={{ color: m.color }} /> {m.label}
              <span className="tabular-nums opacity-70">{n?.toLocaleString() ?? '·'}</span>
            </button>
          );
        })}
      </div>

      {moreOpen && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border p-3 md:grid-cols-4" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-1)' }}>
          {([
            ['event', 'Event code (e.g. http_500, otp_verify_failed)'],
            ['path', 'API route contains'],
            ['status', 'HTTP status (e.g. 500)'],
            ['entityId', 'Entity id (product, review…)'],
            ['sessionId', 'Session id'],
            ['requestId', 'Request id'],
            ['platform', 'Platform (android, ios, web, admin)'],
            ['appVersion', 'App version'],
          ] as const).map(([k, ph]) => (
            <SmallInput key={k} placeholder={ph} value={filters[k]} onCommit={(v) => set({ [k]: v })} />
          ))}
        </div>
      )}

      {/* Active person/business filters as chips */}
      {(filters.user || filters.business || filters.sessionId || filters.requestId || filters.event) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(['user', 'business', 'sessionId', 'requestId', 'event'] as const).filter((k) => filters[k]).map((k) => (
            <span key={k} className="flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium" style={{ background: 'var(--color-primary-light, var(--surface-2))', color: 'var(--color-primary)' }}>
              {{ user: 'User', business: 'Business', sessionId: 'Session', requestId: 'Request', event: 'Event' }[k]}: {filters[k]}
              <button onClick={() => set({ [k]: '' })} className="rounded-full p-0.5 hover:opacity-70" aria-label="Remove"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}>
        {feed.isLoading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--text-muted)' }}><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : feed.isError ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Couldn't load logs — the backend may not have this yet. <button className="font-semibold underline" onClick={() => void feed.refetch()}>Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nothing matches these filters in this time range.</div>
        ) : (
          <div>
            {items.map((it) => {
              const m = SOURCES[it.source] ?? SOURCES.server;
              const lvl = LEVELS.find((l) => l.key === it.level) ?? LEVELS[2];
              const Icon = m.icon;
              return (
                <button key={`${it.source}:${it.id}`} onClick={() => setSelected(it)}
                  className="grid w-full grid-cols-[auto_1fr] gap-x-3 border-t px-4 py-2.5 text-left first:border-t-0 hover:bg-[var(--surface-1)] md:grid-cols-[130px_150px_1fr_auto]"
                  style={{ borderColor: 'var(--border-default)' }}>
                  <span className="flex items-center gap-2 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: lvl.color }} title={lvl.label} />
                    {fmtTime(it.at)}
                  </span>
                  <span className="hidden items-center gap-1.5 text-xs font-medium md:flex" style={{ color: m.color }}>
                    <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{m.label}</span>
                  </span>
                  <span className="col-span-2 min-w-0 md:col-span-1">
                    <span className="block truncate text-sm" style={{ color: it.level === 'error' ? '#B91C1C' : 'var(--text-primary)' }}>{it.message}</span>
                    <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {it.event}
                      {it.statusCode ? ` · ${it.statusCode}` : ''}
                      {it.path ? ` · ${it.path}` : ''}
                      {it.platform ? ` · ${it.platform}${it.appVersion ? ` ${it.appVersion}` : ''}` : ''}
                    </span>
                  </span>
                  <span className="col-span-2 mt-1 flex min-w-0 flex-wrap items-center gap-1.5 md:col-span-1 md:mt-0 md:justify-end">
                    {(it.userName || it.userMobile) && (
                      <span className="truncate rounded-md px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                        {it.userName || 'User'}{it.userMobile ? ` · ${it.userMobile}` : ''}
                      </span>
                    )}
                    {it.businessName && (
                      <span className="max-w-[180px] truncate rounded-md px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{it.businessName}</span>
                    )}
                  </span>
                </button>
              );
            })}
            <div className="border-t p-3 text-center" style={{ borderColor: 'var(--border-default)' }}>
              {feed.hasNextPage ? (
                <button onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                  {feed.isFetchingNextPage ? 'Loading…' : 'Load older'}
                </button>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>That's everything in this range.</span>
              )}
            </div>
          </div>
        )}
      </div>

      <LogDetail item={selected} onClose={() => setSelected(null)} onFilter={(patch) => { setSelected(null); set(patch, true); }} />
    </div>
  );
}

/** A text filter applied on Enter or when the field loses focus. */
function SmallInput({ placeholder, value, onCommit }: { placeholder: string; value?: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value ?? '');
  const [synced, setSynced] = useState(value ?? '');
  if ((value ?? '') !== synced) {
    setSynced(value ?? '');
    setText(value ?? '');
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onCommit(text.trim())}
      onBlur={() => text.trim() !== (value ?? '') && onCommit(text.trim())}
      placeholder={placeholder}
      className="w-full rounded-lg border px-3 py-2 text-sm"
      style={inputStyle}
    />
  );
}

/** Everything about one entry, and ways to follow the thread from it. */
function LogDetail({ item, onClose, onFilter }: { item: LogItem | null; onClose: () => void; onFilter: (patch: Filters) => void }) {
  if (!item) return null;
  const m = SOURCES[item.source] ?? SOURCES.server;
  const stack = typeof item.details?.stack === 'string' ? item.details.stack : null;
  const details = item.details ? Object.fromEntries(Object.entries(item.details).filter(([k]) => k !== 'stack')) : null;
  const rows: [string, string | number | null | undefined][] = [
    ['When', fmtTime(item.at)],
    ['Source', m.label],
    ['Level', item.level],
    ['Event', item.event],
    ['User', item.userName || item.userMobile ? `${item.userName ?? ''}${item.userMobile ? ` · ${item.userMobile}` : ''}${item.userRole ? ` (${item.userRole})` : ''}` : item.userId],
    ['Business', item.businessName ?? item.providerId],
    ['Entity', item.entityType ? `${item.entityType} · ${item.entityId ?? ''}` : item.entityId],
    ['Route', item.path],
    ['Status', item.statusCode],
    ['Platform', item.platform ? `${item.platform}${item.appVersion ? ` ${item.appVersion}` : ''}` : null],
    ['Session', item.sessionId],
    ['Request', item.requestId],
  ];
  const copy = () => {
    void navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    toast.success('Copied');
  };
  const follow: { label: string; patch: Filters; show: boolean }[] = [
    { label: "This user's timeline", patch: { user: item.userId ?? '', range: '7d' }, show: !!item.userId },
    { label: "This business's timeline", patch: { business: item.providerId ?? '', range: '7d' }, show: !!item.providerId },
    { label: 'Same session', patch: { sessionId: item.sessionId ?? '', range: '7d' }, show: !!item.sessionId },
    { label: 'Same request (app ↔ server)', patch: { requestId: item.requestId ?? '', range: '7d' }, show: !!item.requestId },
    { label: 'More like this', patch: { event: item.event }, show: true },
  ];
  return (
    <DetailPanel open onClose={onClose} title={item.message.length > 80 ? `${item.message.slice(0, 80)}…` : item.message} subtitle={`${m.label} · ${fmtTime(item.at)}`} width="640px"
      actions={<button onClick={copy} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}><Copy className="h-4 w-4" /> Copy as JSON</button>}>
      <div className="space-y-5 p-5">
        {item.level === 'error' && (
          <div className="flex items-start gap-2 rounded-lg p-3 text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" /> <span className="break-words">{item.message}</span>
          </div>
        )}
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
          {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
            <div key={k} className="contents">
              <dt style={{ color: 'var(--text-muted)' }}>{k}</dt>
              <dd className="break-all" style={{ color: 'var(--text-primary)' }}>{String(v)}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-1.5">
          {follow.filter((f) => f.show).map((f) => (
            <button key={f.label} onClick={() => onFilter(f.patch)} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>{f.label}</button>
          ))}
        </div>
        {stack && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stack trace</p>
            <pre className="max-h-72 overflow-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: '#0F172A', color: '#E2E8F0' }}>{stack}</pre>
          </div>
        )}
        {details && Object.keys(details).length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Details</p>
            <pre className="max-h-96 overflow-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>{JSON.stringify(details, null, 2)}</pre>
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
