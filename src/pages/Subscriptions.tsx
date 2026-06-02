import { useState } from 'react';
import {
  Crown, Plus, Pencil, ToggleLeft, ToggleRight, X, Zap, Users, Target, Sparkles,
  Search, Filter, Calendar, Eye, Copy, Clock, CheckCircle2, XCircle,
  PauseCircle, AlertTriangle, CreditCard, Infinity,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import {
  useSubscriptions, useSubscriptionPlans, useSubscriptionStats,
  useCreatePlan, useUpdatePlan,
} from '../hooks/useSubscriptions';
import type { Subscription, SubscriptionPlan } from '../services/subscriptions.service';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';

const LIMIT = 25;

const STATUS_OPTIONS = [
  { value: '', label: 'All', icon: null },
  { value: 'active', label: 'Active', icon: CheckCircle2 },
  { value: 'trialing', label: 'Trial', icon: Clock },
  { value: 'past_due', label: 'Past Due', icon: AlertTriangle },
  { value: 'paused', label: 'Paused', icon: PauseCircle },
  { value: 'canceled', label: 'Canceled', icon: XCircle },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: { color: 'var(--color-success)', bg: 'var(--color-success-light)', icon: CheckCircle2 },
  trialing: { color: 'var(--color-info)', bg: 'var(--color-info-light)', icon: Clock },
  past_due: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)', icon: AlertTriangle },
  paused: { color: '#d97706', bg: '#fef3c7', icon: PauseCircle },
  canceled: { color: 'var(--color-danger)', bg: 'var(--color-danger-light)', icon: XCircle },
};

const BILLING_OPTIONS = [
  { value: '', label: 'All Billing' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const SPONSORSHIP_OPTIONS = ['inline', 'carousel', 'top_result'];

const EMPTY_PLAN = {
  name: '', slug: '', priceMonthly: 0, priceYearly: 0,
  maxActiveDeals: 3, maxTotalDeals: 5, monthlyLeadUnlocks: 0,
  sponsorshipTypes: [] as string[], sortOrder: 0,
  razorpayPlanIdMonthly: '', razorpayPlanIdYearly: '',
  appleProductIdMonthly: '', appleProductIdYearly: '',
};

const TIER_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
];

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

const daysUntil = (iso: string | null) => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
};

export default function Subscriptions() {
  // ─── State ─────────────────────────────
  const [tab, setTab] = useState<'subscriptions' | 'plans'>('subscriptions');

  // Subscription list state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billingFilter, setBillingFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Subscription | null>(null);

  // Plan form state
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  // ─── Queries ───────────────────────────
  const { data, isLoading } = useSubscriptions({
    page,
    limit: LIMIT,
    status: statusFilter || undefined,
    search: search || undefined,
    planId: planFilter || undefined,
    billingInterval: billingFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: stats } = useSubscriptionStats();
  const { data: plans } = useSubscriptionPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const activeFilterCount = [billingFilter, planFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setBillingFilter('');
    setPlanFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // ─── Plan Actions ──────────────────────
  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
    setShowPlanForm(true);
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: Number(plan.priceYearly),
      maxActiveDeals: plan.maxActiveDeals,
      maxTotalDeals: plan.maxTotalDeals,
      monthlyLeadUnlocks: plan.monthlyLeadUnlocks,
      sponsorshipTypes: plan.sponsorshipTypes ?? [],
      sortOrder: plan.sortOrder,
      razorpayPlanIdMonthly: plan.razorpayPlanIdMonthly || '',
      razorpayPlanIdYearly: plan.razorpayPlanIdYearly || '',
      appleProductIdMonthly: plan.appleProductIdMonthly || '',
      appleProductIdYearly: plan.appleProductIdYearly || '',
    });
    setShowPlanForm(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.slug) { toast.error('Name and slug are required'); return; }
    try {
      const body: Record<string, unknown> = {
        ...planForm,
        razorpayPlanIdMonthly: planForm.razorpayPlanIdMonthly || null,
        razorpayPlanIdYearly: planForm.razorpayPlanIdYearly || null,
        appleProductIdMonthly: planForm.appleProductIdMonthly || null,
        appleProductIdYearly: planForm.appleProductIdYearly || null,
      };
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, body });
        toast.success('Plan updated');
      } else {
        await createPlan.mutateAsync({ ...body, isActive: true } as any);
        toast.success('Plan created');
      }
      setShowPlanForm(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleTogglePlan = async (plan: SubscriptionPlan) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, body: { isActive: !plan.isActive } });
      toast.success(plan.isActive ? 'Plan deactivated' : 'Plan activated');
    } catch { toast.error('Failed to update plan'); }
  };

  // ─── Table Columns ─────────────────────
  const columns: Column<Subscription>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (s) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {s.provider?.brandName || '\u2014'}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
            {s.providerId?.slice(0, 8)}…
          </p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (s) => (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md"
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          <Crown className="w-3 h-3" />
          {s.plan?.name ?? '\u2014'}
        </span>
      ),
    },
    {
      key: 'billingInterval',
      header: 'Billing',
      render: (s) => (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded capitalize"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          {s.billingInterval === 'yearly' ? '\uD83D\uDCC5' : '\uD83D\uDDD3\uFE0F'} {s.billingInterval}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.canceled;
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
            <span
              className="px-2 py-0.5 text-[11px] font-semibold rounded capitalize"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {s.status?.replace('_', ' ')}
            </span>
            {s.cancelAtPeriodEnd && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">CANCELING</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'renewal',
      header: 'Renewal',
      render: (s) => {
        const remaining = daysUntil(s.currentPeriodEnd);
        return (
          <div>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : '\u2014'}
            </p>
            {remaining && (
              <p className="text-[10px] font-medium" style={{
                color: remaining.includes('overdue') ? 'var(--color-danger)' :
                  remaining === 'Today' || remaining === 'Tomorrow' ? 'var(--color-warning)' : 'var(--text-muted)',
              }}>
                {remaining}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: (s) => (
        <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
          {s.paymentGateway === 'apple' ? '\uD83C\uDF4E Apple' : '\uD83D\uDCB3 Razorpay'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Started',
      sortable: true,
      render: (s) => (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(s.createdAt)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(s.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (s) => (
        <button
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelected(s); }}
          title="Details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  // ─── Render ────────────────────────────
  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Provider subscriptions & plan management"
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Subscriptions' },
        ]}
      />

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            title="Total Subscriptions"
            value={stats.total}
            icon={<CreditCard className="w-5 h-5" />}
            accent="var(--color-primary)"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle2 className="w-5 h-5" />}
            accent="var(--color-success)"
          />
          <StatCard
            title="Trialing"
            value={stats.trialing}
            icon={<Clock className="w-5 h-5" />}
            accent="var(--color-info)"
          />
          <StatCard
            title="Past Due"
            value={stats.pastDue}
            icon={<AlertTriangle className="w-5 h-5" />}
            accent="var(--color-warning)"
          />
          <StatCard
            title="Canceling"
            value={stats.cancelingCount}
            icon={<XCircle className="w-5 h-5" />}
            accent="var(--color-danger)"
          />
        </div>
      )}

      {/* Billing Interval Breakdown */}
      {stats?.byInterval && stats.byInterval.length > 0 && (
        <div className="flex gap-3 mb-6">
          {stats.byInterval.map((b) => (
            <div
              key={b.interval}
              className="flex-1 p-3 rounded-xl text-center"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-lg">{b.interval === 'yearly' ? '\uD83D\uDCC5' : '\uD83D\uDDD3\uFE0F'}</p>
              <p className="text-xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>
                {Number(b.count).toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider capitalize" style={{ color: 'var(--text-muted)' }}>
                {b.interval} active
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ background: 'var(--surface-1)' }}>
        <button
          onClick={() => setTab('subscriptions')}
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2"
          style={{
            background: tab === 'subscriptions' ? 'var(--surface-0)' : 'transparent',
            color: tab === 'subscriptions' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: tab === 'subscriptions' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Users className="w-4 h-4" /> Subscriptions {stats ? `(${stats.total})` : ''}
        </button>
        <button
          onClick={() => setTab('plans')}
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2"
          style={{
            background: tab === 'plans' ? 'var(--surface-0)' : 'transparent',
            color: tab === 'plans' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: tab === 'plans' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Crown className="w-4 h-4" /> Manage Plans ({plans?.length ?? 0})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SUBSCRIPTIONS TAB                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'subscriptions' && (
        <>
          {/* Search + Quick Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by provider name or subscription ID…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-2)]">
                    <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                    style={{
                      background: statusFilter === opt.value ? 'var(--surface-0)' : 'transparent',
                      color: statusFilter === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: statusFilter === opt.value ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {opt.icon && <opt.icon className="w-3 h-3" />}
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                style={{
                  background: showFilters || activeFilterCount > 0 ? 'var(--color-primary-light)' : 'var(--surface-1)',
                  color: showFilters || activeFilterCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--color-primary)' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div
                className="flex flex-wrap items-center gap-3 p-3 rounded-lg"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
              >
                <select
                  value={billingFilter}
                  onChange={(e) => { setBillingFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 text-sm rounded-lg focus-ring"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {BILLING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 text-sm rounded-lg focus-ring"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  <option value="">All Plans</option>
                  {(plans ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                    style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                    style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Subscriptions Table */}
          <DataTable<Subscription>
            columns={columns}
            data={data?.items ?? []}
            meta={data?.meta}
            isLoading={isLoading}
            onPageChange={setPage}
            rowKey={(s) => s.id}
            onRowClick={setSelected}
            emptyIcon={<CreditCard className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
            emptyTitle="No subscriptions found"
            emptyDescription={search || statusFilter || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'No provider subscriptions yet'}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* PLANS TAB                                          */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'plans' && (
        <div className="space-y-5">
          {/* Header + Create */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {plans?.filter((p) => p.isActive).length ?? 0} active &middot; {plans?.filter((p) => !p.isActive).length ?? 0} inactive
              </p>
            </div>
            <button
              onClick={openCreatePlan}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              <Plus className="w-4 h-4" /> Create Plan
            </button>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {(plans ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((plan, idx) => {
              const gradientClass = TIER_GRADIENTS[idx % TIER_GRADIENTS.length];
              const activeSubs = stats?.byPlan?.filter((bp) => bp.planId === plan.id && bp.status === 'active')
                .reduce((acc, bp) => acc + Number(bp.count), 0) ?? 0;

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl overflow-hidden transition-all hover:shadow-lg group"
                  style={{
                    background: 'var(--surface-0)',
                    border: plan.isActive ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                    opacity: plan.isActive ? 1 : 0.75,
                  }}
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-br ${gradientClass} p-5 pb-4 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-white">{plan.name}</h4>
                        <p className="text-xs text-white/60 font-mono mt-0.5">{plan.slug}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditPlan(plan)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} className="text-white" />
                        </button>
                        <button
                          onClick={() => handleTogglePlan(plan)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                          title={plan.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {plan.isActive ? <ToggleRight size={16} className="text-white" /> : <ToggleLeft size={16} className="text-white/60" />}
                        </button>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-3xl font-extrabold text-white">{formatCurrency(plan.priceMonthly)}</span>
                      <span className="text-sm text-white/70">/mo</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      {formatCurrency(plan.priceYearly)}/yr
                      {Number(plan.priceMonthly) > 0 && Number(plan.priceYearly) > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-white/20 text-white/90 text-[10px] font-bold">
                          Save {Math.round((1 - Number(plan.priceYearly) / (Number(plan.priceMonthly) * 12)) * 100)}%
                        </span>
                      )}
                    </p>

                    {/* Active subscribers badge */}
                    {activeSubs > 0 && (
                      <div className="absolute bottom-3 right-4 px-2 py-1 rounded-lg bg-white/20 text-[10px] font-bold text-white flex items-center gap-1">
                        <Users size={10} /> {activeSubs} active
                      </div>
                    )}

                    {!plan.isActive && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/30 text-white/80 uppercase">
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Feature Limits */}
                  <div className="p-5 space-y-2.5">
                    <FeatureRow icon={<Target size={14} className="text-blue-600" />} iconBg="bg-blue-100" label="Active Deals" value={plan.maxActiveDeals} />
                    <FeatureRow icon={<Zap size={14} className="text-emerald-600" />} iconBg="bg-emerald-100" label="Total Deals" value={plan.maxTotalDeals} />
                    <FeatureRow icon={<Users size={14} className="text-violet-600" />} iconBg="bg-violet-100" label="Leads / month" value={plan.monthlyLeadUnlocks} />
                    {plan.sponsorshipTypes && plan.sponsorshipTypes.length > 0 && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Sparkles size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Sponsorship</p>
                          <p className="text-xs font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                            {plan.sponsorshipTypes.join(', ').replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gateway IDs \u2014 monthly & yearly per gateway */}
                  {(plan.razorpayPlanIdMonthly || plan.razorpayPlanIdYearly || plan.appleProductIdMonthly || plan.appleProductIdYearly) && (
                    <div className="px-5 pb-3">
                      <div className="p-2.5 rounded-lg space-y-1" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Gateway Product IDs</p>
                        {plan.razorpayPlanIdMonthly && (
                          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                            {'\uD83D\uDCB3'} M: {plan.razorpayPlanIdMonthly}
                          </p>
                        )}
                        {plan.razorpayPlanIdYearly && (
                          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                            {'\uD83D\uDCB3'} Y: {plan.razorpayPlanIdYearly}
                          </p>
                        )}
                        {plan.appleProductIdMonthly && (
                          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                            {'\uD83C\uDF4E'} M: {plan.appleProductIdMonthly}
                          </p>
                        )}
                        {plan.appleProductIdYearly && (
                          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                            {'\uD83C\uDF4E'} Y: {plan.appleProductIdYearly}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    className="px-5 py-2.5 text-xs flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)' }}
                  >
                    <span>Order: {plan.sortOrder}</span>
                    {plan.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium">Disabled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SUBSCRIPTION DETAIL PANEL                          */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Subscription Details"
        subtitle={selected ? `${selected.plan?.name ?? 'Unknown Plan'} \u2022 ${selected.billingInterval}` : undefined}
        width="lg"
      >
        {selected && (
          <div className="space-y-6">
            {/* Status Banner */}
            {(() => {
              const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.canceled;
              const Icon = cfg.icon;
              return (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: cfg.color }} />
                  <div>
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                      {selected.status?.replace('_', ' ')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Since {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  {selected.cancelAtPeriodEnd && (
                    <span className="ml-auto px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700">
                      Will cancel at period end
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Plan Card */}
            <div
              className="p-4 rounded-xl flex items-center gap-4"
              style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)20' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{selected.plan?.name ?? '\u2014'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(selected.billingInterval === 'yearly' ? selected.plan?.priceYearly : selected.plan?.priceMonthly)}/{selected.billingInterval === 'yearly' ? 'yr' : 'mo'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>
                  {selected.billingInterval}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {selected.paymentGateway === 'apple' ? '\uD83C\uDF4E Apple' : '\uD83D\uDCB3 Razorpay'}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="Provider" value={selected.provider?.brandName || '\u2014'} />
              <DetailCell label="Billing Interval" value={selected.billingInterval} capitalize />
              <DetailCell label="Period Start" value={selected.currentPeriodStart ? formatDate(selected.currentPeriodStart) : '\u2014'} />
              <DetailCell label="Period End" value={selected.currentPeriodEnd ? formatDate(selected.currentPeriodEnd) : '\u2014'} />
              <DetailCell label="Lead Unlocks Used" value={`${selected.leadUnlocksUsed ?? 0} / ${selected.plan?.monthlyLeadUnlocks === -1 ? '\u221E' : selected.plan?.monthlyLeadUnlocks ?? '\u2014'}`} />
              <DetailCell label="Reset At" value={selected.leadUnlocksResetAt ? formatDate(selected.leadUnlocksResetAt) : '\u2014'} />
            </div>

            {/* IDs */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Identifiers</p>
              {[
                { label: 'Subscription ID', value: selected.id },
                { label: 'Provider ID', value: selected.providerId },
                { label: 'Plan ID', value: selected.planId },
                { label: 'Gateway Subscription', value: selected.gatewaySubscriptionId },
                { label: 'Gateway Customer', value: selected.gatewayCustomerId },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                      {row.value || '\u2014'}
                    </p>
                  </div>
                  {row.value && (
                    <button
                      onClick={() => copyToClipboard(row.value!)}
                      className="p-1.5 rounded-md flex-shrink-0 transition-colors hover:bg-[var(--surface-2)]"
                      style={{ color: 'var(--text-muted)' }}
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Timestamps */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Timeline</p>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>Created: {formatDate(selected.createdAt)}</span>
                {selected.updatedAt && <span>Updated: {formatDate(selected.updatedAt)}</span>}
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PLAN CREATE / EDIT MODAL                           */}
      {/* ═══════════════════════════════════════════════════ */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--surface-0)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-500 to-violet-600">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingPlan ? 'Edit Plan' : 'Create Plan'}
                </h3>
                <p className="text-xs text-white/60">Configure pricing, limits, and gateway IDs</p>
              </div>
              <button onClick={() => setShowPlanForm(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Identity */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Plan Name" required>
                    <input
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="e.g. Business Pro"
                      className="input w-full"
                    />
                  </FormField>
                  <FormField label="Slug" required>
                    <input
                      value={planForm.slug}
                      onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="e.g. business-pro"
                      className="input w-full font-mono"
                      disabled={!!editingPlan}
                    />
                  </FormField>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Pricing */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pricing</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Monthly Price (₹)" required>
                    <div className="relative">
                      <input
                        type="number"
                        value={planForm.priceMonthly || ''}
                        onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                        className="input w-full pl-6"
                        min={0}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>₹</span>
                    </div>
                  </FormField>
                  <FormField label="Yearly Price (₹)" required>
                    <div className="relative">
                      <input
                        type="number"
                        value={planForm.priceYearly || ''}
                        onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                        className="input w-full pl-6"
                        min={0}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>₹</span>
                    </div>
                  </FormField>
                </div>
                {planForm.priceMonthly > 0 && planForm.priceYearly > 0 && (
                  <p className="text-xs px-2.5 py-1 rounded-lg inline-block" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                    Yearly saves {Math.round((1 - planForm.priceYearly / (planForm.priceMonthly * 12)) * 100)}% (₹{((planForm.priceMonthly * 12) - planForm.priceYearly).toLocaleString()} off)
                  </p>
                )}
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Feature Limits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Feature Limits</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Use -1 for unlimited</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Active Deals">
                    <input
                      type="number"
                      value={planForm.maxActiveDeals}
                      onChange={(e) => setPlanForm({ ...planForm, maxActiveDeals: Number(e.target.value) })}
                      className="input w-full text-center"
                      min={-1}
                    />
                  </FormField>
                  <FormField label="Total Deals">
                    <input
                      type="number"
                      value={planForm.maxTotalDeals}
                      onChange={(e) => setPlanForm({ ...planForm, maxTotalDeals: Number(e.target.value) })}
                      className="input w-full text-center"
                      min={-1}
                    />
                  </FormField>
                  <FormField label="Leads / month">
                    <input
                      type="number"
                      value={planForm.monthlyLeadUnlocks}
                      onChange={(e) => setPlanForm({ ...planForm, monthlyLeadUnlocks: Number(e.target.value) })}
                      className="input w-full text-center"
                      min={-1}
                    />
                  </FormField>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Sponsorship Types */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sponsorship Access</p>
                <div className="flex flex-wrap gap-2">
                  {SPONSORSHIP_OPTIONS.map((t) => {
                    const isSelected = planForm.sponsorshipTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPlanForm({
                          ...planForm,
                          sponsorshipTypes: isSelected
                            ? planForm.sponsorshipTypes.filter((x) => x !== t)
                            : [...planForm.sponsorshipTypes, t],
                        })}
                        className="px-3.5 py-2 rounded-lg text-xs font-medium transition-all capitalize"
                        style={{
                          background: isSelected ? 'var(--color-primary-light)' : 'var(--surface-2)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                          border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-default)'}`,
                        }}
                      >
                        {t.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Gateway IDs */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Gateway Integration IDs</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Razorpay Monthly Plan ID">
                    <input
                      value={planForm.razorpayPlanIdMonthly}
                      onChange={(e) => setPlanForm({ ...planForm, razorpayPlanIdMonthly: e.target.value })}
                      placeholder="plan_xxxxx"
                      className="input w-full font-mono text-xs"
                    />
                  </FormField>
                  <FormField label="Razorpay Yearly Plan ID">
                    <input
                      value={planForm.razorpayPlanIdYearly}
                      onChange={(e) => setPlanForm({ ...planForm, razorpayPlanIdYearly: e.target.value })}
                      placeholder="plan_xxxxx"
                      className="input w-full font-mono text-xs"
                    />
                  </FormField>
                  <FormField label="Apple Monthly Product ID">
                    <input
                      value={planForm.appleProductIdMonthly}
                      onChange={(e) => setPlanForm({ ...planForm, appleProductIdMonthly: e.target.value })}
                      placeholder="com.app.plan.monthly"
                      className="input w-full font-mono text-xs"
                    />
                  </FormField>
                  <FormField label="Apple Yearly Product ID">
                    <input
                      value={planForm.appleProductIdYearly}
                      onChange={(e) => setPlanForm({ ...planForm, appleProductIdYearly: e.target.value })}
                      placeholder="com.app.plan.yearly"
                      className="input w-full font-mono text-xs"
                    />
                  </FormField>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Sort Order */}
              <div className="flex items-center gap-4">
                <FormField label="Sort Order">
                  <input
                    type="number"
                    value={planForm.sortOrder}
                    onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })}
                    className="input w-24 text-center"
                    min={0}
                  />
                </FormField>
                <p className="text-[10px] mt-5" style={{ color: 'var(--text-muted)' }}>
                  Lower values appear first in the customer-facing plan picker
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
              <button
                onClick={() => setShowPlanForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={createPlan.isPending || updatePlan.isPending}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
              >
                {(createPlan.isPending || updatePlan.isPending) ? 'Saving…' : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ─────────────────
function FeatureRow({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {value === -1 ? (
            <span className="inline-flex items-center gap-1">
              <Infinity className="w-4 h-4" /> Unlimited
            </span>
          ) : value}
        </p>
      </div>
    </div>
  );
}

function DetailCell({ label, value, capitalize }: { label: string; value: string | number; capitalize?: boolean }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className={`text-sm font-semibold ${capitalize ? 'capitalize' : ''}`} style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}
