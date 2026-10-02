import { useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  DollarSign, CreditCard, Users, Crown,
  ArrowUpRight, ArrowDownRight, Calendar, Zap, Star, ShoppingBag,
  Ticket, Unlock, Tag, BarChart3, PieChart, Activity, Receipt, RotateCcw, Globe, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { FilterBar, useUrlFilters, shortDate } from '../components/ui/filters';
import { REVENUE_FILTER_DEFS, REVENUE_FILTER_KEYS, toRevenueParams, withOptions } from '../components/revenue/revenue-filters';
import { PAYMENT_TYPE_OPTIONS } from '../components/payments/payment-filters';
import { usePaymentFilterOptions, useRevenue, useRevenueAnalytics } from '../hooks/usePayments';
import { useSubscriptionPlans } from '../hooks/useSubscriptions';
import type { RevenueGranularity, RevenueReport } from '../services/payments.service';
import { ROUTES } from '../utils/constants';

const formatCurrency = (v: number | null | undefined) => {
  if (v == null || isNaN(Number(v))) return '₹0';
  const n = Number(v);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const formatCurrencyFull = (v: number | string | null | undefined) => {
  if (v == null || isNaN(Number(v))) return '₹0';
  return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatMonth = (ym: string) => {
  const [, m] = ym.split('-');
  return MONTH_NAMES[parseInt(m, 10) - 1] || ym;
};

const TYPE_META: Record<string, { label: string; color: string; icon: typeof DollarSign }> = {
  subscription: { label: 'Subscriptions', color: '#f59e0b', icon: Crown },
  sponsorship: { label: 'Sponsorships', color: '#6366f1', icon: Star },
  lead_unlock: { label: 'Lead Unlocks', color: '#10b981', icon: Unlock },
  badge: { label: 'Badges', color: '#ef4444', icon: Tag },
  deal_unlock: { label: 'Deal Unlocks', color: '#8b5cf6', icon: Ticket },
  deal_creation: { label: 'Deal Creation', color: '#ec4899', icon: ShoppingBag },
};

const PLAN_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const TOOLTIP_STYLE = { background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 } as const;

type Tab = 'overview' | 'plans' | 'deals';

/** Axis label for a series bucket, by how the API bucketed the range. */
function formatBucket(bucket: string, granularity: RevenueGranularity): string {
  const d = new Date(bucket.length <= 7 ? `${bucket}-01T00:00:00` : bucket.length === 10 ? `${bucket}T00:00:00` : bucket);
  if (isNaN(d.getTime())) return bucket;
  if (granularity === 'month') return `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Revenue() {
  const [tab, setTab] = useState<Tab>('overview');
  const { values, update, replace } = useUrlFilters(REVENUE_FILTER_KEYS);
  const params = useMemo(() => toRevenueParams(values), [values]);
  const comparing = values.compare === 'true';

  const { data: report, isLoading: reportLoading, isError: reportFailed, error: reportError } = useRevenue(params);
  const { data: filterOptions } = usePaymentFilterOptions();
  const { data: plans } = useSubscriptionPlans();
  const { data, isLoading } = useRevenueAnalytics();

  const tabs: { key: Tab; label: string; icon: typeof DollarSign }[] = [
    { key: 'overview', label: 'Overview', icon: PieChart },
    { key: 'plans', label: 'Plans Revenue', icon: Crown },
    { key: 'deals', label: 'Deals Revenue', icon: ShoppingBag },
  ];

  const periodLabel = report?.range
    ? `${shortDate(report.range.from)} – ${shortDate(report.range.to)}`
    : params.from
      ? `${shortDate(params.from)} – ${params.to ? shortDate(params.to) : 'today'}`
      : 'Last 30 days';

  return (
    <div>
      <PageHeader
        title="Revenue"
        description={report ? `${formatCurrencyFull(report.totals.revenue)} across ${Number(report.totals.transactions).toLocaleString('en-IN')} transactions · ${periodLabel}` : 'Comprehensive revenue analytics across all monetization models'}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Revenue' },
        ]}
      />

      {/* ═══════ FILTERED REPORT ═══════ */}
      <FilterBar
        defs={withOptions(REVENUE_FILTER_DEFS, filterOptions, plans)}
        values={values}
        onChange={update}
        onReplace={replace}
      />

      <ReportBlock report={report} loading={reportLoading} failed={reportFailed} error={reportError as AxiosError<{ message?: string | string[] }> | null} comparing={comparing} periodLabel={periodLabel} />

      {/* ═══════ ALL-TIME ANALYTICS ═══════ */}
      <div className="mt-8 mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>All-time breakdown</h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not affected by the filters above</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : data ? (
        <>
          {/* ═══════ TAB SWITCHER ═══════ */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--surface-1)' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t.key ? 'var(--surface-0)' : 'transparent',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ═══════ TAB CONTENT ═══════ */}
          {tab === 'overview' && <OverviewTab overview={data.overview} plansRevenue={data.plans.totalRevenue} dealsRevenue={data.deals.totalRevenue} report={report} periodLabel={periodLabel} />}
          {tab === 'plans' && <PlansTab plans={data.plans} />}
          {tab === 'deals' && <DealsTab deals={data.deals} />}
        </>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FILTERED REPORT: KPI TILES + TIME SERIES
// ═══════════════════════════════════════════════════════════

function ReportBlock({ report, loading, failed, error, comparing, periodLabel }: {
  report?: RevenueReport;
  loading: boolean;
  failed: boolean;
  error: AxiosError<{ message?: string | string[] }> | null;
  comparing: boolean;
  periodLabel: string;
}) {
  if (failed && !report) {
    const status = error?.response?.status;
    const apiMessage = error?.response?.data?.message;
    const detail = status === 404
      ? 'The revenue report endpoint (GET /admin/payments/revenue) is not available on this API yet.'
      : Array.isArray(apiMessage) ? apiMessage.join(' · ') : apiMessage || error?.message || 'The request failed.';
    return (
      <div className="rounded-xl p-8 text-center mb-2" style={{ background: 'var(--surface-0)', border: '1px dashed var(--border-strong)' }}>
        <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue report unavailable</p>
        <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>{detail}</p>
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>Your filters are kept in the address bar; the chart will fill in once the API answers.</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 h-[104px] animate-pulse" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }} />
          ))}
        </div>
        <div className="rounded-xl h-[320px] animate-pulse" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }} />
      </div>
    );
  }

  const t = report.totals;
  const prev = comparing ? report.previous : undefined;
  const prevAvg = prev && Number(prev.transactions) > 0 ? Number(prev.revenue) / Number(prev.transactions) : undefined;
  const prevLabel = prev?.from && prev?.to ? `${shortDate(prev.from)} – ${shortDate(prev.to)}` : 'previous period';
  const pointInTime = 'Measured right now, across all subscriptions; the filters above do not apply.';

  return (
    <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiTile title="Revenue" value={formatCurrencyFull(t.revenue)} icon={<DollarSign className="w-5 h-5" />} accent="var(--color-primary)" current={Number(t.revenue)} previous={prev ? Number(prev.revenue) : undefined} previousLabel={prevLabel} money />
        <KpiTile title="Transactions" value={Number(t.transactions).toLocaleString('en-IN')} icon={<Receipt className="w-5 h-5" />} accent="var(--color-info)" current={Number(t.transactions)} previous={prev ? Number(prev.transactions) : undefined} previousLabel={prevLabel} />
        <KpiTile title="Avg order" value={formatCurrencyFull(t.avgOrder)} icon={<Wallet className="w-5 h-5" />} accent="#8b5cf6" current={Number(t.avgOrder)} previous={prevAvg} previousLabel={prevLabel} money />
        <KpiTile title="Refunds" value={formatCurrencyFull(t.refunds)} icon={<RotateCcw className="w-5 h-5" />} accent="var(--color-danger)" current={Number(t.refunds)} previous={prev ? Number(prev.refunds) : undefined} previousLabel={prevLabel} money invert />
        <KpiTile title="MRR" value={formatCurrencyFull(t.mrr)} icon={<Activity className="w-5 h-5" />} accent="#f59e0b" hint="Point-in-time, ignores filters" tooltip={pointInTime} />
        <KpiTile title="Active subs" value={Number(t.activeSubscriptions).toLocaleString('en-IN')} icon={<Users className="w-5 h-5" />} accent="var(--color-success)" hint="Point-in-time, ignores filters" tooltip={pointInTime} />
      </div>

      <SeriesChart report={report} periodLabel={periodLabel} />
    </div>
  );
}

function KpiTile({ title, value, icon, accent, current, previous, previousLabel, money, invert, hint, tooltip }: {
  title: string; value: string; icon: React.ReactNode; accent: string;
  current?: number; previous?: number;
  /** The compared period, e.g. "4 Aug – 2 Sep". */
  previousLabel?: string;
  /** Format the previous value as money. */
  money?: boolean;
  /** An increase is bad (refunds). */
  invert?: boolean;
  hint?: string;
  tooltip?: string;
}) {
  let delta: { pct: number | null; dir: 'up' | 'down' | 'flat' } | null = null;
  if (previous !== undefined && current !== undefined) {
    const diff = current - previous;
    const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    delta = { pct: previous > 0 ? (diff / previous) * 100 : null, dir };
  }
  const good = delta ? (delta.dir === 'flat' ? null : (delta.dir === 'up') !== !!invert) : null;
  const deltaColor = good == null ? 'var(--text-muted)' : good ? 'var(--color-success)' : 'var(--color-danger)';

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }} title={tooltip}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
          <p className="text-xl font-bold mt-1 tracking-tight truncate tabular-nums" style={{ color: 'var(--text-primary)' }} title={value}>{value}</p>
        </div>
        <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>{icon}</div>
      </div>
      {delta ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs tabular-nums min-w-0" title={`${previousLabel ?? 'Previous period'}: ${money ? formatCurrencyFull(previous) : previous?.toLocaleString('en-IN')}`}>
          <span className="font-semibold flex-shrink-0" style={{ color: deltaColor }}>
            {delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '–'}
            {delta.pct != null ? ` ${Math.abs(delta.pct).toFixed(1)}%` : delta.dir === 'flat' ? ' 0%' : ' new'}
          </span>
          <span className="truncate" style={{ color: 'var(--text-muted)' }}>vs {previousLabel ?? (money ? formatCurrency(previous) : previous?.toLocaleString('en-IN'))}</span>
        </p>
      ) : hint ? (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      ) : null}
    </div>
  );
}

function SeriesChart({ report, periodLabel }: { report: RevenueReport; periodLabel: string }) {
  const granularity = report.range?.granularity ?? 'day';
  const series = report.series ?? [];
  // Stack by type when the API gives a breakdown; otherwise one bar per bucket.
  const types = PAYMENT_TYPE_OPTIONS.map((t) => t.value).filter((ty) => series.some((s) => Number(s.byType?.[ty] ?? 0) > 0));
  const rows = series.map((s) => ({
    bucket: s.bucket,
    label: formatBucket(s.bucket, granularity),
    total: Number(s.revenue),
    transactions: Number(s.transactions),
    ...Object.fromEntries(types.map((ty) => [ty, Number(s.byType?.[ty] ?? 0)])),
  }));
  const hasRevenue = rows.some((r) => r.total > 0);
  const keys = types.length ? types : ['total'];

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Revenue over time</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{periodLabel} · by {granularity}</p>
        </div>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {types.map((ty) => (
              <span key={ty} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_META[ty]?.color ?? '#94a3b8' }} />
                {TYPE_META[ty]?.label ?? ty}
              </span>
            ))}
          </div>
        )}
      </div>
      {rows.length === 0 || !hasRevenue ? (
        <div className="flex flex-col items-center justify-center h-[260px] text-center">
          <BarChart3 className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No revenue in this period</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Widen the date range or clear a filter to see payments.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v))} width={64} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: 'var(--text-secondary)', padding: 0 }}
              formatter={(v, name) => [formatCurrencyFull(Number(v)), String(name)]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                return row ? `${row.label} · ${formatCurrencyFull(row.total)} · ${row.transactions.toLocaleString('en-IN')} txns` : '';
              }}
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="revenue"
                name={k === 'total' ? 'Revenue' : TYPE_META[k]?.label ?? k}
                fill={k === 'total' ? 'var(--color-primary)' : TYPE_META[k]?.color ?? '#94a3b8'}
                radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Ranked list with proportional bars, as the Analytics page draws its city lists. */
function RankedList({ title, icon, items, color, unit }: {
  title: string; icon: React.ReactNode;
  items: { name: string; revenue: number; count: number }[];
  color: string; unit: string;
}) {
  const max = items[0]?.revenue || 1;
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
      </div>
      <div className="space-y-2">
        {items.map((c, i) => (
          <div key={`${c.name}-${i}`} className="flex items-center gap-2">
            <span className="text-xs w-5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5 gap-2">
                <span className="text-xs font-medium truncate capitalize" style={{ color: 'var(--text-primary)' }}>{c.name || 'Unknown'}</span>
                <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(c.revenue)}</span>
                  <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>{c.count.toLocaleString('en-IN')} {unit}</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(c.revenue / max) * 100}%`, background: color }} />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No data for this period</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════

function OverviewTab({ overview, plansRevenue, dealsRevenue, report, periodLabel }: {
  overview: NonNullable<ReturnType<typeof useRevenueAnalytics>['data']>['overview'];
  plansRevenue: number;
  dealsRevenue: number;
  report?: RevenueReport;
  periodLabel: string;
}) {
  const otherRevenue = overview.totalRevenue - plansRevenue - dealsRevenue;
  const byGateway = (report?.byGateway ?? []).map((g) => ({ name: g.gateway === 'apple' ? 'Apple IAP' : g.gateway, revenue: Number(g.revenue), count: Number(g.count) })).sort((a, b) => b.revenue - a.revenue);
  const byCity = (report?.byCity ?? []).map((c) => ({ name: c.city, revenue: Number(c.revenue), count: Number(c.count) })).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      {/* Revenue Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RevenueModelCard
          title="Plans Revenue"
          subtitle="Recurring subscription revenue"
          revenue={plansRevenue}
          total={overview.totalRevenue}
          color="#f59e0b"
          icon={<Crown className="w-5 h-5" />}
        />
        <RevenueModelCard
          title="Deals Revenue"
          subtitle="Deal unlocks & creation fees"
          revenue={dealsRevenue}
          total={overview.totalRevenue}
          color="#8b5cf6"
          icon={<ShoppingBag className="w-5 h-5" />}
        />
        <RevenueModelCard
          title="Other Revenue"
          subtitle="Sponsorships, badges, leads"
          revenue={otherRevenue}
          total={overview.totalRevenue}
          color="#10b981"
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      {/* Revenue Breakdown by Type */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Revenue by Type</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{overview.totalTransactions.toLocaleString()} total transactions</p>
          </div>
          <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(overview.totalRevenue)}</span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden mb-4" style={{ background: 'var(--surface-2)' }}>
          {overview.breakdown.map((item) => {
            const pct = overview.totalRevenue > 0 ? (Number(item.totalRevenue) / overview.totalRevenue * 100) : 0;
            if (pct < 0.5) return null;
            return (
              <div
                key={item.type}
                className="h-full transition-all"
                style={{ width: `${pct}%`, background: TYPE_META[item.type]?.color ?? '#94a3b8' }}
                title={`${TYPE_META[item.type]?.label ?? item.type}: ${formatCurrencyFull(Number(item.totalRevenue))}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {overview.breakdown
            .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
            .map((item) => {
              const meta = TYPE_META[item.type];
              const pct = overview.totalRevenue > 0 ? (Number(item.totalRevenue) / overview.totalRevenue * 100) : 0;
              const Icon = meta?.icon ?? CreditCard;
              return (
                <div key={item.type} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta?.color ?? '#94a3b8'}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: meta?.color ?? '#94a3b8' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{meta?.label ?? item.type}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(item.totalRevenue))}</span>
                      <span className="text-[10px] font-medium" style={{ color: meta?.color ?? 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{Number(item.count).toLocaleString()} txns</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Month vs Month */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>This Month</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(overview.thisMonthRevenue)}</p>
          {overview.lastMonthRevenue > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {overview.thisMonthRevenue >= overview.lastMonthRevenue
                ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: 'var(--color-danger)' }} />
              }
              <span className="text-xs font-semibold" style={{ color: overview.thisMonthRevenue >= overview.lastMonthRevenue ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {Math.abs(((overview.thisMonthRevenue - overview.lastMonthRevenue) / overview.lastMonthRevenue) * 100).toFixed(1)}%
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>vs last month</span>
            </div>
          )}
        </div>
        <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Last Month</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(overview.lastMonthRevenue)}</p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>Completed billing cycle</p>
        </div>
      </div>

      {/* Filtered period: by gateway and by city (from /payments/revenue) */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankedList title={`By gateway · ${periodLabel}`} icon={<CreditCard className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />} items={byGateway} color="var(--color-primary)" unit="txns" />
          <RankedList title={`Top cities · ${periodLabel}`} icon={<Globe className="w-4 h-4" style={{ color: '#10b981' }} />} items={byCity.slice(0, 10)} color="#10b981" unit="txns" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PLANS TAB
// ═══════════════════════════════════════════════════════════

function PlansTab({ plans }: { plans: NonNullable<ReturnType<typeof useRevenueAnalytics>['data']>['plans'] }) {
  const monthlyCount = Number(plans.subsByInterval.find(s => s.interval === 'monthly')?.count ?? 0);
  const yearlyCount = Number(plans.subsByInterval.find(s => s.interval === 'yearly')?.count ?? 0);
  const maxTrendRevenue = Math.max(...plans.monthlyTrend.map(m => Number(m.revenue)), 1);

  return (
    <div className="space-y-6">
      {/* Plan Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Plan Revenue" value={formatCurrency(plans.totalRevenue)} icon={<Crown className="w-5 h-5" />} accent="#f59e0b" />
        <StatCard title="MRR" value={formatCurrency(plans.mrr)} icon={<Activity className="w-5 h-5" />} accent="#6366f1" />
        <StatCard title="Monthly Subs" value={monthlyCount} icon={<Calendar className="w-5 h-5" />} accent="var(--color-info)" />
        <StatCard title="Yearly Subs" value={yearlyCount} icon={<Star className="w-5 h-5" />} accent="var(--color-success)" />
      </div>

      {/* Billing Interval Split */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Billing Interval Split</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Monthly</span>
              <span className="text-sm font-bold" style={{ color: 'var(--color-info)' }}>{monthlyCount}</span>
            </div>
            <div className="h-3 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${plans.activeSubscriptions > 0 ? (monthlyCount / plans.activeSubscriptions * 100) : 0}%`,
                  background: 'var(--color-info)',
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Yearly</span>
              <span className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>{yearlyCount}</span>
            </div>
            <div className="h-3 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${plans.activeSubscriptions > 0 ? (yearlyCount / plans.activeSubscriptions * 100) : 0}%`,
                  background: 'var(--color-success)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Revenue by Plan</h3>
        {plans.revenueByPlan.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No plan revenue data yet</p>
        ) : (
          <div className="space-y-3">
            {plans.revenueByPlan.map((plan, i) => {
              const maxRevenue = Math.max(...plans.revenueByPlan.map(p => Number(p.revenue)), 1);
              const pct = (Number(plan.revenue) / maxRevenue) * 100;
              const color = PLAN_COLORS[i % PLAN_COLORS.length];
              return (
                <div key={plan.planSlug} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.planName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {plan.planSlug}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(Number(plan.revenue))}</span>
                      <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>{Number(plan.count)} txns</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Subscription Revenue Trend (6 months)</h3>
        {plans.monthlyTrend.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No trend data available</p>
        ) : (
          <div className="flex items-end gap-2 h-36">
            {plans.monthlyTrend.map((m) => {
              const h = (Number(m.revenue) / maxTrendRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{formatCurrency(Number(m.revenue))}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md transition-all hover:opacity-80"
                      style={{ height: `${Math.max(h, 4)}%`, background: 'var(--color-primary)' }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{formatMonth(m.month)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Plan Transactions */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Plan Transactions</h3>
        <div className="space-y-2">
          {plans.recentTransactions.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
          ) : (
            plans.recentTransactions.map(txn => (
              <TransactionRow key={txn.id} txn={txn} color="#f59e0b" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DEALS TAB
// ═══════════════════════════════════════════════════════════

function DealsTab({ deals }: { deals: NonNullable<ReturnType<typeof useRevenueAnalytics>['data']>['deals'] }) {
  const dealUnlockRevenue = Number(deals.breakdown.find(b => b.type === 'deal_unlock')?.revenue ?? 0);
  const dealCreationRevenue = Number(deals.breakdown.find(b => b.type === 'deal_creation')?.revenue ?? 0);
  const dealUnlockCount = Number(deals.breakdown.find(b => b.type === 'deal_unlock')?.count ?? 0);
  const dealCreationCount = Number(deals.breakdown.find(b => b.type === 'deal_creation')?.count ?? 0);

  // Aggregate monthly deal data
  const monthlyAgg: Record<string, { unlock: number; creation: number }> = {};
  deals.monthlyTrend.forEach(m => {
    if (!monthlyAgg[m.month]) monthlyAgg[m.month] = { unlock: 0, creation: 0 };
    if (m.type === 'deal_unlock') monthlyAgg[m.month].unlock = Number(m.revenue);
    if (m.type === 'deal_creation') monthlyAgg[m.month].creation = Number(m.revenue);
  });
  const months = Object.keys(monthlyAgg).sort();
  const maxDealMonthly = Math.max(...months.map(m => monthlyAgg[m].unlock + monthlyAgg[m].creation), 1);

  return (
    <div className="space-y-6">
      {/* Deal Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Deal Revenue" value={formatCurrency(deals.totalRevenue)} icon={<ShoppingBag className="w-5 h-5" />} accent="#8b5cf6" />
        <StatCard title="Deal Unlocks" value={formatCurrency(dealUnlockRevenue)} icon={<Ticket className="w-5 h-5" />} accent="#6366f1" />
        <StatCard title="Deal Creations" value={formatCurrency(dealCreationRevenue)} icon={<Tag className="w-5 h-5" />} accent="#ec4899" />
        <StatCard title="Total Transactions" value={(dealUnlockCount + dealCreationCount).toLocaleString()} icon={<CreditCard className="w-5 h-5" />} accent="var(--color-info)" />
      </div>

      {/* Deal Type Split */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#6366f115' }}>
              <Ticket className="w-5 h-5" style={{ color: '#6366f1' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Deal Unlocks</p>
              <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(dealUnlockRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dealUnlockCount} transactions</span>
            <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>
              {deals.totalRevenue > 0 ? ((dealUnlockRevenue / deals.totalRevenue) * 100).toFixed(1) : 0}% of deals
            </span>
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Avg: {dealUnlockCount > 0 ? formatCurrencyFull(dealUnlockRevenue / dealUnlockCount) : '\u20B90'} per unlock
          </p>
        </div>
        <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ec489915' }}>
              <Tag className="w-5 h-5" style={{ color: '#ec4899' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Deal Creations</p>
              <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(dealCreationRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dealCreationCount} transactions</span>
            <span className="text-xs font-semibold" style={{ color: '#ec4899' }}>
              {deals.totalRevenue > 0 ? ((dealCreationRevenue / deals.totalRevenue) * 100).toFixed(1) : 0}% of deals
            </span>
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Avg: {dealCreationCount > 0 ? formatCurrencyFull(dealCreationRevenue / dealCreationCount) : '\u20B90'} per creation
          </p>
        </div>
      </div>

      {/* Monthly Deal Revenue Trend (Stacked) */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Deal Revenue Trend (6 months)</h3>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: '#6366f1' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6366f1' }} /> Unlocks
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: '#ec4899' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#ec4899' }} /> Creations
            </span>
          </div>
        </div>
        {months.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No deal trend data</p>
        ) : (
          <div className="flex items-end gap-2 h-36">
            {months.map((m) => {
              const { unlock, creation } = monthlyAgg[m];
              const total = unlock + creation;
              const hTotal = (total / maxDealMonthly) * 100;
              const hUnlock = total > 0 ? (unlock / total) * hTotal : 0;
              const hCreation = total > 0 ? (creation / total) * hTotal : 0;
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{formatCurrency(total)}</span>
                  <div className="w-full flex-1 flex flex-col items-stretch justify-end">
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max(hCreation, 2)}%`, background: '#ec4899' }} />
                    <div className="w-full" style={{ height: `${Math.max(hUnlock, 2)}%`, background: '#6366f1' }} />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{formatMonth(m)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Providers by Deal Revenue */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Top Providers by Deal Revenue</h3>
        {deals.topProviders.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No provider data yet</p>
        ) : (
          <div className="space-y-2">
            {deals.topProviders.map((p, i) => {
              const maxRev = Number(deals.topProviders[0]?.revenue ?? 1);
              const pct = (Number(p.revenue) / maxRev) * 100;
              return (
                <div key={p.providerId} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: i < 3 ? '#f59e0b' : 'var(--surface-2)', color: i < 3 ? 'white' : 'var(--text-muted)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.brandName || 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrencyFull(Number(p.revenue))}</span>
                      <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>{Number(p.count)} deals</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#8b5cf6' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Deal Transactions */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Deal Transactions</h3>
        <div className="space-y-2">
          {deals.recentTransactions.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
          ) : (
            deals.recentTransactions.map(txn => (
              <TransactionRow key={txn.id} txn={txn} color="#8b5cf6" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

function RevenueModelCard({ title, subtitle, revenue, total, color, icon }: {
  title: string; subtitle: string; revenue: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? (revenue / total * 100) : 0;
  return (
    <div className="rounded-xl p-5 transition-all hover:scale-[1.01]" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{pct.toFixed(1)}%</span>
      </div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{formatCurrency(revenue)}</p>
      <div className="mt-3 h-2 rounded-full" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function TransactionRow({ txn, color }: { txn: any; color: string }) {
  const meta = TYPE_META[txn.type];
  const Icon = meta?.icon ?? CreditCard;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[var(--surface-1)]" style={{ background: 'var(--surface-1)' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{txn.provider?.brandName ?? 'Provider'}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {meta?.label ?? txn.type} \u2022 {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>
      <span className="text-sm font-bold" style={{ color }}>{formatCurrencyFull(txn.amount)}</span>
    </div>
  );
}
