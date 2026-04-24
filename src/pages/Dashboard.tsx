import { useNavigate } from 'react-router-dom';
import {
  Users, Store, Package, Star, ShieldCheck, AlertTriangle,
  ArrowRight, Loader2, Search, MessageSquare, TrendingUp,
  Image, Megaphone, Gift, UserPlus,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { useDashboardStats, useDashboardTimeSeries } from '../hooks/useDashboard';
import { ROUTES } from '../utils/constants';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

const formatDate = (label: unknown): string => {
  const d = new Date(String(label));
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useDashboardStats();
  const [days, setDays] = useState(30);
  const { data: timeSeries } = useDashboardTimeSeries(days);

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
  ];

  const marketingStats = [
    { title: 'Active Banners', value: stats?.activeBanners ?? 0, icon: <Image className="w-5 h-5" />, accent: '#F59E0B', onClick: () => navigate(ROUTES.BANNERS) },
    { title: 'Active Sponsorships', value: stats?.activeSponsorships ?? 0, icon: <Megaphone className="w-5 h-5" />, accent: 'var(--color-primary)', onClick: () => navigate(ROUTES.SPONSORSHIPS) },
    { title: 'Active Offers', value: stats?.activeOffers ?? 0, icon: <Gift className="w-5 h-5" />, accent: 'var(--color-success)', onClick: () => navigate(ROUTES.OFFERS) },
    { title: 'App Invites', value: stats?.totalInvites?.toLocaleString() ?? '0', icon: <UserPlus className="w-5 h-5" />, accent: '#EC4899' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Platform overview and key metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (<StatCard key={kpi.title} {...kpi} />))}
      </div>

      {/* Action Required */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Requires Attention</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
    </div>
  );
}
