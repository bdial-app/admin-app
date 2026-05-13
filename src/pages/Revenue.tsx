import { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Users, Crown,
  ArrowUpRight, ArrowDownRight, Calendar, Zap, Star, ShoppingBag,
  Ticket, Unlock, Tag, BarChart3, PieChart, Activity,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useRevenueAnalytics } from '../hooks/usePayments';
import { ROUTES } from '../utils/constants';

const formatCurrency = (v: number | null | undefined) => {
  if (v == null || isNaN(Number(v))) return '\u20B90';
  const n = Number(v);
  if (n >= 10000000) return `\u20B9${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}K`;
  return `\u20B9${n.toLocaleString('en-IN')}`;
};

const formatCurrencyFull = (v: number | null | undefined) => {
  if (v == null || isNaN(Number(v))) return '\u20B90';
  return `\u20B9${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

type Tab = 'overview' | 'plans' | 'deals';

export default function Revenue() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, isLoading } = useRevenueAnalytics();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Revenue" description="Loading analytics\u2026" breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Revenue' }]} />
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { overview, plans, deals } = data;

  const growthPct = overview.lastMonthRevenue > 0
    ? ((overview.thisMonthRevenue - overview.lastMonthRevenue) / overview.lastMonthRevenue * 100)
    : 0;

  const tabs: { key: Tab; label: string; icon: typeof DollarSign }[] = [
    { key: 'overview', label: 'Overview', icon: PieChart },
    { key: 'plans', label: 'Plans Revenue', icon: Crown },
    { key: 'deals', label: 'Deals Revenue', icon: ShoppingBag },
  ];

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Comprehensive revenue analytics across all monetization models"
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Revenue' },
        ]}
      />

      {/* ═══════ TOP STATS ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(overview.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          accent="var(--color-primary)"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(overview.thisMonthRevenue)}
          icon={growthPct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          accent={growthPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          trend={growthPct !== 0 ? `${growthPct > 0 ? '+' : ''}${growthPct.toFixed(1)}% vs last month` : undefined}
        />
        <StatCard
          title="MRR"
          value={formatCurrency(overview.mrr)}
          icon={<Activity className="w-5 h-5" />}
          accent="#6366f1"
        />
        <StatCard
          title="ARR"
          value={formatCurrency(overview.arr)}
          icon={<BarChart3 className="w-5 h-5" />}
          accent="#f59e0b"
        />
        <StatCard
          title="Active Subs"
          value={overview.activeSubscriptions}
          icon={<Users className="w-5 h-5" />}
          accent="var(--color-info)"
        />
      </div>

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
      {tab === 'overview' && <OverviewTab overview={overview} plansRevenue={plans.totalRevenue} dealsRevenue={deals.totalRevenue} />}
      {tab === 'plans' && <PlansTab plans={plans} />}
      {tab === 'deals' && <DealsTab deals={deals} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════

function OverviewTab({ overview, plansRevenue, dealsRevenue }: {
  overview: NonNullable<ReturnType<typeof useRevenueAnalytics>['data']>['overview'];
  plansRevenue: number;
  dealsRevenue: number;
}) {
  const otherRevenue = overview.totalRevenue - plansRevenue - dealsRevenue;

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
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
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
