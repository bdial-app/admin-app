import { useState, useMemo } from 'react';
import {
  MapPin, Loader2, CheckCircle, Clock, XCircle,
  Search, TrendingUp, ArrowUpDown, Smartphone, Monitor, Tablet,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useServiceableCities, useCityRequestStats, useUpdateCityStatus, useCityRequestInsights } from '../hooks/useServiceableCities';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { ServiceableCity } from '../services/serviceable-cities.service';

type CityStatus = 'active' | 'coming_soon' | 'disabled';
type SortKey = 'name' | 'status' | 'requestCount';

const STATUS_CONFIG: Record<CityStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  active: { label: 'Active', color: 'var(--color-success)', bg: 'var(--color-success-light)', icon: CheckCircle },
  coming_soon: { label: 'Coming Soon', color: 'var(--color-warning)', bg: 'var(--color-warning-light)', icon: Clock },
  disabled: { label: 'Disabled', color: 'var(--color-danger)', bg: 'var(--color-danger-light)', icon: XCircle },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ServiceableCities() {
  const { data: cities, isLoading } = useServiceableCities();
  const { data: requestStats } = useCityRequestStats();
  const { data: insights } = useCityRequestInsights();
  const updateMutation = useUpdateCityStatus();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CityStatus | ''>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [confirmAction, setConfirmAction] = useState<{ city: ServiceableCity; newStatus: CityStatus } | null>(null);

  // Merge request stats into cities
  const requestMap = useMemo(() => {
    const map = new Map<string, number>();
    requestStats?.forEach((s) => map.set(s.city.toLowerCase(), Number(s.count)));
    return map;
  }, [requestStats]);

  const enrichedCities = useMemo(() => {
    if (!cities) return [];
    return cities.map((c) => ({
      ...c,
      requestCount: requestMap.get(c.name.toLowerCase()) ?? 0,
    }));
  }, [cities, requestMap]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = enrichedCities;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'requestCount') cmp = a.requestCount - b.requestCount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [enrichedCities, search, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'requestCount' ? 'desc' : 'asc');
    }
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    try {
      await updateMutation.mutateAsync({ id: confirmAction.city.id, status: confirmAction.newStatus });
      toast.success(`${confirmAction.city.name} updated to ${STATUS_CONFIG[confirmAction.newStatus].label}`);
      setConfirmAction(null);
    } catch {
      toast.error('Failed to update city status');
    }
  };

  // Summary stats
  const activeCount = enrichedCities.filter((c) => c.status === 'active').length;
  const comingSoonCount = enrichedCities.filter((c) => c.status === 'coming_soon').length;
  const totalRequests = enrichedCities.reduce((sum, c) => sum + c.requestCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Serviceable Cities"
        description={`${enrichedCities.length} cities configured`}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Serviceable Cities' },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-success-light)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeCount}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active Cities</p>
          </div>
        </div>
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-warning-light)' }}>
            <Clock className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{comingSoonCount}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Coming Soon</p>
          </div>
        </div>
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-info-light)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-info)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalRequests}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total City Requests</p>
          </div>
        </div>
      </div>

      {/* Request Analytics */}
      {(requestStats?.length || (insights && (insights.platformStats.length > 0 || insights.deviceTypeStats.length > 0))) && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Request Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Requested Cities */}
            {requestStats && requestStats.length > 0 && (
              <div
                className="rounded-xl p-4 lg:row-span-2"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
              >
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  Top Requested Cities
                </h3>
                <div className="space-y-2.5">
                  {requestStats
                    .sort((a, b) => Number(b.count) - Number(a.count))
                    .slice(0, 10)
                    .map((stat, idx) => {
                      const maxCount = Number(requestStats[0]?.count ?? 1);
                      const pct = Math.round((Number(stat.count) / maxCount) * 100);
                      return (
                        <div key={stat.city} className="flex items-center gap-2.5">
                          <span className="text-xs font-bold w-4 text-right" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{stat.city}</span>
                              <span className="text-xs font-semibold ml-2" style={{ color: 'var(--color-info)' }}>{stat.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Platform Breakdown */}
            {insights && insights.platformStats.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
              >
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Smartphone className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  Platform Breakdown
                </h3>
                <div className="space-y-2.5">
                  {insights.platformStats.map((s) => {
                    const total = insights.platformStats.reduce((sum, p) => sum + Number(p.count), 0);
                    const pct = total > 0 ? Math.round((Number(s.count) / total) * 100) : 0;
                    const label = s.platform === 'android' ? 'Android' : s.platform === 'ios' ? 'iOS' : s.platform === 'web' ? 'Web' : 'Unknown';
                    const color = s.platform === 'android' ? '#34A853' : s.platform === 'ios' ? '#007AFF' : s.platform === 'web' ? '#FF9500' : '#999';
                    return (
                      <div key={s.platform}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                          <span className="text-xs font-semibold" style={{ color }}>{s.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Device Type Breakdown */}
            {insights && insights.deviceTypeStats.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
              >
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Monitor className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  Device Type
                </h3>
                <div className="space-y-2.5">
                  {insights.deviceTypeStats.map((s) => {
                    const total = insights.deviceTypeStats.reduce((sum, d) => sum + Number(d.count), 0);
                    const pct = total > 0 ? Math.round((Number(s.count) / total) * 100) : 0;
                    const label = s.deviceType === 'mobile' ? 'Mobile' : s.deviceType === 'tablet' ? 'Tablet' : s.deviceType === 'desktop' ? 'Desktop' : 'Unknown';
                    const Icon = s.deviceType === 'mobile' ? Smartphone : s.deviceType === 'tablet' ? Tablet : Monitor;
                    return (
                      <div key={s.deviceType}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            {label}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-info)' }}>{s.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recent Requests Log */}
          {insights && insights.recentRequests.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Recent Requests</h3>
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                        {['City', 'Platform', 'Device', 'OS', 'Date'].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insights.recentRequests.slice(0, 20).map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.city}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{
                                background: r.platform === 'android' ? '#34A85315' : r.platform === 'ios' ? '#007AFF15' : '#FF950015',
                                color: r.platform === 'android' ? '#34A853' : r.platform === 'ios' ? '#007AFF' : '#FF9500',
                              }}
                            >
                              {r.platform || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.deviceType || '—'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{r.osVersion || '—'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl"
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cities..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CityStatus | '')}
          className="px-3 py-2 text-sm rounded-lg focus-ring"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="coming_soon">Coming Soon</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {[
                  { key: 'name' as SortKey, label: 'City' },
                  { key: 'status' as SortKey, label: 'Status' },
                  { key: 'requestCount' as SortKey, label: 'Requests' },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <ArrowUpDown className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                      )}
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Radius
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Launch Date
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((city) => {
                const cfg = STATUS_CONFIG[city.status];
                const Icon = cfg.icon;
                return (
                  <tr
                    key={city.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* City */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: cfg.bg }}
                        >
                          <MapPin className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{city.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{city.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Requests */}
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: city.requestCount > 0 ? 'var(--color-info)' : 'var(--text-muted)' }}
                      >
                        {city.requestCount}
                      </span>
                    </td>

                    {/* Radius */}
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {city.radiusKm} km
                      </span>
                    </td>

                    {/* Launch Date */}
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {city.launchDate ? formatDate(city.launchDate) : '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {city.status !== 'active' && (
                          <button
                            onClick={() => setConfirmAction({ city, newStatus: 'active' })}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-success-light)',
                              color: 'var(--color-success)',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          >
                            Activate
                          </button>
                        )}
                        {city.status === 'active' && (
                          <button
                            onClick={() => setConfirmAction({ city, newStatus: 'coming_soon' })}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-warning-light)',
                              color: 'var(--color-warning)',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          >
                            Deactivate
                          </button>
                        )}
                        {city.status !== 'disabled' && (
                          <button
                            onClick={() => setConfirmAction({ city, newStatus: 'disabled' })}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                            style={{
                              background: 'var(--color-danger-light)',
                              color: 'var(--color-danger)',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          >
                            Disable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No cities found</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleStatusChange}
        title={`Change ${confirmAction?.city.name} status?`}
        description={`This will set ${confirmAction?.city.name} to "${confirmAction ? STATUS_CONFIG[confirmAction.newStatus].label : ''}". ${
          confirmAction?.newStatus === 'active' ? 'Users in this city will be able to access the app.' : ''
        }${
          confirmAction?.newStatus === 'disabled' ? 'This city will be hidden from users.' : ''
        }`}
        confirmLabel={confirmAction ? STATUS_CONFIG[confirmAction.newStatus].label : 'Confirm'}
        variant={confirmAction?.newStatus === 'disabled' ? 'danger' : confirmAction?.newStatus === 'active' ? 'default' : 'warning'}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
