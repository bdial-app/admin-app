import { useState, useEffect, useMemo } from 'react';
import {
  Save, IndianRupee, Gift, ToggleLeft, ToggleRight, TrendingDown,
  Crown, Target, Users, Sparkles, Shield,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';

import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useSubscriptionPlans, useSubscriptionStats, useUpdatePlan } from '../hooks/useSubscriptions';
import { ROUTES } from '../utils/constants';
import type { SystemSetting } from '../types/system-setting';
import type { SubscriptionPlan } from '../services/subscriptions.service';
import { toast } from 'react-toastify';

// ─── Setting Keys ────────────────────────

const LEAD_PRICING_KEYS = [
  { key: 'lead_price_hot', label: 'Hot Lead', description: 'Full price for Hot tier leads', tier: 'hot' },
  { key: 'lead_price_warm', label: 'Warm Lead', description: 'Full price for Warm tier leads', tier: 'warm' },
  { key: 'lead_price_soft', label: 'Soft Lead', description: 'Full price for Soft tier leads', tier: 'soft' },
  { key: 'lead_price_cold', label: 'Cold Lead', description: 'Full price for Cold tier leads', tier: 'cold' },
];

const LEAD_DISCOUNTED_KEYS = [
  { key: 'lead_price_hot_discounted', label: 'Hot (Growth)', description: 'Discounted for Growth subscribers', tier: 'hot' },
  { key: 'lead_price_warm_discounted', label: 'Warm (Growth)', description: 'Discounted for Growth subscribers', tier: 'warm' },
  { key: 'lead_price_soft_discounted', label: 'Soft (Growth)', description: 'Discounted for Growth subscribers', tier: 'soft' },
  { key: 'lead_price_cold_discounted', label: 'Cold (Growth)', description: 'Discounted for Growth subscribers', tier: 'cold' },
];

const DEAL_PRICING_KEYS = [
  { key: 'deal_creation_price', label: 'Deal Creation Price', description: 'Full price per deal creation' },
  { key: 'deal_creation_price_discounted', label: 'Deal (Growth)', description: 'Discounted price for Growth subscribers' },
];

const QUOTA_KEYS = [
  { key: 'free_lead_quota_monthly', label: 'Free Leads / Month', description: 'Leads given free each month (resets monthly)' },
  { key: 'free_deal_quota_lifetime', label: 'Free Deals (Lifetime)', description: 'Free deals given once (never resets)' },
];

const FLAG_KEYS = [
  { key: 'leads_monetization_enabled', label: 'Lead Monetization', description: 'When OFF, all lead unlocks are free', icon: IndianRupee, color: 'var(--color-success)' },
  { key: 'deals_monetization_enabled', label: 'Deal Monetization', description: 'When OFF, all deal creation is free', icon: Target, color: 'var(--color-info)' },
  { key: 'subscriptions_visible', label: 'Subscriptions Visible', description: 'When OFF, subscription/boost tabs are hidden from providers', icon: Crown, color: '#d97706' },
];

const TIER_COLORS: Record<string, string> = {
  hot: '#ef4444', warm: '#f97316', soft: '#eab308', cold: '#6b7280',
};

const formatCurrency = (v: number | string | null | undefined) => {
  const n = Number(v);
  if (!n && n !== 0) return '\u20B90';
  return `\u20B9${n.toLocaleString('en-IN')}`;
};

export default function MonetizationSettings() {
  const { data: allSettings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const { data: plans } = useSubscriptionPlans();
  const { data: stats } = useSubscriptionStats();
  const updatePlanMutation = useUpdatePlan();

  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const monetizationKeys = useMemo(() => {
    const keys = new Set([
      ...LEAD_PRICING_KEYS.map(k => k.key),
      ...LEAD_DISCOUNTED_KEYS.map(k => k.key),
      ...DEAL_PRICING_KEYS.map(k => k.key),
      ...QUOTA_KEYS.map(k => k.key),
      ...FLAG_KEYS.map(k => k.key),
    ]);
    return keys;
  }, []);

  useEffect(() => {
    if (allSettings) {
      const map: Record<string, string> = {};
      allSettings.forEach((s: SystemSetting) => {
        if (monetizationKeys.has(s.key)) {
          map[s.key] = s.value;
        }
      });
      setLocalValues(map);
      setHasChanges(false);
    }
  }, [allSettings, monetizationKeys]);

  const updateValue = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleFlag = (key: string) => {
    setLocalValues(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true',
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const changes = Object.entries(localValues).map(([key, value]) => ({ key, value }));
    updateMutation.mutate(changes, { onSuccess: () => setHasChanges(false) });
  };

  const handleTogglePlan = async (plan: SubscriptionPlan) => {
    try {
      await updatePlanMutation.mutateAsync({ id: plan.id, body: { isActive: !plan.isActive } });
      toast.success(plan.isActive ? 'Plan deactivated' : 'Plan activated');
    } catch { toast.error('Failed to update plan'); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  const activePlans = plans?.filter(p => p.isActive).length ?? 0;
  const totalPlans = plans?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Monetization"
        description="Pricing, plans, quotas & feature toggles"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Monetization' }]}
        actions={hasChanges ? (
          <button onClick={handleSave} disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-all"
            style={{ background: 'var(--color-primary)' }}>
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving\u2026' : 'Save Changes'}
          </button>
        ) : undefined}
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          title="Active Plans"
          value={`${activePlans} / ${totalPlans}`}
          icon={<Crown className="w-5 h-5" />}
          accent="var(--color-primary)"
        />
        <StatCard
          title="Active Subscribers"
          value={stats?.active ?? 0}
          icon={<Users className="w-5 h-5" />}
          accent="var(--color-success)"
        />
        <StatCard
          title="Lead Price (Hot)"
          value={formatCurrency(localValues['lead_price_hot'])}
          icon={<IndianRupee className="w-5 h-5" />}
          accent="#ef4444"
        />
        <StatCard
          title="Free Lead Quota"
          value={localValues['free_lead_quota_monthly'] || '0'}
          icon={<Gift className="w-5 h-5" />}
          accent="var(--color-info)"
        />
      </div>

      <div className="space-y-8">

        {/* ═══ Feature Toggles ═══ */}
        <Section icon={<Shield className="w-5 h-5" />} title="Feature Toggles" subtitle="Control which monetization features are active system-wide">
          <div className="space-y-2">
            {FLAG_KEYS.map(({ key, label, description, icon: Icon, color }) => {
              const isOn = localValues[key] === 'true';
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl transition-all"
                  style={{
                    background: isOn ? `${color}08` : 'var(--surface-0)',
                    border: `1.5px solid ${isOn ? color : 'var(--border-default)'}`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 mr-4">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleFlag(key)} className="flex-shrink-0 transition-colors">
                    {isOn ? (
                      <ToggleRight className="w-9 h-9" style={{ color }} />
                    ) : (
                      <ToggleLeft className="w-9 h-9" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══ Subscription Plans Quick View ═══ */}
        <Section icon={<Crown className="w-5 h-5" />} title="Subscription Plans" subtitle="Quick-toggle plans and view limits. Full edit in Subscriptions page.">
          <div className="space-y-2">
            {(plans ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((plan) => {
              const subCount = stats?.byPlan?.filter(bp => bp.planId === plan.id && bp.status === 'active')
                .reduce((acc, bp) => acc + Number(bp.count), 0) ?? 0;
              return (
                <div
                  key={plan.id}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all"
                  style={{
                    background: 'var(--surface-0)',
                    border: `1.5px solid ${plan.isActive ? 'var(--color-primary)' : 'var(--border-default)'}`,
                    opacity: plan.isActive ? 1 : 0.6,
                  }}
                >
                  {/* Plan Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: plan.isActive ? 'var(--color-primary-light)' : 'var(--surface-2)' }}
                  >
                    <Crown className="w-5 h-5" style={{ color: plan.isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  </div>

                  {/* Plan Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</p>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {plan.slug}
                      </span>
                      {subCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                          {subCount} active
                        </span>
                      )}
                    </div>
                    {/* Feature chips */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <FeatureChip icon={<Target className="w-3 h-3" />} label={`${plan.maxActiveDeals === -1 ? '\u221E' : plan.maxActiveDeals} deals`} />
                      <FeatureChip icon={<Users className="w-3 h-3" />} label={`${plan.monthlyLeadUnlocks === -1 ? '\u221E' : plan.monthlyLeadUnlocks} leads/mo`} />
                      {plan.sponsorshipTypes?.length > 0 && (
                        <FeatureChip icon={<Sparkles className="w-3 h-3" />} label={plan.sponsorshipTypes.length + ' sponsor types'} />
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(plan.priceMonthly)}<span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span>
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(plan.priceYearly)}/yr
                    </p>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleTogglePlan(plan)}
                    className="flex-shrink-0 transition-colors"
                    title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                  >
                    {plan.isActive ? (
                      <ToggleRight className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
                    ) : (
                      <ToggleLeft className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>
              );
            })}
            {(!plans || plans.length === 0) && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No subscription plans configured yet</p>
            )}
          </div>
        </Section>

        {/* ═══ Lead Pricing ═══ */}
        <Section icon={<IndianRupee className="w-5 h-5" />} title="Lead Pricing (Full)" subtitle="Price per lead unlock for Free/Starter tier providers">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEAD_PRICING_KEYS.map(({ key, label, description, tier }) => (
              <PriceInput key={key} label={label} description={description}
                value={localValues[key] ?? ''} onChange={v => updateValue(key, v)}
                accentColor={TIER_COLORS[tier]} />
            ))}
          </div>
        </Section>

        {/* ═══ Growth Discounted Lead Pricing ═══ */}
        <Section icon={<TrendingDown className="w-5 h-5" />} title="Lead Pricing (Growth Discount)" subtitle="Discounted prices for Growth-tier subscribers">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEAD_DISCOUNTED_KEYS.map(({ key, label, description, tier }) => {
              const fullPriceKey = key.replace('_discounted', '');
              const fullPrice = Number(localValues[fullPriceKey] ?? 0);
              const discounted = Number(localValues[key] ?? 0);
              const savings = fullPrice > 0 ? Math.round((1 - discounted / fullPrice) * 100) : 0;
              return (
                <PriceInput key={key} label={label} description={description}
                  value={localValues[key] ?? ''} onChange={v => updateValue(key, v)}
                  accentColor={TIER_COLORS[tier]}
                  badge={savings > 0 ? `-${savings}%` : undefined} />
              );
            })}
          </div>
        </Section>

        {/* ═══ Deal Pricing ═══ */}
        <Section icon={<IndianRupee className="w-5 h-5" />} title="Deal Creation Pricing" subtitle="Price charged after free quota exhausted">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEAL_PRICING_KEYS.map(({ key, label, description }) => (
              <PriceInput key={key} label={label} description={description}
                value={localValues[key] ?? ''} onChange={v => updateValue(key, v)} />
            ))}
          </div>
        </Section>

        {/* ═══ Free Quotas ═══ */}
        <Section icon={<Gift className="w-5 h-5" />} title="Free Quotas" subtitle="How many free actions providers get before paying">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUOTA_KEYS.map(({ key, label, description }) => (
              <PriceInput key={key} label={label} description={description}
                value={localValues[key] ?? ''} onChange={v => updateValue(key, v)} prefix="" />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

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

function PriceInput({ label, description, value, onChange, prefix = '\u20B9', accentColor, badge }: {
  label: string; description: string; value: string; onChange: (v: string) => void; prefix?: string; accentColor?: string; badge?: string;
}) {
  return (
    <div
      className="p-4 rounded-xl transition-all"
      style={{ background: 'var(--surface-0)', border: `1.5px solid ${accentColor ? `${accentColor}30` : 'var(--border-default)'}` }}
    >
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-sm font-semibold" style={{ color: accentColor || 'var(--text-primary)' }}>{label}</p>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{description}</p>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: accentColor || 'var(--text-muted)' }}>{prefix}</span>
        )}
        <input type="number" min={0} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors focus-ring"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            paddingLeft: prefix ? '1.75rem' : undefined,
          }} />
      </div>
    </div>
  );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded"
      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
    >
      {icon} {label}
    </span>
  );
}
