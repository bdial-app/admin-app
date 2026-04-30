import { useState } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, Crown, X } from 'lucide-react';
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
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
        <button onClick={() => setTab('subscriptions')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'subscriptions' ? 'shadow-sm' : ''}`}
          style={{ background: tab === 'subscriptions' ? 'var(--bg-card)' : 'transparent', color: tab === 'subscriptions' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          Active Subscriptions
        </button>
        <button onClick={() => setTab('plans')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'plans' ? 'shadow-sm' : ''}`}
          style={{ background: tab === 'plans' ? 'var(--bg-card)' : 'transparent', color: tab === 'plans' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
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
            {(plans ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((plan) => (
              <div key={plan.id} className="rounded-xl border overflow-hidden transition-shadow hover:shadow-md"
                style={{ background: 'var(--bg-card)', borderColor: plan.isActive ? 'var(--color-primary)' : 'var(--border-light)', borderWidth: plan.isActive ? 2 : 1 }}>
                {/* Plan Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h4>
                        {plan.isActive
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>}
                      </div>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{plan.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditPlan(plan)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleTogglePlan(plan)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Toggle">
                        {plan.isActive ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(plan.priceMonthly).toLocaleString()}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/mo</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>₹{Number(plan.priceYearly).toLocaleString()}/yr</div>
                </div>

                {/* Limits */}
                <div className="px-5 py-3 space-y-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Active Deals</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.maxActiveDeals === -1 ? '∞' : plan.maxActiveDeals}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Total Deals</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.maxTotalDeals === -1 ? '∞' : plan.maxTotalDeals}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Lead Unlocks / mo</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.monthlyLeadUnlocks === -1 ? '∞' : plan.monthlyLeadUnlocks}</span>
                  </div>
                  {plan.sponsorshipTypes && plan.sponsorshipTypes.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Sponsorships</span>
                      <span className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{plan.sponsorshipTypes.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Sort Order */}
                <div className="px-5 py-2 text-xs" style={{ borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  Sort order: {plan.sortOrder}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Create/Edit Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingPlan ? 'Edit Plan' : 'Create Plan'}
              </h3>
              <button onClick={() => setShowPlanForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Plan Name" required>
                  <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Business" className="input w-full" />
                </FormField>
                <FormField label="Slug" required>
                  <input value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="e.g. business" className="input w-full font-mono" disabled={!!editingPlan} />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Monthly Price (₹)" required>
                  <input type="number" value={planForm.priceMonthly || ''} onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })} className="input w-full" />
                </FormField>
                <FormField label="Yearly Price (₹)" required>
                  <input type="number" value={planForm.priceYearly || ''} onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })} className="input w-full" />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Active Deals">
                  <input type="number" value={planForm.maxActiveDeals} onChange={(e) => setPlanForm({ ...planForm, maxActiveDeals: Number(e.target.value) })} className="input w-full" />
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>-1 = unlimited</p>
                </FormField>
                <FormField label="Total Deals">
                  <input type="number" value={planForm.maxTotalDeals} onChange={(e) => setPlanForm({ ...planForm, maxTotalDeals: Number(e.target.value) })} className="input w-full" />
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>-1 = unlimited</p>
                </FormField>
                <FormField label="Lead Unlocks/mo">
                  <input type="number" value={planForm.monthlyLeadUnlocks} onChange={(e) => setPlanForm({ ...planForm, monthlyLeadUnlocks: Number(e.target.value) })} className="input w-full" />
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>-1 = unlimited</p>
                </FormField>
              </div>

              <FormField label="Sponsorship Types">
                <div className="flex flex-wrap gap-3">
                  {SPONSORSHIP_OPTIONS.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={planForm.sponsorshipTypes.includes(t)}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          sponsorshipTypes: e.target.checked ? [...planForm.sponsorshipTypes, t] : planForm.sponsorshipTypes.filter((x) => x !== t),
                        })}
                        className="rounded" />
                      <span className="capitalize">{t.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="Sort Order">
                <input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })} className="input w-24" />
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
