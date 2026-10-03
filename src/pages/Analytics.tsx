import { useState } from 'react';
import {
  BarChart3, Search, Globe, Activity, TrendingUp, MousePointerClick,
  Users, Store, Loader2, Eye, Zap, MessageSquare, LayoutGrid, FolderOpen, FolderX, Layers,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useAnalyticsOverview, useSearchTrends, useGeographicStats, useCategoryStats } from '../hooks/useAnalytics';
import { ROUTES } from '../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList,
} from 'recharts';

const TABS = [
  { label: 'Overview', value: 'overview', icon: BarChart3 },
  { label: 'Search Trends', value: 'search', icon: Search },
  { label: 'Categories', value: 'categories', icon: LayoutGrid },
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

/**
 * What the catalogue covers: how many businesses sit in each category, and
 * which categories are still empty.
 *
 * One measure, so the bars are one hue — shading them by value would re-encode
 * the length they already show. Counts overlap because a business can be
 * listed in several categories, which the caption says out loud.
 */
function CategoriesTab() {
  const { data, isLoading } = useCategoryStats();
  const [grouping, setGrouping] = useState<'topLevel' | 'all'>('topLevel');
  const [showEmpty, setShowEmpty] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} /></div>;
  }
  if (!data) return null;

  const t = data.totals;
  const rows = grouping === 'topLevel'
    ? data.topLevel.map((c) => ({ id: c.id, name: c.name, primary: c.primary, listed: c.listed, parentName: null as string | null }))
    : data.categories.map((c) => ({ id: c.id, name: c.name, primary: c.primary, listed: c.listed, parentName: c.parentName }));
  // Ranked by the counted figure; the table can also fall back to what a
  // customer would find, so a category that is only ever a second choice is
  // still not called empty.
  const ranked = [...rows].sort((a, b) => b.primary - a.primary || b.listed - a.listed);
  const chartRows = ranked.filter((r) => r.primary > 0).slice(0, 12);
  const tableRows = showEmpty ? ranked : ranked.filter((r) => r.listed > 0);
  const widest = chartRows[0]?.primary ?? 1;

  const kpis = [
    { title: 'Categories in use', value: `${t.inUse}`, icon: <FolderOpen className="w-5 h-5" />, accent: 'var(--color-primary)' },
    { title: 'Empty categories', value: `${t.empty}`, icon: <FolderX className="w-5 h-5" />, accent: 'var(--color-warning)' },
    { title: 'Businesses listed', value: t.businessesListed.toLocaleString(), icon: <Store className="w-5 h-5" />, accent: 'var(--color-success)' },
    { title: 'In 2+ categories', value: t.multiCategory.toLocaleString(), icon: <Layers className="w-5 h-5" />, accent: '#06B6D4' },
    { title: 'Not categorised', value: `${t.uncategorised}`, icon: <Store className="w-5 h-5" />, accent: t.uncategorised > 0 ? 'var(--color-danger)' : 'var(--text-muted)' },
  ];

  const toggle = (value: 'topLevel' | 'all', label: string) => (
    <button
      key={value}
      onClick={() => setGrouping(value)}
      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
      style={{
        background: grouping === value ? 'var(--surface-0)' : 'transparent',
        color: grouping === value ? 'var(--text-primary)' : 'var(--text-muted)',
        boxShadow: grouping === value ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => <StatCard key={k.title} {...k} />)}
      </div>

      {/* Coverage, as a sentence and a meter — two numbers do not need a pie. */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t.inUse} of {t.categories} categories have a business in them
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t.topLevel} top-level · {t.subcategories} subcategories
          </p>
        </div>
        <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div style={{ width: `${(t.inUse / Math.max(1, t.categories)) * 100}%`, height: '100%', background: 'var(--chart-series-1)' }} />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {t.empty} categories are still empty — nothing shows when a customer opens them.
        </p>
      </div>

      {/* Ranked bars */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Businesses per category</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {grouping === 'topLevel'
                ? 'Top 12 top-level categories, each business counted once under its primary category and rolled into that category\u2019s family.'
                : 'Top 12 categories, each business counted once under its primary category.'}
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg shrink-0" style={{ background: 'var(--surface-1)' }}>
            {toggle('topLevel', 'Top-level')}
            {toggle('all', 'All categories')}
          </div>
        </div>

        {chartRows.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No business is listed in any category yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, chartRows.length * 34)}>
            <BarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 44, bottom: 8, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--border-light)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <YAxis
                dataKey="name" type="category" width={190} interval={0}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-1)' }}
                contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`${value} ${Number(value) === 1 ? 'business' : 'businesses'}`, '']}
              />
              <Bar dataKey="primary" fill="var(--chart-series-1)" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
                <LabelList dataKey="primary" position="right" style={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Every business is counted once, so these add up to the {t.businessesListed.toLocaleString()} listed.
          {t.multiCategory > 0 && ` ${t.multiCategory} chose more than one category; the most specific one is used.`}
        </p>
      </div>

      {/* Every category, so nothing is gated behind the top 12 */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {grouping === 'topLevel' ? 'All top-level categories' : 'All categories'}
            <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({tableRows.length})</span>
          </p>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="rounded" />
            Show empty categories
          </label>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: 'var(--surface-1)' }}>
              <tr>
                <th className="text-left font-medium px-4 py-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Category</th>
                <th className="text-right font-medium px-4 py-2 text-xs uppercase tracking-wider w-28" style={{ color: 'var(--text-muted)' }} title="Businesses counted here — each business counts once, under its primary category">Businesses</th>
                <th className="text-right font-medium px-4 py-2 text-xs uppercase tracking-wider w-32" style={{ color: 'var(--text-muted)' }} title="What a customer finds when browsing this category, including businesses whose primary category is elsewhere">Shown to customers</th>
                <th className="px-4 py-2 w-40" />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>
                    {c.name}
                    {/* A real space, not just the margin: screen readers and copy-paste
                        would otherwise read "Stitchingin Tailoring". */}
                    {c.parentName && <>{' '}<span className="text-xs" style={{ color: 'var(--text-muted)' }}>in {c.parentName}</span></>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums" style={{ color: c.primary ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {c.primary || '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums" style={{ color: c.listed ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {c.listed || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div style={{ width: `${(c.primary / Math.max(1, widest)) * 100}%`, height: '100%', background: 'var(--chart-series-1)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'geographic' && <GeographicTab />}
    </div>
  );
}
