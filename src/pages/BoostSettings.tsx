import { useState, useEffect, useMemo } from 'react';
import { Save, Rocket, IndianRupee, Eye, MousePointerClick, Clock, TrendingUp, Calculator, Info, Package, Plus, Trash2, GripVertical } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useSponsoredStats } from '../hooks/useSponsored';
import { ROUTES } from '../utils/constants';
import type { SystemSetting } from '../types/system-setting';

// ─── Constants ─────────────────────────────────────────────────

const SPONSORSHIP_KEYS = [
  { key: 'sponsorship_cost_per_click', label: 'Cost Per Click (CPC)', description: 'Amount deducted from budget when a user clicks on a boosted listing', default: '5.00' },
  { key: 'sponsorship_cost_per_impression', label: 'Cost Per Impression (CPI)', description: 'Amount deducted from budget each time a boosted listing is shown', default: '0.10' },
];

const DEFAULT_PLANS = [
  { id: 'basic', name: 'Basic Boost', type: 'inline', price: 499, duration: 7, features: ['Appear in search results', 'Basic analytics', '~500 impressions'], recommended: false },
  { id: 'standard', name: 'Standard Spotlight', type: 'carousel', price: 1499, duration: 14, features: ['Featured in carousel', 'Priority in search', 'Detailed analytics', '~2000 impressions'], recommended: true },
  { id: 'premium', name: 'Premium Top Result', type: 'top_result', price: 2999, duration: 30, features: ['Always top of search', 'Carousel + inline placement', 'Full analytics dashboard', '~5000 impressions', 'Priority support'], recommended: false },
];

interface PlanConfig {
  id: string;
  name: string;
  type: string;
  price: number;
  duration: number;
  features: string[];
  recommended: boolean;
  // App Store Connect consumable product id for iOS IAP (one per boost plan).
  appleProductId?: string;
}

const TYPE_OPTIONS = [
  { value: 'inline', label: 'In-Feed' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'top_result', label: 'Top Result' },
];

// ─── Simulator Logic ───────────────────────────────────────────

interface SimResult {
  totalCostPerDay: number;
  daysUntilExhausted: number;
  hoursUntilExhausted: number;
  dailyImpressionCost: number;
  dailyClickCost: number;
  budgetUsedPercent7d: number;
  willExhaustBeforeEnd: boolean;
  remainingBudgetAtEnd: number;
}

function simulate(
  budget: number,
  duration: number,
  cpc: number,
  cpi: number,
  dailyImpressions: number,
  dailyClicks: number,
): SimResult {
  const dailyImpressionCost = dailyImpressions * cpi;
  const dailyClickCost = dailyClicks * cpc;
  const totalCostPerDay = dailyImpressionCost + dailyClickCost;
  const daysUntilExhausted = totalCostPerDay > 0 ? budget / totalCostPerDay : Infinity;
  const hoursUntilExhausted = daysUntilExhausted * 24;
  const budgetUsedPercent7d = Math.min(100, (totalCostPerDay * Math.min(duration, 7) / budget) * 100);
  const willExhaustBeforeEnd = daysUntilExhausted < duration;
  const remainingBudgetAtEnd = Math.max(0, budget - totalCostPerDay * duration);

  return {
    totalCostPerDay,
    daysUntilExhausted,
    hoursUntilExhausted,
    dailyImpressionCost,
    dailyClickCost,
    budgetUsedPercent7d,
    willExhaustBeforeEnd,
    remainingBudgetAtEnd,
  };
}

// ─── Main Component ────────────────────────────────────────────

export default function BoostSettings() {
  const { data: allSettings, isLoading } = useSettings();
  const { data: stats } = useSponsoredStats();
  const updateMutation = useUpdateSettings();

  // Live values from DB
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Plan editor
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);

  // Simulator inputs
  const [simBudget, setSimBudget] = useState(1499);
  const [simDuration, setSimDuration] = useState(14);
  const [simImpressions, setSimImpressions] = useState(500);
  const [simClicks, setSimClicks] = useState(10);

  useEffect(() => {
    if (allSettings) {
      const map: Record<string, string> = {};
      allSettings.forEach((s: SystemSetting) => {
        if (s.key.startsWith('sponsorship_')) {
          map[s.key] = s.value;
        }
      });
      setLocalValues(map);

      // Load plans from settings
      const plansSetting = allSettings.find((s: SystemSetting) => s.key === 'sponsorship_plans');
      if (plansSetting) {
        try {
          const parsed = JSON.parse(plansSetting.value);
          if (Array.isArray(parsed) && parsed.length > 0) setPlans(parsed);
        } catch { /* keep defaults */ }
      }

      setHasChanges(false);
    }
  }, [allSettings]);

  const cpc = parseFloat(localValues['sponsorship_cost_per_click'] || '5.00');
  const cpi = parseFloat(localValues['sponsorship_cost_per_impression'] || '0.10');

  const simResult = useMemo(
    () => simulate(simBudget, simDuration, cpc, cpi, simImpressions, simClicks),
    [simBudget, simDuration, cpc, cpi, simImpressions, simClicks],
  );

  const planPreviews = useMemo(
    () => plans.map(plan => ({
      ...plan,
      result: simulate(plan.price, plan.duration, cpc, cpi, simImpressions, simClicks),
    })),
    [plans, cpc, cpi, simImpressions, simClicks],
  );

  const updateValue = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updatePlan = (index: number, field: keyof PlanConfig, value: any) => {
    setPlans(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const addPlan = () => {
    setPlans(prev => [...prev, {
      id: `plan_${Date.now()}`,
      name: 'New Plan',
      type: 'inline',
      price: 499,
      duration: 7,
      features: ['Feature 1'],
      recommended: false,
    }]);
    setHasChanges(true);
  };

  const removePlan = (index: number) => {
    if (plans.length <= 1) return;
    setPlans(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const toggleRecommended = (index: number) => {
    setPlans(prev => prev.map((p, i) => ({ ...p, recommended: i === index })));
    setHasChanges(true);
  };

  const handleSave = () => {
    const changes = [
      ...Object.entries(localValues).map(([key, value]) => ({ key, value })),
      { key: 'sponsorship_plans', value: JSON.stringify(plans) },
    ];
    updateMutation.mutate(changes, { onSuccess: () => setHasChanges(false) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Boost & Sponsorship Settings"
        description="Configure CPC/CPI rates and preview budget consumption with the simulator"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Boost Settings' }]}
        actions={hasChanges ? (
          <button onClick={handleSave} disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-all"
            style={{ background: 'var(--color-primary)' }}>
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        ) : undefined}
      />

      {/* Platform-wide Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Rocket className="w-5 h-5" />} title="Active Boosts" value={stats.active} />
          <StatCard icon={<IndianRupee className="w-5 h-5" />} title="Total Revenue" value={`₹${Number(stats.totalSpent).toLocaleString('en-IN')}`} />
          <StatCard icon={<Eye className="w-5 h-5" />} title="Total Impressions" value={Number(stats.totalImpressions).toLocaleString('en-IN')} />
          <StatCard icon={<MousePointerClick className="w-5 h-5" />} title="Total Clicks" value={Number(stats.totalClicks).toLocaleString('en-IN')} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ─── Left: Pricing Controls ─── */}
        <div className="space-y-6">
          <Section icon={<IndianRupee className="w-5 h-5" />} title="Pricing Configuration" subtitle="These rates apply to all new sponsorships. Existing ones keep their creation-time rates.">
            <div className="space-y-4">
              {SPONSORSHIP_KEYS.map(({ key, label, description, default: defaultVal }) => (
                <div key={key} className="p-5 rounded-xl border transition-all hover:shadow-sm"
                  style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
                    </div>
                    <div className="relative w-32 flex-shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>₹</span>
                      <input
                        type="number"
                        min={0}
                        step={key.includes('impression') ? '0.01' : '0.50'}
                        value={localValues[key] ?? defaultVal}
                        onChange={e => updateValue(key, e.target.value)}
                        className="w-full px-3 py-2.5 pl-7 text-sm font-medium rounded-lg border text-right focus:outline-none focus:ring-2 transition-all"
                        style={{
                          background: 'var(--surface-0)',
                          borderColor: hasChanges ? 'var(--color-primary)' : 'var(--border-default)',
                          color: 'var(--text-primary)',
                          '--tw-ring-color': 'var(--color-primary)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      Default: ₹{defaultVal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* How it works */}
          <Section icon={<Info className="w-5 h-5" />} title="How Budget Consumption Works" subtitle="Understanding the CPC + CPI model">
            <div className="p-5 rounded-xl border space-y-3" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
              <HowItWorksRow emoji="👁" label="Impression" value={`₹${cpi.toFixed(2)} deducted`} description="Each time the listing appears in explore feed, search results, or home carousel" />
              <HowItWorksRow emoji="👆" label="Click" value={`₹${cpc.toFixed(2)} deducted`} description="When a user taps/clicks on the boosted listing to view the provider profile" />
              <HowItWorksRow emoji="💰" label="Budget Exhausted" value="Auto-stops" description="Boost is automatically deactivated when spent_amount >= budget_amount" />
              <HowItWorksRow emoji="📅" label="Duration Expired" value="Auto-stops" description="Boost deactivates when end date is reached, even if budget remains" />
            </div>
          </Section>

          {/* Plan Editor */}
          <Section icon={<Package className="w-5 h-5" />} title="Plan Configuration" subtitle="Configure the boost plans shown to providers. Changes apply to new purchases only.">
            <div className="space-y-4">
              {plans.map((plan, index) => (
                <div key={plan.id} className="p-5 rounded-xl border transition-all"
                  style={{ background: 'var(--surface-0)', borderColor: plan.recommended ? 'var(--color-primary)' : 'var(--border-default)' }}>
                  {/* Plan header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Plan {index + 1}
                      </span>
                      {plan.recommended && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRecommended(index)}
                        className="text-[10px] px-2 py-1 rounded-md border transition-colors hover:opacity-80"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                        {plan.recommended ? 'Unmark' : 'Set Recommended'}
                      </button>
                      {plans.length > 1 && (
                        <button onClick={() => removePlan(index)}
                          className="p-1 rounded-md transition-colors hover:bg-red-50"
                          style={{ color: '#ef4444' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Plan fields */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                      <input type="text" value={plan.name}
                        onChange={e => updatePlan(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all"
                        style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
                      <select value={plan.type}
                        onChange={e => updatePlan(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all"
                        style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}>
                        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Price (₹)</label>
                      <input type="number" min={100} step={50} value={plan.price}
                        onChange={e => updatePlan(index, 'price', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all"
                        style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Duration (days)</label>
                      <input type="number" min={1} max={31} step={1} value={plan.duration}
                        onChange={e => updatePlan(index, 'duration', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all"
                        style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                    </div>
                  </div>

                  {/* Apple IAP product id — must match the Consumable created in App Store Connect */}
                  <div className="mb-3">
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Apple Product ID (iOS IAP)</label>
                    <input type="text" value={plan.appleProductId ?? ''} placeholder="e.g. tijarah.boost.basic"
                      onChange={e => updatePlan(index, 'appleProductId', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border focus:outline-none focus:ring-2 transition-all"
                      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                  </div>

                  {/* Features */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
                      Features (one per line)
                    </label>
                    <textarea
                      value={plan.features.join('\n')}
                      onChange={e => updatePlan(index, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
                      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}

              <button onClick={addPlan}
                className="w-full p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                <Plus className="w-4 h-4" /> Add Plan
              </button>
            </div>
          </Section>
        </div>

        {/* ─── Right: Budget Simulator ─── */}
        <div className="space-y-6">
          <Section icon={<Calculator className="w-5 h-5" />} title="Budget Simulator" subtitle="Preview how quickly a provider's budget would be consumed with current rates">
            <div className="p-5 rounded-xl border space-y-5" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
              {/* Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <SimInput label="Budget (₹)" value={simBudget} onChange={setSimBudget} min={100} step={100} />
                <SimInput label="Duration (days)" value={simDuration} onChange={setSimDuration} min={1} step={1} />
                <SimInput label="Daily Impressions" value={simImpressions} onChange={setSimImpressions} min={0} step={50} />
                <SimInput label="Daily Clicks" value={simClicks} onChange={setSimClicks} min={0} step={1} />
              </div>

              {/* Results */}
              <div className="border-t pt-5 space-y-3" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Projection</h4>
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Daily Burn" value={`₹${simResult.totalCostPerDay.toFixed(2)}`}
                    sub={`Impressions: ₹${simResult.dailyImpressionCost.toFixed(2)} + Clicks: ₹${simResult.dailyClickCost.toFixed(2)}`} />
                  <ResultCard label="Budget Lasts"
                    value={simResult.daysUntilExhausted === Infinity ? '∞' : simResult.daysUntilExhausted < 1 ? `${simResult.hoursUntilExhausted.toFixed(1)} hrs` : `${simResult.daysUntilExhausted.toFixed(1)} days`}
                    sub={simResult.willExhaustBeforeEnd ? '⚠️ Exhausts before duration ends' : '✅ Budget survives full duration'}
                    warning={simResult.willExhaustBeforeEnd} />
                  <ResultCard label="Budget at End" value={`₹${simResult.remainingBudgetAtEnd.toFixed(2)}`}
                    sub={`${((1 - simResult.remainingBudgetAtEnd / simBudget) * 100).toFixed(0)}% utilized`} />
                  <ResultCard label="Effective CPV"
                    value={`₹${simImpressions + simClicks > 0 ? (simResult.totalCostPerDay / (simImpressions + simClicks)).toFixed(3) : '0.000'}`}
                    sub="Blended cost per view/action" />
                </div>
              </div>

              {/* Budget bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>Budget consumption over {simDuration} days</span>
                  <span className="font-semibold" style={{ color: simResult.willExhaustBeforeEnd ? '#ef4444' : 'var(--color-primary)' }}>
                    {simResult.willExhaustBeforeEnd ? '100%' : `${((simResult.totalCostPerDay * simDuration / simBudget) * 100).toFixed(0)}%`}
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-primary-light)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (simResult.totalCostPerDay * simDuration / simBudget) * 100)}%`,
                      background: simResult.willExhaustBeforeEnd
                        ? 'linear-gradient(90deg, var(--color-primary), #ef4444)'
                        : 'var(--color-primary)',
                    }}
                  />
                </div>
                {simResult.willExhaustBeforeEnd && (
                  <p className="text-xs mt-2 font-medium" style={{ color: '#ef4444' }}>
                    ⚠️ Budget will run out on day {Math.ceil(simResult.daysUntilExhausted)} of {simDuration}. Provider will not receive impressions after that.
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Plan Previews */}
          <Section icon={<TrendingUp className="w-5 h-5" />} title="Plan Projections" subtitle={`Based on ${simImpressions} impressions/day and ${simClicks} clicks/day`}>
            <div className="space-y-3">
              {planPreviews.map(({ id, name, price, duration, result }) => (
                <div key={id} className="p-4 rounded-xl border flex items-center justify-between"
                  style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{price} / {duration} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: result.willExhaustBeforeEnd ? '#ef4444' : 'var(--color-primary)' }}>
                      {result.willExhaustBeforeEnd
                        ? `Exhausts day ${Math.ceil(result.daysUntilExhausted)}`
                        : `₹${result.remainingBudgetAtEnd.toFixed(0)} left`}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      ₹{result.totalCostPerDay.toFixed(2)}/day burn
                    </p>
                  </div>
                  {/* Mini progress bar */}
                  <div className="w-16 ml-4">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-primary-light)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (result.totalCostPerDay * duration / price) * 100)}%`,
                        background: result.willExhaustBeforeEnd ? '#ef4444' : 'var(--color-primary)',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Quick Presets */}
          <Section icon={<Clock className="w-5 h-5" />} title="Traffic Presets" subtitle="Quickly change simulator inputs to common scenarios">
            <div className="grid grid-cols-3 gap-2">
              <PresetButton label="Low Traffic" sub="100 imp / 2 clicks" onClick={() => { setSimImpressions(100); setSimClicks(2); }} />
              <PresetButton label="Medium Traffic" sub="500 imp / 10 clicks" onClick={() => { setSimImpressions(500); setSimClicks(10); }} />
              <PresetButton label="High Traffic" sub="2000 imp / 50 clicks" onClick={() => { setSimImpressions(2000); setSimClicks(50); }} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      {children}
    </div>
  );
}

function SimInput({ label, value, onChange, min, step }: {
  label: string; value: number; onChange: (v: number) => void; min: number; step: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all"
        style={{
          background: 'var(--surface-0)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          '--tw-ring-color': 'var(--color-primary)',
        } as React.CSSProperties}
      />
    </div>
  );
}

function ResultCard({ label, value, sub, warning }: {
  label: string; value: string; sub: string; warning?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
      <p className="text-[10px] uppercase font-semibold tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: warning ? '#ef4444' : 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function HowItWorksRow({ emoji, label, value, description }: {
  emoji: string; label: string; value: string; description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{value}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </div>
  );
}

function PresetButton({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="p-3 rounded-lg border text-left transition-all hover:shadow-sm active:scale-[0.98]"
      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </button>
  );
}
