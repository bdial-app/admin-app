import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users, Store, Package, Star, ShieldCheck, AlertTriangle,
  ArrowRight, Loader2, Search, MessageSquare, TrendingUp,
  Image, Megaphone, Gift, UserPlus, Bell, Send, Eye,
  DollarSign, CreditCard, Heart, Zap, Plus, Clock,
  CheckCircle2, Activity, Calendar, Sparkles,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { useDashboardStats, useDashboardTimeSeries, useRecentActivity } from '../hooks/useDashboard';
import { useNotificationStats } from '../hooks/useNotifications';
import { ROUTES } from '../utils/constants';
import { useState } from 'react';
import type { RootState } from '../store/store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const formatDate = (label: unknown): string => {
  const d = new Date(String(label));
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

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
  const [days, setDays] = useState(30);
  const { data: timeSeries } = useDashboardTimeSeries(days);
  const { data: recentActivity } = useRecentActivity();

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

  const kpis = [
    { title: 'Total Users', value: stats?.totalUsers?.toLocaleString() ?? '—', icon: <Users className="w-5 h-5" />, accent: 'var(--color-primary)', onClick: () => navigate(ROUTES.USERS) },
    { title: 'Providers', value: stats?.totalProviders?.toLocaleString() ?? '—', icon: <Store className="w-5 h-5" />, accent: 'var(--color-success)', onClick: () => navigate(ROUTES.PROVIDERS) },
    { title: 'Products', value: stats?.totalProducts?.toLocaleString() ?? '—', icon: <Package className="w-5 h-5" />, accent: 'var(--color-info)', onClick: () => navigate(ROUTES.PRODUCTS) },
    { title: 'Reviews', value: stats?.totalReviews?.toLocaleString() ?? '—', icon: <Star className="w-5 h-5" />, accent: '#F59E0B', onClick: () => navigate(ROUTES.REVIEWS) },
  ];

  const growthMetrics = [
    { title: 'New Users (7d)', value: stats?.newUsersThisWeek ?? 0, icon: <UserPlus className="w-5 h-5" />, accent: 'var(--color-primary)' },
    { title: 'New Users (30d)', value: stats?.newUsersThisMonth ?? 0, icon: <Users className="w-5 h-5" />, accent: 'var(--color-info)' },
    { title: 'New Providers (7d)', value: stats?.newProvidersThisWeek ?? 0, icon: <Store className="w-5 h-5" />, accent: 'var(--color-success)' },
    { title: 'Total Searches', value: stats?.totalSearches?.toLocaleString() ?? '0', icon: <Search className="w-5 h-5" />, accent: '#8B5CF6' },
    { title: 'Total Leads', value: stats?.totalLeads?.toLocaleString() ?? '0', icon: <TrendingUp className="w-5 h-5" />, accent: '#EC4899' },
    { title: 'Conversations', value: stats?.totalConversations?.toLocaleString() ?? '0', icon: <MessageSquare className="w-5 h-5" />, accent: '#06B6D4' },
  ];

  const actionCards = [
    { title: 'Pending Verifications', count: stats?.pendingVerifications ?? 0, icon: ShieldCheck, color: 'var(--color-info)', bg: 'var(--color-info-light)', route: ROUTES.REGISTRATIONS },
    { title: 'Pending Providers', count: stats?.pendingProviders ?? 0, icon: Store, color: 'var(--color-warning)', bg: 'var(--color-warning-light)', route: ROUTES.PROVIDERS },
    { title: 'Open Reports', count: stats?.openReports ?? 0, icon: AlertTriangle, color: 'var(--color-danger)', bg: 'var(--color-danger-light)', route: ROUTES.REPORTS },
    { title: 'Women-Led Pending', count: stats?.womenLedPending ?? 0, icon: Heart, color: '#9333EA', bg: '#F3E8FF', route: ROUTES.WOMEN_LED },
  ];

  const marketingStats = [
    { title: 'Active Banners', value: stats?.activeBanners ?? 0, icon: <Image className="w-5 h-5" />, accent: '#F59E0B', onClick: () => navigate(ROUTES.BANNERS) },
    { title: 'Active Sponsorships', value: stats?.activeSponsorships ?? 0, icon: <Megaphone className="w-5 h-5" />, accent: 'var(--color-primary)', onClick: () => navigate(ROUTES.SPONSORSHIPS) },
    { title: 'Active Offers', value: stats?.activeOffers ?? 0, icon: <Gift className="w-5 h-5" />, accent: 'var(--color-success)', onClick: () => navigate(ROUTES.OFFERS) },
    { title: 'App Invites', value: stats?.totalInvites?.toLocaleString() ?? '0', icon: <UserPlus className="w-5 h-5" />, accent: '#EC4899' },
  ];

  const quickActions = [
    { label: 'Create Provider', icon: Plus, color: 'var(--color-success)', route: ROUTES.CREATE_PROVIDER },
    { label: 'Send Notification', icon: Send, color: 'var(--color-primary)', route: ROUTES.NOTIFICATIONS },
    { label: 'Review Queue', icon: ShieldCheck, color: 'var(--color-info)', route: ROUTES.MODERATION_QUEUE },
    { label: 'Manage Categories', icon: Package, color: '#8B5CF6', route: ROUTES.CATEGORIES },
    { label: 'View Reports', icon: AlertTriangle, color: 'var(--color-danger)', route: ROUTES.REPORTS },
    { label: 'Create User', icon: UserPlus, color: '#06B6D4', route: ROUTES.CREATE_USER },
  ];

  const searchToLeadRate = stats?.totalSearches && stats.totalLeads
    ? ((stats.totalLeads / stats.totalSearches) * 100).toFixed(1)
    : '0';
  const leadToConvoRate = stats?.totalLeads && stats.totalConversations
    ? ((stats.totalConversations / stats.totalLeads) * 100).toFixed(1)
    : '0';
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
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Subs Rate</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.totalProviders ? ((stats.activeSubscriptions / stats.totalProviders) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>
      </div>

      {/* Action Required + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Requires Attention</h2>
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
            <button onClick={() => navigate(ROUTES.AUDIT_LOG)} className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {growthMetrics.map((m) => (<StatCard key={m.title} {...m} />))}
        </div>
      </div>

      {/* Time Series Charts */}
      {timeSeries && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Trends</h2>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              {[7, 14, 30, 60].map((d) => (
                <button key={d} onClick={() => setDays(d)} className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" style={{
                  background: days === d ? 'var(--surface-0)' : 'transparent',
                  color: days === d ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: days === d ? 'var(--shadow-sm)' : 'none',
                }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User Growth */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>User Growth</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeSeries.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.1} strokeWidth={2} name="New Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Provider Growth */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Provider Growth</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeSeries.providerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.1} strokeWidth={2} name="New Providers" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Search Volume */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Search Volume</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeSeries.searchVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Searches" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Report Volume */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Report Volume</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeSeries.reportVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-danger)" radius={[4, 4, 0, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard title="Total Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} accent="var(--color-success)" onClick={() => navigate(ROUTES.REVENUE)} />
          <StatCard title="Revenue (30d)" value={`₹${(stats?.revenueThisMonth ?? 0).toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} accent="#10B981" />
          <StatCard title="Payments" value={(stats?.totalPayments ?? 0).toLocaleString()} icon={<CreditCard className="w-5 h-5" />} accent="var(--color-info)" onClick={() => navigate(ROUTES.PAYMENTS)} />
          <StatCard title="Active Subs" value={stats?.activeSubscriptions ?? 0} icon={<Zap className="w-5 h-5" />} accent="#8B5CF6" onClick={() => navigate(ROUTES.SUBSCRIPTIONS)} />
          <StatCard title="Pending Sponsorships" value={stats?.pendingSponsorships ?? 0} icon={<Megaphone className="w-5 h-5" />} accent="#F59E0B" onClick={() => navigate(ROUTES.SPONSORSHIPS)} />
        </div>
      </div>

      {/* Lead Funnel & Ad Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Funnel Pie */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Lead Funnel</p>
          {stats?.leadBreakdown && (stats.leadBreakdown.hot + stats.leadBreakdown.warm + stats.leadBreakdown.cold) > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Hot', value: stats.leadBreakdown.hot },
                      { name: 'Warm', value: stats.leadBreakdown.warm },
                      { name: 'Cold', value: stats.leadBreakdown.cold },
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
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Hot — {stats.leadBreakdown.hot}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Warm — {stats.leadBreakdown.warm}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#6B7280' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cold — {stats.leadBreakdown.cold}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>No lead data yet</p>
          )}
        </div>

        {/* Ad Performance */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Ad Performance</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(stats?.adImpressions ?? 0).toLocaleString()}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Impressions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(stats?.adClicks ?? 0).toLocaleString()}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: stats?.adCtr && stats.adCtr > 2 ? 'var(--color-success)' : 'var(--text-primary)' }}>{stats?.adCtr ?? 0}%</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>CTR</p>
            </div>
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Messages Sent</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{(stats?.totalMessages ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* City Distribution */}
      {(stats?.topCities?.length ?? 0) > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Provider Distribution by City</p>
          <div className="space-y-2">
            {stats?.topCities?.map((c: any) => {
              const maxCount = stats?.topCities?.[0]?.count || 1;
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

      {/* Lead & Conversation Trends */}
      {timeSeries && (timeSeries.leadVolume?.length > 0 || timeSeries.conversationVolume?.length > 0) && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Engagement Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {timeSeries.leadVolume?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Lead Volume</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={timeSeries.leadVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#EC4899" fill="#EC4899" fillOpacity={0.1} strokeWidth={2} name="Leads" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {timeSeries.conversationVolume?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Conversation Volume</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={timeSeries.conversationVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.1} strokeWidth={2} name="Conversations" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Stats */}
      {notifStats && (
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
            <StatCard title="Sent Today" value={notifStats.sentToday} icon={<Send className="w-5 h-5" />} accent="var(--color-primary)" />
            <StatCard title="Total Sent" value={notifStats.totalSent.toLocaleString()} icon={<Bell className="w-5 h-5" />} accent="var(--color-info)" />
            <StatCard title="Total Read" value={notifStats.totalRead.toLocaleString()} icon={<Eye className="w-5 h-5" />} accent="var(--color-success)" />
            <StatCard title="Read Rate" value={`${notifStats.readRate}%`} icon={<TrendingUp className="w-5 h-5" />} accent="#8B5CF6" />
            <StatCard title="Batches Sent" value={notifStats.batchesSent} icon={<Megaphone className="w-5 h-5" />} accent="#F59E0B" onClick={() => navigate(ROUTES.NOTIFICATIONS)} />
          </div>
        </div>
      )}
    </div>
  );
}
