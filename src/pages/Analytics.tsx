import { useState } from 'react';
import {
  BarChart3, Search, Globe, Activity, TrendingUp, MousePointerClick,
  Users, Store, Loader2, Eye, Zap, MessageSquare,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useAnalyticsOverview, useSearchTrends, useGeographicStats } from '../hooks/useAnalytics';
import { ROUTES } from '../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const TABS = [
  { label: 'Overview', value: 'overview', icon: BarChart3 },
  { label: 'Search Trends', value: 'search', icon: Search },
  { label: 'Geographic', value: 'geographic', icon: Globe },
];

const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EF4444', '#14B8A6'];

const formatDate = (label: unknown): string => {
  const d = new Date(String(label));
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

function OverviewTab() {
  const { data, isLoading } = useAnalyticsOverview();

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;
  if (!data) return null;

  const kpis = [
    { title: 'Total Events', value: data.totalEvents.toLocaleString(), icon: <Activity className="w-5 h-5" />, accent: 'var(--color-primary)' },
    { title: 'Events (7d)', value: data.eventsThisWeek.toLocaleString(), icon: <Zap className="w-5 h-5" />, accent: 'var(--color-info)' },
    { title: 'Total Leads', value: data.totalLeads.toLocaleString(), icon: <TrendingUp className="w-5 h-5" />, accent: '#EC4899' },
    { title: 'Hot Leads', value: data.hotLeads.toLocaleString(), icon: <TrendingUp className="w-5 h-5" />, accent: 'var(--color-danger)' },
    { title: 'Total Searches', value: data.totalSearches.toLocaleString(), icon: <Search className="w-5 h-5" />, accent: '#8B5CF6' },
    { title: 'Searches (7d)', value: data.searchesThisWeek.toLocaleString(), icon: <Search className="w-5 h-5" />, accent: '#06B6D4' },
    { title: 'Ad Impressions', value: data.adImpressions.toLocaleString(), icon: <Eye className="w-5 h-5" />, accent: '#F59E0B' },
    { title: 'Ad CTR', value: `${data.adCtr}%`, icon: <MousePointerClick className="w-5 h-5" />, accent: 'var(--color-success)' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => <StatCard key={k.title} {...k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event Type Breakdown */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Event Type Breakdown</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.eventBreakdown.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis dataKey="eventType" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Source */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Traffic Source</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.sourceBreakdown}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                dataKey="count" nameKey="source"
                paddingAngle={2}
              >
                {data.sourceBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {data.sourceBreakdown.map((s, i) => (
              <span key={s.source} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.source} ({s.count})
              </span>
            ))}
          </div>
        </div>

        {/* Lead Distribution */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Lead Tier Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.leadTierDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="tier" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Leads">
                {data.leadTierDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.tier === 'hot' ? '#EF4444' : entry.tier === 'warm' ? '#F59E0B' : entry.tier === 'soft' ? '#06B6D4' : '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Quick Numbers</p>
          <div className="space-y-3">
            {[
              { label: 'Ad Clicks', value: data.adClicks.toLocaleString(), icon: MousePointerClick },
              { label: 'Warm Leads', value: data.warmLeads.toLocaleString(), icon: TrendingUp },
              { label: 'App Invites', value: data.totalInvites.toLocaleString(), icon: MessageSquare },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchTrendsTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useSearchTrends(days);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {[7, 14, 30, 60].map((d) => (
            <button key={d} onClick={() => setDays(d)} className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" style={{
              background: days === d ? 'var(--surface-0)' : 'transparent',
              color: days === d ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: days === d ? 'var(--shadow-sm)' : 'none',
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Search Volume Chart */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Search Volume</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.searchVolumeByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip labelFormatter={formatDate} contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="count" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} name="Searches" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Queries */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Top Search Queries</p>
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {data.topQueries.map((q, i) => (
              <div key={q.query} className="flex items-center justify-between p-2 rounded-lg" style={{ background: i % 2 === 0 ? 'var(--surface-1)' : 'transparent' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono w-6 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{q.query}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>avg {q.avgResults} results</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{q.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zero Result + Top Cities */}
        <div className="space-y-4">
          {/* Zero Result Queries */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Zero Result Queries
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-danger)' }}>
                Content gaps
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {data.zeroResultQueries.map((q) => (
                <span key={q.query} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
                  {q.query}
                  <span className="opacity-70">({q.count})</span>
                </span>
              ))}
              {data.zeroResultQueries.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No zero-result queries</p>
              )}
            </div>
          </div>

          {/* Top Cities */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Top Search Cities</p>
            <div className="space-y-2">
              {data.topCities.slice(0, 10).map((c, i) => {
                const maxCount = data.topCities[0]?.count || 1;
                return (
                  <div key={c.city} className="flex items-center gap-2">
                    <span className="text-xs w-5 text-right" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.city}</span>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{c.count}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(c.count / maxCount) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeographicTab() {
  const { data, isLoading } = useGeographicStats();

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>;
  if (!data) return null;

  const renderCityList = (items: { city: string; count: number }[], title: string, icon: React.ReactNode, color: string) => {
    const max = items[0]?.count || 1;
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
        </div>
        <div className="space-y-2">
          {items.slice(0, 15).map((c, i) => (
            <div key={c.city} className="flex items-center gap-2">
              <span className="text-xs w-5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.city}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.count.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%`, background: color }} />
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No data</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {renderCityList(data.usersByCity, 'Users by City', <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />, 'var(--color-primary)')}
      {renderCityList(data.providersByCity, 'Providers by City', <Store className="w-4 h-4" style={{ color: 'var(--color-success)' }} />, 'var(--color-success)')}
      {renderCityList(data.searchesByCity, 'Searches by City', <Search className="w-4 h-4" style={{ color: '#8B5CF6' }} />, '#8B5CF6')}
    </div>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState('overview');

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Platform-wide analytics, search trends, and geographic insights"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Analytics' }]}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                background: tab === t.value ? 'var(--surface-0)' : 'transparent',
                color: tab === t.value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === t.value ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'search' && <SearchTrendsTab />}
      {tab === 'geographic' && <GeographicTab />}
    </div>
  );
}
