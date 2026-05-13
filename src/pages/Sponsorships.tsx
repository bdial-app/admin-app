import { useState, useMemo } from 'react';
import { Megaphone, Eye, DollarSign, MousePointerClick, BarChart3, Check, X, Search, TrendingUp, Clock, Calendar, MapPin, Target, Activity, Zap, AlertTriangle, Percent } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useSponsoredListings, useSponsoredStats, useUpdateSponsored, usePendingSponsorships, useApproveSponsorship, useRejectSponsorship, useSponsorshipAnalytics } from '../hooks/useSponsored';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { SponsoredListing } from '../types';

const LIMIT = 10;

const TYPE_TABS = [
  { label: 'All', value: '' },
  { label: 'Carousel', value: 'carousel' },
  { label: 'Inline', value: 'inline' },
  { label: 'Top Result', value: 'top_result' },
];

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

const APPROVAL_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function getOperationalStatus(listing: SponsoredListing): { label: string; color: string; bg: string } {
  if (listing.approvalStatus === 'rejected') return { label: 'Rejected', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' };
  if (listing.approvalStatus === 'pending_approval') return { label: 'Pending', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' };
  const now = new Date();
  if (new Date(listing.endsAt) <= now) return { label: 'Expired', color: 'var(--text-muted)', bg: 'var(--surface-2)' };
  if (Number(listing.spentAmount) >= Number(listing.budgetAmount)) return { label: 'Budget Exhausted', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' };
  if (!listing.isActive) return { label: 'Paused', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' };
  return { label: 'Active', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)' };
}

type DetailTab = 'overview' | 'performance' | 'settings';

export default function Sponsorships() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [selected, setSelected] = useState<SponsoredListing | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [editForm, setEditForm] = useState<Partial<SponsoredListing>>({});
  const [approvalFilter, setApprovalFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');

  const { data, isLoading } = useSponsoredListings({
    page, limit: LIMIT,
    type: type || undefined,
    isActive: isActive || undefined,
  });
  const { data: stats } = useSponsoredStats();
  const { data: pendingList } = usePendingSponsorships();
  const updateMutation = useUpdateSponsored();
  const approveMutation = useApproveSponsorship();
  const rejectMutation = useRejectSponsorship();
  const { data: analyticsData } = useSponsorshipAnalytics(selected?.id ?? '', analyticsPeriod);

  const filteredItems = useMemo(() => {
    let items = data?.items ?? [];
    if (approvalFilter) items = items.filter((i) => i.approvalStatus === approvalFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.provider?.brandName?.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data?.items, approvalFilter, searchQuery]);

  const avgCtr = stats && stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) : '0';
  const budgetUtilization = stats && stats.totalBudget > 0 ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(1) : '0';

  const openDetail = (listing: SponsoredListing) => {
    setSelected(listing);
    setDetailTab('overview');
    setAnalyticsPeriod('7d');
  };

  const openEdit = (listing: SponsoredListing) => {
    setEditForm({
      isActive: listing.isActive,
      budgetAmount: listing.budgetAmount,
      costPerClick: listing.costPerClick,
      costPerImpression: listing.costPerImpression,
      startsAt: listing.startsAt,
      endsAt: listing.endsAt,
      targetCities: listing.targetCities,
    });
    setDetailTab('settings');
    setSelected(listing);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({ id: selected.id, body: editForm });
      toast.success('Sponsorship updated');
      setSelected(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const getCtr = (clicks: number, impressions: number) =>
    impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0%';

  const columns: Column<SponsoredListing>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.provider?.brandName || row.providerId.slice(0, 8)}
            </p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{row.type.replace('_', ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Budget / Spent',
      render: (row) => {
        const pct = Number(row.budgetAmount) > 0 ? (Number(row.spentAmount) / Number(row.budgetAmount)) * 100 : 0;
        return (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(row.spentAmount)} / {formatCurrency(row.budgetAmount)}
            </p>
            <div className="w-full h-1.5 mt-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'performance',
      header: 'Impressions / Clicks',
      render: (row) => (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {row.impressions.toLocaleString()} / {row.clicks.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>CTR: {getCtr(row.clicks, row.impressions)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const status = getOperationalStatus(row);
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Period',
      render: (row) => {
        const daysLeft = Math.max(0, Math.ceil((new Date(row.endsAt).getTime() - Date.now()) / 86400000));
        return (
          <div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatDate(row.startsAt)} → {formatDate(row.endsAt)}
            </span>
            {row.isActive && daysLeft > 0 && new Date(row.endsAt) > new Date() && (
              <p className="text-[10px] font-medium mt-0.5" style={{ color: daysLeft <= 3 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {daysLeft}d remaining
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.approvalStatus === 'pending_approval' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'approve' }); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-success)' }} title="Approve"><Check className="w-4 h-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'reject' }); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-danger)' }} title="Reject"><X className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); openDetail(row); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="View"><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Edit"><BarChart3 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sponsored Listings"
        description="Manage provider-paid promotional placements & analytics"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Sponsorships' }]}
      />

      {/* Enhanced Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <StatCard title="Total Listings" value={stats.total} icon={<Megaphone className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Active" value={stats.active} icon={<Activity className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Pending" value={pendingList?.length ?? 0} icon={<Clock className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Revenue" value={formatCurrency(stats.totalSpent)} icon={<DollarSign className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Avg CTR" value={`${avgCtr}%`} icon={<TrendingUp className="w-5 h-5" />} accent="var(--color-info)" />
          <StatCard title="Budget Used" value={`${budgetUtilization}%`} icon={<Percent className="w-5 h-5" />} accent={Number(budgetUtilization) > 80 ? 'var(--color-danger)' : 'var(--color-primary)'} />
        </div>
      )}

      {/* Search + Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="relative flex-shrink-0" style={{ minWidth: '220px' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2"
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {TYPE_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setType(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
              background: type === tab.value ? 'var(--surface-0)' : 'transparent',
              color: type === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: type === tab.value ? 'var(--shadow-sm)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setIsActive(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
              background: isActive === tab.value ? 'var(--surface-0)' : 'transparent',
              color: isActive === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isActive === tab.value ? 'var(--shadow-sm)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {APPROVAL_TABS.map((tab) => (
            <button key={tab.value} onClick={() => { setApprovalFilter(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
              background: approvalFilter === tab.value ? 'var(--surface-0)' : 'transparent',
              color: approvalFilter === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: approvalFilter === tab.value ? 'var(--shadow-sm)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable<SponsoredListing>
        columns={columns}
        data={filteredItems}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => openDetail(r)}
      />

      {/* ═══ DETAIL PANEL (Tabbed) ═══ */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Sponsorship Details"
        subtitle={selected?.provider?.brandName || undefined}
        width="560px"
        actions={
          detailTab === 'settings' ? (
            <button onClick={handleUpdate} disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          ) : (
            <button onClick={() => selected && openEdit(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Edit</button>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              {([['overview', 'Overview'], ['performance', 'Performance'], ['settings', 'Settings']] as [DetailTab, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setDetailTab(key)} className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
                  background: detailTab === key ? 'var(--surface-0)' : 'transparent',
                  color: detailTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: detailTab === key ? 'var(--shadow-sm)' : 'none',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ─── Overview Tab ─── */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                {/* Status + Provider */}
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selected.provider?.brandName || 'Provider'}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{selected.type.replace('_', ' ')} placement</p>
                    </div>
                  </div>
                  {(() => {
                    const status = getOperationalStatus(selected);
                    return <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ background: status.bg, color: status.color }}>{status.label}</span>;
                  })()}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Impressions', value: selected.impressions.toLocaleString(), icon: Eye },
                    { label: 'Clicks', value: selected.clicks.toLocaleString(), icon: MousePointerClick },
                    { label: 'CTR', value: getCtr(selected.clicks, selected.impressions), icon: TrendingUp },
                    { label: 'CPC (actual)', value: selected.clicks > 0 ? formatCurrency(Number(selected.spentAmount) / selected.clicks) : '—', icon: DollarSign },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Budget Bar */}
                <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Budget</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(selected.spentAmount)} / {formatCurrency(selected.budgetAmount)}
                    </span>
                  </div>
                  {(() => {
                    const pct = Number(selected.budgetAmount) > 0 ? (Number(selected.spentAmount) / Number(selected.budgetAmount)) * 100 : 0;
                    return (
                      <>
                        <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'var(--color-danger)' : pct > 60 ? 'var(--color-warning)' : 'var(--color-primary)' }} />
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}% utilized · ₹{(Number(selected.budgetAmount) - Number(selected.spentAmount)).toLocaleString('en-IN')} remaining</p>
                      </>
                    );
                  })()}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['CPC Config', formatCurrency(selected.costPerClick)],
                    ['CPI Config', `₹${Number(selected.costPerImpression).toFixed(4)}`],
                    ['Starts', formatDate(selected.startsAt)],
                    ['Ends', formatDate(selected.endsAt)],
                    ['Created', formatDate(selected.createdAt)],
                    ['Approval', selected.approvalStatus === 'pending_approval' ? 'Pending' : selected.approvalStatus],
                  ].map(([label, value]) => (
                    <div key={label} className="p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-sm font-medium capitalize mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Targeting */}
                {(selected.targetCities?.length || selected.targetCategoryIds?.length) ? (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Targeting</span>
                    </div>
                    {selected.targetCities && selected.targetCities.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Cities</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.targetCities.map((city) => (
                            <span key={city} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                              <MapPin className="w-3 h-3" />{city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.targetRadius && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Radius: {selected.targetRadius} km</p>
                    )}
                  </div>
                ) : null}

                {/* Admin Notes */}
                {selected.adminNotes && (
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--color-warning-light)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-warning-dark)' }}>Admin Notes</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.adminNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Performance Tab ─── */}
            {detailTab === 'performance' && (
              <div className="space-y-4">
                {/* Period selector */}
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  {['7d', '14d', '30d'].map((p) => (
                    <button key={p} onClick={() => setAnalyticsPeriod(p)} className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
                      background: analyticsPeriod === p ? 'var(--surface-0)' : 'transparent',
                      color: analyticsPeriod === p ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: analyticsPeriod === p ? 'var(--shadow-sm)' : 'none',
                    }}>
                      {p}
                    </button>
                  ))}
                </div>

                {/* Analytics KPIs */}
                {analyticsData && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{analyticsData.totals.avgDailyImpressions}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Daily Imp.</p>
                    </div>
                    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{analyticsData.totals.avgDailyClicks}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Daily Clicks</p>
                    </div>
                    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-xs font-bold" style={{ color: analyticsData.projectedDaysLeft && analyticsData.projectedDaysLeft <= 5 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {analyticsData.projectedDaysLeft ? `${analyticsData.projectedDaysLeft}d` : '∞'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Projected Exhaust</p>
                    </div>
                  </div>
                )}

                {/* Impressions & Clicks Chart */}
                {analyticsData && analyticsData.daily.length > 0 ? (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Impressions & Clicks</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={analyticsData.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="impressionsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="impressions" stroke="#6366f1" fill="url(#impressionsFill)" strokeWidth={2} />
                        <Area type="monotone" dataKey="clicks" stroke="#10b981" fill="url(#clicksFill)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 rounded-full bg-indigo-500" />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Impressions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Clicks</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl text-center" style={{ background: 'var(--surface-1)' }}>
                    <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No analytics data available for this period</p>
                  </div>
                )}

                {/* Spend Burn Chart */}
                {analyticsData && analyticsData.daily.length > 0 && (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Daily Spend (₹)</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={analyticsData.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit' })} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip formatter={(v: number) => [`₹${v.toFixed(2)}`, 'Spend']} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ─── Settings Tab (Edit) ─── */}
            {detailTab === 'settings' && (
              <div className="space-y-4">
                <FormField label="Budget Amount (₹)">
                  <input type="number" value={editForm.budgetAmount ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, budgetAmount: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Cost Per Click (₹)">
                    <input type="number" step="0.01" value={editForm.costPerClick ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, costPerClick: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </FormField>
                  <FormField label="Cost Per Impression (₹)">
                    <input type="number" step="0.0001" value={editForm.costPerImpression ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, costPerImpression: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Start Date">
                    <input type="date" value={editForm.startsAt ? new Date(editForm.startsAt).toISOString().split('T')[0] : ''} onChange={(e) => setEditForm(prev => ({ ...prev, startsAt: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </FormField>
                  <FormField label="End Date">
                    <input type="date" value={editForm.endsAt ? new Date(editForm.endsAt).toISOString().split('T')[0] : ''} onChange={(e) => setEditForm(prev => ({ ...prev, endsAt: new Date(e.target.value).toISOString() }))} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  </FormField>
                </div>
                <FormField label="Target Cities (comma-separated)">
                  <input
                    type="text"
                    value={editForm.targetCities?.join(', ') ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, targetCities: e.target.value.split(',').map(c => c.trim()).filter(Boolean) }))}
                    placeholder="Mumbai, Delhi, Bangalore"
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  />
                </FormField>
                <FormField label="Active">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.isActive ?? true} onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Listing is active and serving</span>
                  </label>
                </FormField>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Approve/Reject Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setRejectNotes(''); }}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.action === 'approve') {
            await approveMutation.mutateAsync({ id: confirmAction.id });
          } else {
            await rejectMutation.mutateAsync({ id: confirmAction.id, notes: rejectNotes });
          }
          setConfirmAction(null);
          setRejectNotes('');
        }}
        title={confirmAction?.action === 'approve' ? 'Approve Sponsorship' : 'Reject Sponsorship'}
        description={confirmAction?.action === 'approve' ? 'This sponsorship will become visible to users.' : 'Please provide a reason for rejection.'}
        confirmLabel={confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.action === 'approve' ? 'default' : 'danger'}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      >
        {confirmAction?.action === 'reject' && (
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
            className="w-full mt-3 px-3 py-2 text-sm rounded-lg border resize-none"
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
