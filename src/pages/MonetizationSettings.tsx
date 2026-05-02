import { useState, useEffect, useMemo } from 'react';
import { Save, IndianRupee, Zap, Gift, ToggleLeft, ToggleRight, TrendingDown } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { ROUTES } from '../utils/constants';
import type { SystemSetting } from '../types/system-setting';

const LEAD_PRICING_KEYS = [
  { key: 'lead_price_hot', label: 'Hot Lead Price', description: 'Full price for Hot tier leads' },
  { key: 'lead_price_warm', label: 'Warm Lead Price', description: 'Full price for Warm tier leads' },
  { key: 'lead_price_soft', label: 'Soft Lead Price', description: 'Full price for Soft tier leads' },
  { key: 'lead_price_cold', label: 'Cold Lead Price', description: 'Full price for Cold tier leads' },
];

const LEAD_DISCOUNTED_KEYS = [
  { key: 'lead_price_hot_discounted', label: 'Hot (Growth)', description: 'Discounted price for Growth subscribers' },
  { key: 'lead_price_warm_discounted', label: 'Warm (Growth)', description: 'Discounted price for Growth subscribers' },
  { key: 'lead_price_soft_discounted', label: 'Soft (Growth)', description: 'Discounted price for Growth subscribers' },
  { key: 'lead_price_cold_discounted', label: 'Cold (Growth)', description: 'Discounted price for Growth subscribers' },
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
  { key: 'leads_monetization_enabled', label: 'Lead Monetization', description: 'When OFF, all lead unlocks are free' },
  { key: 'deals_monetization_enabled', label: 'Deal Monetization', description: 'When OFF, all deal creation is free' },
  { key: 'subscriptions_visible', label: 'Subscriptions Visible', description: 'When OFF, subscription/boost tabs are hidden from providers' },
];

export default function MonetizationSettings() {
  const { data: allSettings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Filter to only monetization + relevant feature_flag settings
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
        title="Monetization"
        description="Configure pay-per-lead and pay-per-deal pricing, quotas, and feature toggles"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Monetization' }]}
        actions={hasChanges ? (
          <button onClick={handleSave} disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}>
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        ) : undefined}
      />

      <div className="space-y-8">
        {/* Feature Toggles */}
        <Section icon={<Zap className="w-5 h-5" />} title="Feature Toggles" subtitle="Control which monetization features are active">
          <div className="space-y-2">
            {FLAG_KEYS.map(({ key, label, description }) => {
              const isOn = localValues[key] === 'true';
              return (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border"
                  style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
                  <div className="min-w-0 mr-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
                  </div>
                  <button onClick={() => toggleFlag(key)} className="flex-shrink-0 transition-colors"
                    style={{ color: isOn ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                    {isOn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Lead Pricing */}
        <Section icon={<IndianRupee className="w-5 h-5" />} title="Lead Pricing (Full)" subtitle="Price per lead unlock for Free/Starter tier providers">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEAD_PRICING_KEYS.map(({ key, label, description }) => (
              <PriceInput key={key} label={label} description={description}
                value={localValues[key] ?? ''} onChange={v => updateValue(key, v)} />
            ))}
          </div>
        </Section>

        {/* Discounted Lead Pricing */}
        <Section icon={<TrendingDown className="w-5 h-5" />} title="Lead Pricing (Growth Discount)" subtitle="50% discounted prices for Growth-tier subscribers">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEAD_DISCOUNTED_KEYS.map(({ key, label, description }) => (
              <PriceInput key={key} label={label} description={description}
                value={localValues[key] ?? ''} onChange={v => updateValue(key, v)} />
            ))}
          </div>
        </Section>

        {/* Deal Pricing */}
        <Section icon={<IndianRupee className="w-5 h-5" />} title="Deal Creation Pricing" subtitle="Price charged after free quota exhausted">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEAL_PRICING_KEYS.map(({ key, label, description }) => (
              <PriceInput key={key} label={label} description={description}
                value={localValues[key] ?? ''} onChange={v => updateValue(key, v)} />
            ))}
          </div>
        </Section>

        {/* Free Quotas */}
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

function PriceInput({ label, description, value, onChange, prefix = '₹' }: {
  label: string; description: string; value: string; onChange: (v: string) => void; prefix?: string;
}) {
  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
      <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{description}</p>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>{prefix}</span>
        )}
        <input type="number" min={0} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border"
          style={{
            background: 'var(--surface-0)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            paddingLeft: prefix ? '1.75rem' : undefined,
          }} />
      </div>
    </div>
  );
}
