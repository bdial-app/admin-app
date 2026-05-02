import { useState } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, Crown, X, Zap, Users, Target, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { useSubscriptions, useSubscriptionPlans, useCreatePlan, useUpdatePlan } from '../hooks/useSubscriptions';
import type { Subscription, SubscriptionPlan } from '../services/subscriptions.service';
import { toast } from 'react-toastify';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-gray-100 text-gray-500',
  trialing: 'bg-blue-100 text-blue-700',
  paused: 'bg-orange-100 text-orange-700',
};

const EMPTY_PLAN = {
  name: '', slug: '', priceMonthly: 0, priceYearly: 0,
  maxActiveDeals: 3, maxTotalDeals: 5, monthlyLeadUnlocks: 0,
  sponsorshipTypes: [] as string[], sortOrder: 0,
};

const SPONSORSHIP_OPTIONS = ['inline', 'carousel', 'top_result'];

export default function Subscriptions() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'subscriptions' | 'plans'>('subscriptions');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  const { data, isLoading } = useSubscriptions({ page, limit: 20, status: statusFilter || undefined });
  const { data: plans } = useSubscriptionPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const items = data?.items ?? [];
  const activeSubs = items.filter((s: Subscription) => s.status === 'active').length;

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
    });
    setShowPlanForm(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.slug) { toast.error('Name and slug are required'); return; }
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, body: planForm });
        toast.success('Plan updated');
      } else {
        await createPlan.mutateAsync({ ...planForm, isActive: true });
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

  const columns: Column<Subscription>[] = [
    { key: 'provider', header: 'Provider', render: (s) => s.provider?.brandName ?? s.providerId?.slice(0, 8) },
    { key: 'plan', header: 'Plan', render: (s) => (
      <span className="inline-flex items-center gap-1">
        <Crown size={12} className="text-amber-500" /> {s.plan?.name ?? '—'}
      </span>
    )},
    { key: 'billingInterval', header: 'Billing', render: (s) => <span className="capitalize">{s.billingInterval}</span> },
    {
      key: 'status', header: 'Status', render: (s) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {s.status?.replace('_', ' ')}
        </span>
      ),
    },
    { key: 'currentPeriodEnd', header: 'Renews', render: (s) => s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—' },
    { key: 'cancelAtPeriodEnd', header: 'Canceling?', render: (s) => s.cancelAtPeriodEnd ? <span className="text-red-500 font-medium text-xs">Yes</span> : '—' },
    { key: 'createdAt', header: 'Started', render: (s) => new Date(s.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Provider subscriptions and plan management" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Subscriptions" value={data?.meta?.total ?? 0} />
        <StatCard title="Active" value={activeSubs} accent="var(--color-success)" />
        <StatCard title="Plans Available" value={plans?.length ?? 0} />
        <StatCard title="Canceling" value={items.filter((s: Subscription) => s.cancelAtPeriodEnd).length} accent="var(--color-warning)" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
        <button onClick={() => setTab('subscriptions')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'subscriptions' ? 'shadow-sm' : ''}`}
          style={{ background: tab === 'subscriptions' ? 'var(--surface-0)' : 'transparent', color: tab === 'subscriptions' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          Active Subscriptions
        </button>
        <button onClick={() => setTab('plans')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'plans' ? 'shadow-sm' : ''}`}
          style={{ background: tab === 'plans' ? 'var(--surface-0)' : 'transparent', color: tab === 'plans' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          Manage Plans
        </button>
      </div>

      {/* Subscriptions Tab */}
      {tab === 'subscriptions' && (
        <>
          <div className="flex gap-3">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input px-3 py-1.5 text-sm rounded">
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <DataTable columns={columns} data={items} isLoading={isLoading}
            rowKey={(s) => s.id} meta={data?.meta} onPageChange={setPage} />
        </>
      )}

      {/* Plans Tab */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreatePlan} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
              <Plus size={16} /> Create Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {(plans ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((plan, idx) => {
              const tierColors = ['from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-amber-500 to-orange-600'];
              const gradientClass = tierColors[idx % tierColors.length];
              return (
                <div key={plan.id} className="rounded-2xl border overflow-hidden transition-all hover:shadow-lg group"
                  style={{ background: 'var(--surface-0)', borderColor: plan.isActive ? 'var(--color-primary)' : 'var(--border-light)', borderWidth: plan.isActive ? 2 : 1 }}>
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-br ${gradientClass} p-5 pb-4 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-white">{plan.name}</h4>
                        <p className="text-xs text-white/60 font-mono mt-0.5">{plan.slug}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditPlan(plan)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors" title="Edit">
                          <Pencil size={14} className="text-white" />
                        </button>
                        <button onClick={() => handleTogglePlan(plan)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors" title="Toggle">
                          {plan.isActive ? <ToggleRight size={16} className="text-white" /> : <ToggleLeft size={16} className="text-white/60" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-3xl font-extrabold text-white">₹{Number(plan.priceMonthly).toLocaleString()}</span>
                      <span className="text-sm text-white/70">/mo</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">₹{Number(plan.priceYearly).toLocaleString()}/yr</p>
                    {!plan.isActive && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/20 text-white/70 uppercase">Inactive</span>
                    )}
                  </div>

                  {/* Features list */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Target size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active Deals</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{plan.maxActiveDeals === -1 ? 'Unlimited' : plan.maxActiveDeals}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Zap size={14} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Deals</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{plan.maxTotalDeals === -1 ? 'Unlimited' : plan.maxTotalDeals}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lead Unlocks / mo</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{plan.monthlyLeadUnlocks === -1 ? 'Unlimited' : plan.monthlyLeadUnlocks}</p>
                      </div>
                    </div>
                    {plan.sponsorshipTypes && plan.sponsorshipTypes.length > 0 && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Sparkles size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sponsorship Types</p>
                          <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{plan.sponsorshipTypes.join(', ').replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-2.5 text-xs flex items-center justify-between" style={{ borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <span>Sort order: {plan.sortOrder}</span>
                    {plan.isActive && <span className="inline-flex items-center gap-1 text-green-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Live</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan Create/Edit Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--surface-0)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-500 to-violet-600">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingPlan ? 'Edit Plan' : 'Create Plan'}
                </h3>
                <p className="text-xs text-white/60">Configure pricing and feature limits</p>
              </div>
              <button onClick={() => setShowPlanForm(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"><X size={18} className="text-white" /></button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Identity */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Plan Name" required>
                    <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Business" className="input w-full" />
                  </FormField>
                  <FormField label="Slug" required>
                    <input value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="e.g. business" className="input w-full font-mono" disabled={!!editingPlan} />
                  </FormField>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Pricing */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pricing</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Monthly (₹)" required>
                    <div className="relative">
                      <input type="number" value={planForm.priceMonthly || ''} onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })} className="input w-full pl-6" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>₹</span>
                    </div>
                  </FormField>
                  <FormField label="Yearly (₹)" required>
                    <div className="relative">
                      <input type="number" value={planForm.priceYearly || ''} onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })} className="input w-full pl-6" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>₹</span>
                    </div>
                  </FormField>
                </div>
                {planForm.priceMonthly > 0 && planForm.priceYearly > 0 && (
                  <p className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 inline-block">
                    Yearly saves {Math.round((1 - planForm.priceYearly / (planForm.priceMonthly * 12)) * 100)}%
                  </p>
                )}
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Feature Limits */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Feature Limits</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use -1 for unlimited</p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Active Deals">
                    <input type="number" value={planForm.maxActiveDeals} onChange={(e) => setPlanForm({ ...planForm, maxActiveDeals: Number(e.target.value) })} className="input w-full text-center" />
                  </FormField>
                  <FormField label="Total Deals">
                    <input type="number" value={planForm.maxTotalDeals} onChange={(e) => setPlanForm({ ...planForm, maxTotalDeals: Number(e.target.value) })} className="input w-full text-center" />
                  </FormField>
                  <FormField label="Leads / mo">
                    <input type="number" value={planForm.monthlyLeadUnlocks} onChange={(e) => setPlanForm({ ...planForm, monthlyLeadUnlocks: Number(e.target.value) })} className="input w-full text-center" />
                  </FormField>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Sponsorship Types */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sponsorship Access</p>
                <div className="flex flex-wrap gap-2">
                  {SPONSORSHIP_OPTIONS.map((t) => {
                    const selected = planForm.sponsorshipTypes.includes(t);
                    return (
                      <button key={t} type="button"
                        onClick={() => setPlanForm({
                          ...planForm,
                          sponsorshipTypes: selected ? planForm.sponsorshipTypes.filter((x) => x !== t) : [...planForm.sponsorshipTypes, t],
                        })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${selected ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-gray-50'}`}
                        style={!selected ? { borderColor: 'var(--border-color)', color: 'var(--text-muted)' } : undefined}>
                        {t.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-light)' }} />

              {/* Sort Order */}
              <FormField label="Sort Order">
                <input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })} className="input w-24 text-center" />
              </FormField>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
              <button onClick={() => setShowPlanForm(false)} className="btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSavePlan} disabled={createPlan.isPending || updatePlan.isPending}
                className="btn-primary px-5 py-2 rounded-lg text-sm font-medium">
                {(createPlan.isPending || updatePlan.isPending) ? 'Saving…' : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
