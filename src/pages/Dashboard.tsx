import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users, Store, Package, Star, ShieldCheck, AlertTriangle,
  ArrowRight, Loader2, Search, MessageSquare, TrendingUp,
  Image, Megaphone, Gift, UserPlus, Bell, Send, Eye,
  DollarSign, CreditCard, Heart, Zap, Plus, Clock, Flag,
  CheckCircle2, Activity, Calendar, Sparkles,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { useUrlFilters } from '../components/ui/filters';
import { DASHBOARD_FILTER_KEYS, toDashboardParams } from '../components/dashboard/dashboard-filters';
import { PeriodPicker } from '../components/dashboard/PeriodPicker';
import { dayLabel, rangeLabel } from '../components/dashboard/period-dates';
import { useDashboardStats, useDashboardPeriod, useRecentActivity } from '../hooks/useDashboard';
import { useNotificationStats } from '../hooks/useNotifications';
import { ROUTES } from '../utils/constants';
import { useMemo } from 'react';
import type { RootState } from '../store/store';
import type { DashboardGranularity, DashboardPeriodTotals, DashboardSeriesPoint } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

/** A bucket's first day as the axis shows it: "9 Oct", or "Oct 26" by month. */
const formatBucket = (bucket: string, g: DashboardGranularity): string => {
  const d = new Date(`${bucket}T00:00:00`);
  return g === 'month'
    ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** Daily, weekly or monthly counts, in the order they appear. */
const TREND_CHARTS: { key: keyof Omit<DashboardSeriesPoint, 'bucket'>; title: string; name: string; color: string; bar?: boolean }[] = [
  { key: 'users', title: 'User Growth', name: 'New Users', color: 'var(--color-primary)' },
  { key: 'providers', title: 'Provider Growth', name: 'New Providers', color: 'var(--color-success)' },
  { key: 'searches', title: 'Search Volume', name: 'Searches', color: '#8B5CF6', bar: true },
  { key: 'reports', title: 'Report Volume', name: 'Reports', color: 'var(--color-danger)', bar: true },
  { key: 'leads', title: 'Lead Volume', name: 'Leads', color: '#EC4899' },
  { key: 'conversations', title: 'Conversation Volume', name: 'Conversations', color: '#06B6D4' },
];

/** Marks a figure that is a live state, so the date range doesn't apply. */
const NOW = 'Right now';

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  approve: { label: 'Approved', color: 'var(--color-success)' },
  reject: { label: 'Rejected', color: 'var(--color-danger)' },
  suspend: { label: 'Suspended', color: 'var(--color-warning)' },
  create: { label: 'Created', color: 'var(--color-primary)' },
  update: { label: 'Updated', color: 'var(--color-info)' },
  delete: { label: 'Deleted', color: 'var(--color-danger)' },
  verify: { label: 'Verified', color: 'var(--color-success)' },
  flag: { label: 'Flagged', color: '#F59E0B' },
  warn: { label: 'Warned', color: '#F97316' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: notifStats } = useNotificationStats();
  const { data: recentActivity } = useRecentActivity();
  const { values, update } = useUrlFilters(DASHBOARD_FILTER_KEYS);
  const params = useMemo(() => toDashboardParams(values), [values]);
  // While a new period loads, the last one stays on screen.
  const { data: period, isPlaceholderData: switching } = useDashboardPeriod(params);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>Failed to load dashboard stats</p>
      </div>
    );
  }

  // A range narrows every figure that happens over time; "all time" is no range.
  const ranged = !!(params.from || params.to);
  const t = period?.totals;
  const prev = period?.previous?.totals;
  const granularity = period?.range.granularity ?? 'day';
  const periodLabel = !period
    ? (ranged ? 'Selected period' : 'All time')
    : period.range.allTime
      ? `All time · since ${dayLabel(period.range.from, true)}`
      : rangeLabel(period.range.from, period.range.to);
  const prevLabel = period?.previous ? rangeLabel(period.previous.from, period.previous.to) : null;

  const count = (k: keyof DashboardPeriodTotals) => (t ? t[k].toLocaleString() : '—');
  /** Change against the previous period, when comparing. */
  const vs = (k: keyof DashboardPeriodTotals): { trend?: { value: number; label: string }; hint?: string } => {
    if (!t || !prev) return {};
    if (prev[k] > 0) return { trend: { value: Math.round(((t[k] - prev[k]) / prev[k]) * 1000) / 10, label: 'vs previous' } };
    return t[k] > 0 ? { hint: 'Up from 0' } : {};
  };

  const kpis = ranged
    ? [
        { title: 'New Users', value: count('newUsers'), icon: <Users className="w-5 h-5" />, accent: 'var(--color-primary)', onClick: () => navigate(ROUTES.USERS), ...vs('newUsers'), hint: t ? `${t.signedInUsers.toLocaleString()} signed in themselves` : undefined },
        { title: 'New Providers', value: count('newProviders'), icon: <Store className="w-5 h-5" />, accent: 'var(--color-success)', onClick: () => navigate(ROUTES.PROVIDERS), ...vs('newProviders') },
        { title: 'Products Added', value: count('newProducts'), icon: <Package className="w-5 h-5" />, accent: 'var(--color-info)', onClick: () => navigate(ROUTES.PRODUCTS), ...vs('newProducts') },
        { title: 'Reviews Posted', value: count('reviews'), icon: <Star className="w-5 h-5" />, accent: '#F59E0B', onClick: () => navigate(ROUTES.REVIEWS), ...vs('reviews') },
      ]
    : [
        { title: 'Total Users', value: stats?.totalUsers?.toLocaleString() ?? '—', icon: <Users className="w-5 h-5" />, accent: 'var(--color-primary)', onClick: () => navigate(ROUTES.USERS) },
        { title: 'Providers', value: stats?.totalProviders?.toLocaleString() ?? '—', icon: <Store className="w-5 h-5" />, accent: 'var(--color-success)', onClick: () => navigate(ROUTES.PROVIDERS) },
        { title: 'Products', value: stats?.totalProducts?.toLocaleString() ?? '—', icon: <Package className="w-5 h-5" />, accent: 'var(--color-info)', onClick: () => navigate(ROUTES.PRODUCTS) },
        { title: 'Reviews', value: stats?.totalReviews?.toLocaleString() ?? '—', icon: <Star className="w-5 h-5" />, accent: '#F59E0B', onClick: () => navigate(ROUTES.REVIEWS) },
      ];

  const growthMetrics = [
    { title: 'Searches', value: count('searches'), icon: <Search className="w-5 h-5" />, accent: '#8B5CF6', ...vs('searches') },
    { title: 'Leads', value: count('leads'), icon: <TrendingUp className="w-5 h-5" />, accent: '#EC4899', ...vs('leads') },
    { title: 'Conversations', value: count('conversations'), icon: <MessageSquare className="w-5 h-5" />, accent: '#06B6D4', ...vs('conversations') },
    { title: 'Messages', value: count('messages'), icon: <Send className="w-5 h-5" />, accent: 'var(--color-info)', ...vs('messages') },
    { title: 'Reports Filed', value: count('reports'), icon: <Flag className="w-5 h-5" />, accent: 'var(--color-danger)', ...vs('reports') },
  ];

  const actionCards = [
    { title: 'Pending Verifications', count: stats?.pendingVerifications ?? 0, icon: ShieldCheck, color: 'var(--color-info)', bg: 'var(--color-info-light)', route: ROUTES.REGISTRATIONS },
    { title: 'Pending Providers', count: stats?.pendingProviders ?? 0, icon: Store, color: 'var(--color-warning)', bg: 'var(--color-warning-light)', route: ROUTES.PROVIDERS },
    { title: 'Open Reports', count: stats?.openReports ?? 0, icon: AlertTriangle, color: 'var(--color-danger)', bg: 'var(--color-danger-light)', route: ROUTES.REPORTS },
    { title: 'Women-Led Pending', count: stats?.womenLedPending ?? 0, icon: Heart, color: '#9333EA', bg: '#F3E8FF', route: ROUTES.WOMEN_LED },
  ];

  const marketingStats = [
    { title: 'Active Banners', value: stats?.activeBanners ?? 0, icon: <Image className="w-5 h-5" />, accent: '#F59E0B', onClick: () => navigate(ROUTES.BANNERS), hint: NOW },
    { title: 'Active Sponsorships', value: stats?.activeSponsorships ?? 0, icon: <Megaphone className="w-5 h-5" />, accent: 'var(--color-primary)', onClick: () => navigate(ROUTES.SPONSORSHIPS), hint: NOW },
    { title: 'Active Offers', value: stats?.activeOffers ?? 0, icon: <Gift className="w-5 h-5" />, accent: 'var(--color-success)', onClick: () => navigate(ROUTES.OFFERS), hint: NOW },
    { title: 'App Invites', value: count('invites'), icon: <UserPlus className="w-5 h-5" />, accent: '#EC4899', ...vs('invites') },
  ];

  const quickActions = [
    { label: 'Create Provider', icon: Plus, color: 'var(--color-success)', route: ROUTES.CREATE_PROVIDER },
    { label: 'Send Notification', icon: Send, color: 'var(--color-primary)', route: ROUTES.NOTIFICATIONS },
    { label: 'Manage Categories', icon: Package, color: '#8B5CF6', route: ROUTES.CATEGORIES },
    { label: 'View Reports', icon: AlertTriangle, color: 'var(--color-danger)', route: ROUTES.REPORTS },
    { label: 'Create User', icon: UserPlus, color: '#06B6D4', route: ROUTES.CREATE_USER },
  ];

  const searchToLeadRate = t?.searches && t.leads
    ? ((t.leads / t.searches) * 100).toFixed(1)
    : '0';
  const leadToConvoRate = t?.leads && t.conversations
    ? ((t.conversations / t.leads) * 100).toFixed(1)
    : '0';
  const adCtr = t?.adImpressions ? Math.round((t.adClicks / t.adImpressions) * 10000) / 100 : 0;
  const readRate = t?.notificationsSent ? Math.round((t.notificationsRead / t.notificationsSent) * 100) : 0;
  const totalPending = (stats?.pendingVerifications ?? 0) + (stats?.pendingProviders ?? 0) + (stats?.openReports ?? 0) + (stats?.womenLedPending ?? 0);

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: totalPending > 10 ? 'var(--color-warning)' : 'var(--color-success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {totalPending > 0 ? `${totalPending} pending` : 'All clear'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <Activity className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System healthy</span>
          </div>
        </div>
      </div>

      {/* Period: applies to every figure that happens over time */}
      <div className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <PeriodPicker values={values} onChange={update} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-3 text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
          <p className="flex flex-wrap items-center gap-x-1.5" aria-live="polite">
            {switching && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--color-primary)' }} />}
            {period?.range.allTime ? (
              <>Everything since <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{dayLabel(period.range.from, true)}</span></>
            ) : (
              <>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{periodLabel}</span>
                {period && <span>· {period.range.days} {period.range.days === 1 ? 'day' : 'days'}</span>}
              </>
            )}
            {prevLabel && <span>· vs <span className="font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{prevLabel}</span></span>}
          </p>
          <p>Figures marked “{NOW}” are live and ignore the dates</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--surface-1)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${action.color} 12%, transparent)` }}>
                <action.icon className="w-4 h-4" style={{ color: action.color }} />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (<StatCard key={kpi.title} {...kpi} />))}
      </div>

      {/* Conversion Funnel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, #8B5CF6 12%, transparent)' }}>
            <Search className="w-5 h-5" style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Search → Lead</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{searchToLeadRate}%</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, #EC4899 12%, transparent)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: '#EC4899' }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Lead → Convo</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{leadToConvoRate}%</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)' }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Subs Rate · {NOW}</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.totalProviders ? ((stats.activeSubscriptions / stats.totalProviders) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>
      </div>

      {/* Action Required + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <h2 className="text-base font-semibold mb-3 flex items-baseline gap-2" style={{ color: 'var(--text-primary)' }}>
            Requires Attention
            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{NOW}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionCards.map((card) => (
              <button
                key={card.title}
                onClick={() => navigate(card.route)}
                className="flex items-center gap-4 p-4 rounded-xl text-left transition-all group"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = card.color; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: card.bg, color: card.color }}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{card.title}</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.count}</p>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
            <button onClick={() => navigate(`${ROUTES.LOGS}?sources=admin&range=7d`)} className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              View all
            </button>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {recentActivity.slice(0, 6).map((item) => {
                  const actionInfo = ACTION_LABELS[item.action] || { label: item.action, color: 'var(--text-muted)' };
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: actionInfo.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.adminName}</span>
                          {' '}
                          <span className="font-medium" style={{ color: actionInfo.color }}>{actionInfo.label.toLowerCase()}</span>
                          {' '}
                          {item.entityType?.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Clock className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Growth & Engagement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {growthMetrics.map((m) => (<StatCard key={m.title} {...m} />))}
        </div>
      </div>

      {/* Trends over the period */}
      {period && (
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Trends</h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>By {granularity} · {periodLabel}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {TREND_CHARTS.map((c) => {
              const axis = {
                x: <XAxis dataKey="bucket" tickFormatter={(b: string) => formatBucket(b, granularity)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} minTickGap={12} />,
                y: <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />,
                tip: (
                  <Tooltip
                    labelFormatter={(b) => (granularity === 'week' ? `Week of ${formatBucket(String(b), 'day')}` : formatBucket(String(b), granularity))}
                    contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  />
                ),
              };
              return (
                <div key={c.key} className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {period.series.reduce((sum, p) => sum + p[c.key], 0).toLocaleString()} total
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    {c.bar ? (
                      <BarChart data={period.series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                        {axis.x}{axis.y}{axis.tip}
                        <Bar dataKey={c.key} fill={c.color} radius={[4, 4, 0, 0]} name={c.name} />
                      </BarChart>
                    ) : (
                      <AreaChart data={period.series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                        {axis.x}{axis.y}{axis.tip}
                        <Area type="monotone" dataKey={c.key} stroke={c.color} fill={c.color} fillOpacity={0.1} strokeWidth={2} name={c.name} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Marketing Quick Stats */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Marketing</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {marketingStats.map((m) => (<StatCard key={m.title} {...m} />))}
        </div>
      </div>

      {/* Monetization & Revenue */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Monetization</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title={ranged ? 'Revenue' : 'Total Revenue'} value={t ? `₹${t.revenue.toLocaleString()}` : '—'} icon={<DollarSign className="w-5 h-5" />} accent="var(--color-success)" onClick={() => navigate(ROUTES.REVENUE)} {...vs('revenue')} />
          <StatCard title="Payments" value={count('payments')} icon={<CreditCard className="w-5 h-5" />} accent="var(--color-info)" onClick={() => navigate(ROUTES.PAYMENTS)} {...vs('payments')} />
          <StatCard title="Active Subs" value={stats?.activeSubscriptions ?? 0} icon={<Zap className="w-5 h-5" />} accent="#8B5CF6" onClick={() => navigate(ROUTES.SUBSCRIPTIONS)} hint={NOW} />
          <StatCard title="Pending Sponsorships" value={stats?.pendingSponsorships ?? 0} icon={<Megaphone className="w-5 h-5" />} accent="#F59E0B" onClick={() => navigate(ROUTES.SPONSORSHIPS)} hint={NOW} />
        </div>
      </div>

      {/* Lead Funnel & Ad Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Funnel Pie */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Lead Funnel</p>
          {period && (period.leadBreakdown.hot + period.leadBreakdown.warm + period.leadBreakdown.cold) > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Hot', value: period.leadBreakdown.hot },
                      { name: 'Warm', value: period.leadBreakdown.warm },
                      { name: 'Cold', value: period.leadBreakdown.cold },
                    ]}
                    cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                    paddingAngle={3} dataKey="value"
                  >
                    <Cell fill="#EF4444" />
                    <Cell fill="#F59E0B" />
                    <Cell fill="#6B7280" />
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Hot — {period.leadBreakdown.hot}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Warm — {period.leadBreakdown.warm}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#6B7280' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cold — {period.leadBreakdown.cold}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>No leads in this period</p>
          )}
        </div>

        {/* Ad Performance */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Ad Performance</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count('adImpressions')}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Impressions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count('adClicks')}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: adCtr > 2 ? 'var(--color-success)' : 'var(--text-primary)' }}>{adCtr}%</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>CTR</p>
            </div>
          </div>
        </div>
      </div>

      {/* City Distribution */}
      {(period?.topCities.length ?? 0) > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            Provider Distribution by City{ranged && <span className="font-normal" style={{ color: 'var(--text-muted)' }}> · joined in this period</span>}
          </p>
          <div className="space-y-2">
            {period?.topCities.map((c) => {
              const maxCount = period.topCities[0]?.count || 1;
              return (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 truncate" style={{ color: 'var(--text-secondary)' }}>{c.city}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(c.count / maxCount) * 100}%`, background: 'var(--color-primary)' }}
                    />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: 'var(--text-primary)' }}>{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notification Stats */}
      {t && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
            <button
              onClick={() => navigate(ROUTES.NOTIFICATIONS)}
              className="flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              Manage
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard title={ranged ? 'Sent' : 'Total Sent'} value={count('notificationsSent')} icon={<Bell className="w-5 h-5" />} accent="var(--color-info)" {...vs('notificationsSent')} />
            <StatCard title={ranged ? 'Read' : 'Total Read'} value={count('notificationsRead')} icon={<Eye className="w-5 h-5" />} accent="var(--color-success)" {...vs('notificationsRead')} />
            <StatCard title="Read Rate" value={`${readRate}%`} icon={<TrendingUp className="w-5 h-5" />} accent="#8B5CF6" />
            <StatCard title="Batches Sent" value={count('batchesSent')} icon={<Megaphone className="w-5 h-5" />} accent="#F59E0B" onClick={() => navigate(ROUTES.NOTIFICATIONS)} {...vs('batchesSent')} />
            <StatCard title="Sent Today" value={notifStats?.sentToday ?? '—'} icon={<Send className="w-5 h-5" />} accent="var(--color-primary)" hint="Today" />
          </div>
        </div>
      )}
    </div>
  );
}
