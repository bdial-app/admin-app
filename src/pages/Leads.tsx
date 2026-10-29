import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Target, Users, Eye, LockOpen, IndianRupee, Flame, Store, RefreshCw, Loader2, ExternalLink,
  MessageSquare, Activity, X, ArrowRight, Lock, UserRound,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { FilterBar, useUrlFilters, type FilterValues } from '../components/ui/filters';
import {
  PERIODS, TIER_META, METHOD_META, EVENT_META, eventMeta, ACTION_ORDER, SOURCE_LABELS,
  LEAD_FILTER_DEFS, LEAD_SORTS, LEAD_SEGMENTS, INTERACTION_FILTER_DEFS, fmtDuration, pct,
} from '../components/leads/lead-meta';
import { Avatar, TierBadge } from '../components/leads/LeadBadges';
import { useLeadsOverview, useLeadList, useLeadDetail, useLeadInteractions, useRescoreLeads } from '../hooks/useLeads';
import { fmtDateTime, fmtRelative } from '../components/whatsapp/wa-utils';
import { PUBLIC_SITE_URL, ROUTES } from '../utils/constants';
import type { AdminLead, LeadInteraction, LeadPeriod, LeadTier, LeadUnlockMethod, LeadsOverview } from '../types';

const LIMIT = 20;
const LIST_KEYS = ['tier', 'status', 'checked', 'method', 'source'] as const;
const INTERACTION_KEYS = ['eventType', 'registered'] as const;
/** Page-level state that survives filter changes. */
const PAGE_KEYS = ['tab', 'period', 'providerId', 'business'] as const;
const ALL_KEYS = [...PAGE_KEYS, ...LIST_KEYS, ...INTERACTION_KEYS];

type Tab = 'overview' | 'leads' | 'interactions';
const TABS: { value: Tab; label: string; icon: typeof Target }[] = [
  { value: 'overview', label: 'Overview', icon: Target },
  { value: 'leads', label: 'All leads', icon: Users },
  { value: 'interactions', label: 'Customer interactions', icon: Activity },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const providerPath = (id: string) => ROUTES.PROVIDER_VIEW.replace(':id', id);
const CARD = { background: 'var(--surface-0)', border: '1px solid var(--border-default)' } as const;
const TOOLTIP = { background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 };

const pick = (values: FilterValues, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => values[k]).map((k) => [k, values[k]])) as FilterValues;

export default function Leads() {
  const { values, page, search, sort, update, replace, setSearch, setSort, setPage } = useUrlFilters(ALL_KEYS);
  const [, setParams] = useSearchParams();
  const [initialLead] = useState(() => new URLSearchParams(window.location.search).get('lead'));
  const [openLead, setOpenLead] = useState<string | null>(initialLead);

  const tab: Tab = (TABS.some((t) => t.value === values.tab) ? values.tab : 'overview') as Tab;
  const period = (PERIODS.some((p) => p.value === values.period) ? values.period : '30d') as LeadPeriod;
  const keep = pick(values, PAGE_KEYS);
  const rescore = useRescoreLeads();

  /** Switch tab (and optionally scope to a business), clearing the other tab's filters. */
  const go = (next: Tab, extra: FilterValues = {}) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...keep, tab: next, ...extra })) if (v) sp.set(k, v);
    setParams(sp, { replace: true });
  };

  const handleRescore = async () => {
    try {
      const r = await rescore.mutateAsync(values.providerId || undefined);
      toast.success(`Leads rescored for ${r.businesses.toLocaleString()} business${r.businesses === 1 ? '' : 'es'}${r.failed ? ` (${r.failed} failed)` : ''}`);
    } catch {
      toast.error('Rescoring failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Who is interested in which business, and what businesses do with those leads — checked, unlocked and paid"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Leads' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update({ period: p.value === '30d' ? undefined : p.value })}
                  className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
                  style={{
                    background: period === p.value ? 'var(--surface-0)' : 'transparent',
                    color: period === p.value ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: period === p.value ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRescore}
              disabled={rescore.isPending}
              title="Leads are scored when a business opens its leads screen. Rescore to include businesses that haven't."
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-60"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {rescore.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {values.providerId ? 'Rescore this business' : 'Rescore leads'}
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => go(t.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                style={{ background: on ? 'var(--surface-0)' : 'transparent', color: on ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: on ? 'var(--shadow-sm)' : 'none' }}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        {values.providerId && tab !== 'overview' && (
          <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Store className="w-3.5 h-3.5" />
            {values.business || 'One business'}
            <Link to={providerPath(values.providerId)} className="hover:underline font-medium opacity-80">open</Link>
            <button onClick={() => update({ providerId: undefined, business: undefined })} className="p-0.5 rounded-full hover:bg-[var(--surface-0)]" aria-label="Show all businesses">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>

      {tab === 'overview' && <OverviewTab period={period} go={go} />}
      {tab === 'leads' && (
        <LeadsTab
          period={period}
          values={values}
          page={page}
          search={search}
          sort={sort}
          onChange={update}
          onReplace={(next) => replace({ ...keep, ...next })}
          setSearch={setSearch}
          setSort={setSort}
          setPage={setPage}
          onOpen={setOpenLead}
        />
      )}
      {tab === 'interactions' && (
        <InteractionsTab
          period={period}
          values={values}
          page={page}
          search={search}
          onChange={update}
          onReplace={(next) => replace({ ...keep, ...next })}
          setSearch={setSearch}
          setPage={setPage}
          onOpenLead={setOpenLead}
          onBusiness={(id, name) => update({ providerId: id, business: name })}
        />
      )}

      <LeadDetail id={openLead} onClose={() => setOpenLead(null)} />
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────

function OverviewTab({ period, go }: { period: LeadPeriod; go: (tab: Tab, extra?: FilterValues) => void }) {
  const { data, isLoading, isFetching } = useLeadsOverview(period);
  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;
  if (!data) return <p className="text-sm py-16 text-center" style={{ color: 'var(--text-muted)' }}>Couldn’t load lead stats.</p>;

  const f = data.funnel;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();

  return (
    <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
      <Funnel data={data} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Interested customers" value={f.interested.toLocaleString()} icon={<Users className="w-5 h-5" />} accent="#6366F1" onClick={() => go('interactions', { registered: 'true' })} />
        <StatCard title={`Lead revenue · ${data.revenue.payers} paid`} value={inr(data.revenue.amount)} icon={<IndianRupee className="w-5 h-5" />} accent="var(--color-success)" />
        <StatCard title="Hot leads still locked" value={f.hotLocked} icon={<Flame className="w-5 h-5" />} accent="var(--color-danger)" onClick={() => go('leads', { tier: 'hot', status: 'locked' })} />
        <StatCard title="Never opened their leads" value={`${data.demand.neverOpened} / ${data.demand.businesses}`} icon={<Eye className="w-5 h-5" />} accent="var(--color-warning)" />
      </div>
      <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>
        Interested customers are signed-in people who viewed, called, chatted with, saved or shared a business{period === 'all' ? '' : ` in the last ${periodLabel}`}, counted once per business.
        {(data.revenue.pending > 0 || data.revenue.failed > 0) && (
          <>
            {' '}{data.revenue.payments} paid lead payment{data.revenue.payments === 1 ? '' : 's'} · {data.revenue.pending} pending · {data.revenue.failed} failed in this period.{' '}
            <Link to={`${ROUTES.PAYMENTS}?type=lead_unlock`} className="hover:underline" style={{ color: 'var(--color-primary)' }}>See payments</Link>
          </>
        )}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Customer activity" hint="Actions customers took on business pages each day">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} minTickGap={16} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} width={36} />
              <Tooltip contentStyle={TOOLTIP} labelFormatter={longDay} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="interactions" name="Interactions" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="customers" name="Signed-in customers" stroke="#EC4899" fill="#EC4899" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="What businesses did with leads" hint="Leads first checked, unlocked and paid for each day">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} minTickGap={16} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} width={36} />
              <Tooltip contentStyle={TOOLTIP} labelFormatter={longDay} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="checked" name="Checked" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
              <Bar dataKey="unlocked" name="Unlocked" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="paid" name="Paid" fill="#16A34A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="How leads were unlocked">
          <BarList
            rows={data.methods.map((m) => ({ key: m.method, label: METHOD_META[m.method]?.label ?? m.method, value: m.count, color: METHOD_META[m.method]?.color ?? '#94A3B8' }))}
            empty="No unlocks in this period"
            onClick={(key) => go('leads', { method: key, status: 'unlocked' })}
          />
        </ChartCard>
        <ChartCard title="Conversion by tier" hint="Leads active in the period, and what happened to them">
          <TierTable tiers={data.tiers} onTier={(tier) => go('leads', { tier })} />
        </ChartCard>
        <ChartCard title="Where leads came from">
          <BarList
            rows={data.sources.map((s) => ({ key: s.source, label: SOURCE_LABELS[s.source] ?? s.source, value: s.leads, sub: `${s.unlocked} unlocked`, color: '#6366F1' }))}
            empty="No leads in this period"
            onClick={(key) => key !== 'unknown' && go('leads', { source: key })}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="What customers do" hint="Distinct customers and businesses per action" className="xl:col-span-1">
          <div className="space-y-1">
            {data.interactions.length === 0 && <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No interactions in this period</p>}
            {data.interactions.map((i) => {
              const m = eventMeta(i.eventType);
              const Icon = m.icon;
              return (
                <button key={i.eventType} onClick={() => go('interactions', { eventType: i.eventType })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--surface-1)] transition-colors">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}1A`, color: m.color }}><Icon className="w-3.5 h-3.5" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{i.customers.toLocaleString()} customers · {i.businesses.toLocaleString()} businesses</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{i.events.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </ChartCard>
        <ChartCard title="Businesses with the most interest" hint="Click a row to see its leads" className="xl:col-span-2" bodyClassName="-mx-4 -mb-4">
          <TopBusinesses rows={data.topBusinesses} onOpen={(b) => go('leads', { providerId: b.id, business: b.brandName })} />
        </ChartCard>
      </div>
    </div>
  );
}

function Funnel({ data }: { data: LeadsOverview }) {
  const f = data.funnel;
  const stages = [
    { label: 'Leads', value: f.leads, icon: Target, color: '#EC4899', hint: 'Leads businesses can see on their leads screen, active in this period (includes customers who only saw the business in search)' },
    { label: 'Checked by business', value: f.checked, icon: Eye, color: '#0EA5E9', hint: 'Leads the business opened in this period' },
    { label: 'Unlocked', value: f.unlocked, icon: LockOpen, color: '#8B5CF6', hint: 'Contact details revealed — by credit, free quota or payment' },
    { label: 'Paid', value: f.paid, icon: IndianRupee, color: '#16A34A', hint: 'Unlocked by paying for the lead' },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="rounded-xl p-4" style={CARD}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Lead funnel</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Each step counts what happened in the selected period</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((s, i) => {
          const Icon = s.icon;
          // Businesses can unlock without opening a lead first, so steps are
          // shares of all leads; paid is a share of unlocks.
          const base = i === 0 ? null : i === stages.length - 1 ? { n: f.unlocked, of: 'unlocked' } : { n: f.leads, of: 'leads' };
          return (
            <div key={s.label} className="relative rounded-lg p-3" style={{ background: 'var(--surface-1)' }} title={s.hint}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                <p className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value.toLocaleString()}</p>
              <div className="h-1.5 rounded-full mt-2" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, background: s.color }} />
              </div>
              <p className="text-[11px] mt-1.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {base == null ? 'active in the period' : base.n > 0 ? `${pct(s.value, base.n)}% of ${base.of}` : '—'}
              </p>
              {i < stages.length - 1 && <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: 'var(--text-muted)' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({ title, hint, children, className = '', bodyClassName = '' }: { title: string; hint?: string; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <div className={`rounded-xl p-4 overflow-hidden ${className}`} style={CARD}>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      {hint && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      <div className={`mt-3 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

function BarList({ rows, empty, onClick }: { rows: { key: string; label: string; value: number; sub?: string; color: string }[]; empty: string; onClick?: (key: string) => void }) {
  if (rows.length === 0) return <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <button key={r.key} onClick={() => onClick?.(r.key)} className="w-full text-left group">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-xs font-medium truncate group-hover:underline" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
            <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
              {r.sub && <span className="mr-1.5">{r.sub} ·</span>}
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{r.value.toLocaleString()}</span> ({pct(r.value, total)}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function TierTable({ tiers, onTier }: { tiers: LeadsOverview['tiers']; onTier: (t: LeadTier) => void }) {
  const order: LeadTier[] = ['hot', 'warm', 'soft', 'cold'];
  const byTier = new Map(tiers.map((t) => [t.tier, t]));
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ color: 'var(--text-muted)' }}>
          <th className="text-left font-semibold pb-2">Tier</th>
          <th className="text-right font-semibold pb-2">Leads</th>
          <th className="text-right font-semibold pb-2">Checked</th>
          <th className="text-right font-semibold pb-2">Unlocked</th>
          <th className="text-right font-semibold pb-2">Paid</th>
        </tr>
      </thead>
      <tbody>
        {order.map((tier) => {
          const t = byTier.get(tier) ?? { leads: 0, checked: 0, unlocked: 0, paid: 0 };
          return (
            <tr key={tier} onClick={() => onTier(tier)} className="cursor-pointer hover:bg-[var(--surface-1)]" style={{ borderTop: '1px solid var(--border-light)' }}>
              <td className="py-2"><TierBadge tier={tier} /></td>
              <td className="py-2 text-right font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{t.leads.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct(t.checked, t.leads)}%</td>
              <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct(t.unlocked, t.leads)}%</td>
              <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct(t.paid, t.leads)}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TopBusinesses({ rows, onOpen }: { rows: LeadsOverview['topBusinesses']; onOpen: (b: LeadsOverview['topBusinesses'][number]) => void }) {
  if (rows.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No business activity in this period</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[640px]">
        <thead>
          <tr style={{ color: 'var(--text-muted)', background: 'var(--surface-1)' }}>
            <th className="text-left font-semibold px-4 py-2">Business</th>
            <th className="text-right font-semibold px-2 py-2" title="Signed-in customers who acted on the business">Interested</th>
            <th className="text-right font-semibold px-2 py-2">Leads</th>
            <th className="text-right font-semibold px-2 py-2">Checked</th>
            <th className="text-right font-semibold px-2 py-2">Unlocked</th>
            <th className="text-right font-semibold px-2 py-2">Paid</th>
            <th className="text-right font-semibold px-2 py-2">Revenue</th>
            <th className="text-right font-semibold px-4 py-2">Last checked</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} onClick={() => onOpen(b)} className="cursor-pointer hover:bg-[var(--surface-1)]" style={{ borderTop: '1px solid var(--border-light)' }}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={b.brandName} url={b.photoUrl} size={28} square />
                  <div className="min-w-0">
                    <Link to={providerPath(b.id)} onClick={(e) => e.stopPropagation()} className="block text-sm font-semibold truncate hover:underline" style={{ color: 'var(--text-primary)' }}>{b.brandName}</Link>
                    <span className="block text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{b.city || '—'}</span>
                  </div>
                </div>
              </td>
              <td className="px-2 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{b.interested}</td>
              <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {b.leads}{b.hot > 0 && <span className="ml-1 font-semibold" style={{ color: TIER_META.hot.color }}>· {b.hot} hot</span>}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: b.leads && !b.checked ? 'var(--color-warning-dark)' : 'var(--text-secondary)' }}>{b.checked}</td>
              <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{b.unlocked}</td>
              <td className="px-2 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{b.paid}</td>
              <td className="px-2 py-2.5 text-right tabular-nums font-semibold" style={{ color: b.revenue ? 'var(--color-success)' : 'var(--text-muted)' }}>{b.revenue ? inr(b.revenue) : '—'}</td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {b.lastCheckedAt ? fmtRelative(b.lastCheckedAt) : b.leads ? 'never' : 'leads not opened'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── All leads ─────────────────────────────────────────────

interface ListTabProps {
  period: LeadPeriod;
  values: FilterValues;
  page: number;
  search: string;
  onChange: (patch: FilterValues) => void;
  onReplace: (next: FilterValues) => void;
  setSearch: (q: string) => void;
  setPage: (p: number) => void;
}

function LeadsTab({ period, values, page, search, sort, setSort, onChange, onReplace, setSearch, setPage, onOpen }: ListTabProps & { sort: string; setSort: (s: string) => void; onOpen: (id: string) => void }) {
  const filters = pick(values, LIST_KEYS);
  const { data, isLoading } = useLeadList({
    ...filters,
    period,
    providerId: values.providerId,
    search: search || undefined,
    sort: sort || undefined,
    page,
    limit: LIMIT,
  });
  const narrowed = Object.keys(filters).length > 0 || !!search;

  const columns: Column<AdminLead>[] = [
    {
      key: 'who',
      header: 'Customer → Business',
      render: (l) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={l.customer?.name} size={34} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {l.customer?.name || 'Customer'}
              {l.customer?.mobileNumber && <span className="ml-1.5 text-xs font-normal tabular-nums" style={{ color: 'var(--text-muted)' }}>{l.customer.mobileNumber}</span>}
            </p>
            <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <Link to={providerPath(l.provider.id)} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline truncate" style={{ color: 'var(--color-primary)' }}>{l.provider.brandName}</Link>
              {l.provider.city && <span className="truncate">· {l.provider.city}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Lead',
      render: (l) => (
        <div className="flex flex-col gap-1">
          <TierBadge tier={l.tier} score={l.score} />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{SOURCE_LABELS[l.source ?? 'unknown'] ?? l.source}</span>
        </div>
      ),
    },
    { key: 'actions', header: 'What they did', render: (l) => <ActionIcons actions={l.actionsPerformed} /> },
    {
      key: 'checked',
      header: 'Checked',
      render: (l) =>
        l.firstViewedAt ? (
          <div className="text-xs">
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#0284C7' }}><Eye className="w-3.5 h-3.5" /> {l.viewCount}×</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }} title={fmtDateTime(l.lastViewedAt)}>{fmtRelative(l.lastViewedAt)}</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not yet</span>
        ),
    },
    { key: 'status', header: 'Unlock', render: (l) => <UnlockBadge lead={l} /> },
    {
      key: 'lastSeenAt',
      header: 'Last activity',
      render: (l) => <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }} title={fmtDateTime(l.lastSeenAt)}>{fmtRelative(l.lastSeenAt)}</span>,
    },
  ];

  return (
    <>
      <FilterBar
        defs={LEAD_FILTER_DEFS}
        values={filters}
        onChange={onChange}
        onReplace={onReplace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer name or mobile, or business…' }}
        sort={{ options: LEAD_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: latest activity' }}
        segments={LEAD_SEGMENTS}
        resultCount={narrowed ? data?.meta?.total : undefined}
        panelKey="leads"
      />
      <DataTable<AdminLead>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(l) => l.id}
        onRowClick={(l) => onOpen(l.id)}
        emptyIcon={<Target className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle={narrowed ? 'No leads match these filters' : 'No leads in this period'}
        emptyDescription={narrowed ? 'Remove a filter or pick another segment.' : 'Leads are scored when a business opens its leads screen — use “Rescore leads” to include every business.'}
      />
    </>
  );
}

// ── Interactions ──────────────────────────────────────────

function InteractionsTab({ period, values, page, search, onChange, onReplace, setSearch, setPage, onOpenLead, onBusiness }: ListTabProps & { onOpenLead: (id: string) => void; onBusiness: (id: string, name: string) => void }) {
  const filters = pick(values, INTERACTION_KEYS);
  const { data, isLoading } = useLeadInteractions({ ...filters, period, providerId: values.providerId, search: search || undefined, page, limit: LIMIT });
  const narrowed = Object.keys(filters).length > 0 || !!search;

  const columns: Column<LeadInteraction>[] = [
    {
      key: 'when',
      header: 'When',
      className: 'w-32',
      render: (r) => <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }} title={fmtDateTime(r.createdAt)}>{fmtRelative(r.createdAt)}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) =>
        r.userId ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={r.userName} size={28} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.userName || 'Customer'}</p>
              {r.userMobile && <p className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.userMobile}</p>}
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><UserRound className="w-3.5 h-3.5" /> Anonymous visitor</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => {
        const m = eventMeta(r.eventType);
        const Icon = m.icon;
        const detail = r.productName ?? (typeof r.metadata?.query === 'string' ? `“${r.metadata.query}”` : null);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}1A`, color: m.color }}><Icon className="w-3.5 h-3.5" /></span>
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
              {(detail || r.duration) && (
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{[detail, r.duration ? fmtDuration(r.duration) : null].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'business',
      header: 'Business',
      render: (r) => (
        <div className="min-w-0">
          <Link to={providerPath(r.providerId)} onClick={(e) => e.stopPropagation()} className="block text-sm font-medium truncate hover:underline" style={{ color: 'var(--color-primary)' }}>{r.brandName}</Link>
          <button onClick={(e) => { e.stopPropagation(); onBusiness(r.providerId, r.brandName); }} className="text-[11px] hover:underline" style={{ color: 'var(--text-muted)' }}>
            {r.providerCity ? `${r.providerCity} · ` : ''}only this business
          </button>
        </div>
      ),
    },
    { key: 'source', header: 'From', render: (r) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{SOURCE_LABELS[r.source ?? 'unknown'] ?? r.source}</span> },
    {
      key: 'lead',
      header: 'Lead',
      render: (r) =>
        r.leadId && r.leadTier ? (
          <button onClick={(e) => { e.stopPropagation(); onOpenLead(r.leadId!); }} className="inline-flex items-center gap-1.5" title="Open lead">
            <TierBadge tier={r.leadTier} />
            {r.leadUnlocked ? <LockOpen className="w-3.5 h-3.5" style={{ color: '#16A34A' }} /> : <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
          </button>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.userId ? 'Not scored yet' : '—'}</span>
        ),
    },
  ];

  return (
    <>
      <FilterBar
        defs={INTERACTION_FILTER_DEFS}
        values={filters}
        onChange={onChange}
        onReplace={onReplace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer name or mobile, or business…' }}
        resultCount={narrowed ? data?.meta?.total : undefined}
        panelKey="interactions"
      />
      <DataTable<LeadInteraction>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => r.leadId && onOpenLead(r.leadId)}
        emptyIcon={<Activity className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle={narrowed ? 'No interactions match these filters' : 'No customer interactions in this period'}
        emptyDescription="Views, calls, chats, saves and shares on business pages show up here."
      />
    </>
  );
}

// ── Lead detail ───────────────────────────────────────────

function LeadDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: lead, isLoading } = useLeadDetail(id);
  const grouped = useMemo(() => {
    const out: { day: string; items: NonNullable<typeof lead>['timeline'] }[] = [];
    for (const e of lead?.timeline ?? []) {
      const day = new Date(e.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [lead]);

  return (
    <DetailPanel
      open={!!id}
      onClose={onClose}
      title={lead ? `${lead.customer?.name || 'Anonymous visitor'} → ${lead.provider.brandName}` : 'Lead'}
      subtitle={lead ? `First seen ${fmtDateTime(lead.firstSeenAt)}` : undefined}
      width="560px"
    >
      {isLoading || !lead ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : (
        <div className="space-y-5">
          {/* Who */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PartyCard
              label="Customer"
              name={lead.customer?.name || 'Anonymous visitor'}
              lines={[lead.customer?.mobileNumber, lead.customer?.email, lead.customer?.city].filter(Boolean) as string[]}
              links={lead.customer?.mobileNumber ? [{ label: 'Find in Users', to: `${ROUTES.USERS}?q=${encodeURIComponent(lead.customer.mobileNumber)}` }] : []}
            />
            <PartyCard
              label="Business"
              name={lead.provider.brandName}
              photoUrl={lead.provider.photoUrl}
              lines={[lead.provider.city].filter(Boolean) as string[]}
              links={[
                { label: 'Open business', to: providerPath(lead.provider.id) },
                ...(lead.provider.slug ? [{ label: 'Public page', href: `${PUBLIC_SITE_URL}/business/${lead.provider.slug}/` }] : []),
              ]}
            />
          </div>
          {lead.conversationId && (
            <Link to={`${ROUTES.CHAT_MODERATION}?c=${lead.conversationId}`} className="flex items-center justify-between p-3 rounded-lg text-sm font-medium" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
              <span className="inline-flex items-center gap-2"><MessageSquare className="w-4 h-4" /> They have a chat — open the conversation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {/* Status */}
          <div className="grid grid-cols-2 gap-2.5">
            <Fact label="Tier & score"><TierBadge tier={lead.tier} score={lead.score} /></Fact>
            <Fact label="Came from">{SOURCE_LABELS[lead.source ?? 'unknown'] ?? lead.source}{lead.searchQuery && <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>searched “{lead.searchQuery}”</span>}</Fact>
            <Fact label="Checked by business">
              {lead.firstViewedAt ? (
                <>
                  {lead.viewCount}× · last {fmtRelative(lead.lastViewedAt)}
                  <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>first {fmtDateTime(lead.firstViewedAt)}</span>
                </>
              ) : 'Not yet'}
            </Fact>
            <Fact label="Unlock">
              <UnlockBadge lead={lead} />
              {lead.unlockedAt && <span className="block text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{fmtDateTime(lead.unlockedAt)}</span>}
              {lead.payment && (
                <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {lead.payment.amount != null ? inr(lead.payment.amount) : ''} {lead.payment.bulk ? '(bulk purchase)' : ''} · {lead.payment.status}
                </span>
              )}
            </Fact>
            <Fact label="Time on the page">{fmtDuration(lead.totalDuration)}</Fact>
            <Fact label="Last activity">{fmtRelative(lead.lastSeenAt)}</Fact>
          </div>

          {lead.products.length > 0 && (
            <div>
              <SectionLabel>Products viewed ({lead.products.length})</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {lead.products.map((p) => (
                  <Link key={p.id} to={`${providerPath(lead.provider.id)}?tab=products&product=${p.id}`} className="px-2 py-1 rounded-md text-xs font-medium hover:underline" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <SectionLabel>Interactions ({lead.timeline.length}{lead.timeline.length === 100 ? '+' : ''})</SectionLabel>
            {grouped.length === 0 && <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>No recorded interactions.</p>}
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.day}>
                  <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{g.day}</p>
                  <ol className="relative pl-5 space-y-2" style={{ borderLeft: '2px solid var(--border-light)' }}>
                    {g.items.map((e) => {
                      const m = eventMeta(e.eventType);
                      const Icon = m.icon;
                      const detail = e.productName ?? (typeof e.metadata?.query === 'string' ? `“${e.metadata.query}”` : null);
                      return (
                        <li key={e.id} className="relative">
                          <span className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-0)', border: `2px solid ${m.color}`, color: m.color }}><Icon className="w-2.5 h-2.5" /></span>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {m.label}
                            {detail && <span style={{ color: 'var(--text-secondary)' }}> · {detail}</span>}
                          </p>
                          <p className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                            {new Date(e.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {e.source && ` · ${SOURCE_LABELS[e.source] ?? e.source}`}
                            {e.duration ? ` · ${fmtDuration(e.duration)}` : ''}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DetailPanel>
  );
}

// ── Small pieces ──────────────────────────────────────────

function shortDay(v: unknown) {
  const d = new Date(`${String(v)}T00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function longDay(v: unknown) {
  return new Date(`${String(v)}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function UnlockBadge({ lead }: { lead: Pick<AdminLead, 'isUnlocked' | 'unlockMethod' | 'payment'> }) {
  if (!lead.isUnlocked)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}><Lock className="w-3 h-3" /> Locked</span>;
  const m = METHOD_META[(lead.unlockMethod ?? 'unknown') as LeadUnlockMethod];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit" style={{ background: `${m.color}1F`, color: m.color }} title={m.label}>
      {lead.unlockMethod === 'paid' ? <IndianRupee className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
      {m.short}
      {lead.payment?.amount != null && lead.unlockMethod === 'paid' && !lead.payment.bulk && <span className="tabular-nums">· {inr(lead.payment.amount)}</span>}
    </span>
  );
}

function ActionIcons({ actions }: { actions: string[] }) {
  const shown = ACTION_ORDER.filter((a) => actions.includes(a));
  if (!shown.length) return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Seen in search</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
      {shown.slice(0, 6).map((a) => {
        const m = EVENT_META[a];
        const Icon = m.icon;
        return <span key={a} title={m.label} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${m.color}1A`, color: m.color }}><Icon className="w-3.5 h-3.5" /></span>;
      })}
      {shown.length > 6 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>+{shown.length - 6}</span>}
    </div>
  );
}

function PartyCard({ label, name, photoUrl, lines, links }: { label: string; name: string; photoUrl?: string | null; lines: string[]; links: { label: string; to?: string; href?: string }[] }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex items-center gap-2.5">
        <Avatar name={name} url={photoUrl} size={36} square={label === 'Business'} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
          {lines.map((l) => <p key={l} className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{l}</p>)}
        </div>
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
          {links.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>{l.label} <ArrowRight className="w-3 h-3" /></Link>
            ) : (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>{l.label} <ExternalLink className="w-3 h-3" /></a>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{children}</p>;
}

