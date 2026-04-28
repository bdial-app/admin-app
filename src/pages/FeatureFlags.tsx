import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useFeatureFlags, useUpdateFeatureFlags } from '../hooks/useFeatureFlags';
import { ROUTES } from '../utils/constants';
import type { FeatureFlag } from '../types';

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  maintenance_mode: {
    label: 'Maintenance Mode',
    description: 'Put the entire platform in maintenance mode',
  },
  registration_enabled: {
    label: 'User Registration',
    description: 'Allow new users to register on the platform',
  },
  provider_onboarding_enabled: {
    label: 'Provider Onboarding',
    description: 'Allow new providers to register on the platform',
  },
  chat_enabled: {
    label: 'Chat / Messaging',
    description: 'Enable the chat/messaging feature between users and providers',
  },
  reviews_enabled: {
    label: 'Reviews',
    description: 'Allow users to submit reviews for providers',
  },
  search_enabled: {
    label: 'Search',
    description: 'Enable search functionality',
  },
  offers_require_approval: {
    label: 'Offers Require Approval',
    description: 'When enabled, new provider offers need admin approval before going live',
  },
  sponsorship_requires_approval: {
    label: 'Sponsorships Require Approval',
    description: 'When enabled, new sponsorship listings need admin approval before going live',
  },
};

const LIMIT_LABELS: Record<string, { label: string; description: string }> = {
  max_products_per_provider: {
    label: 'Max Products Per Provider',
    description: 'Maximum number of products a provider can list',
  },
  max_photos_per_provider: {
    label: 'Max Photos Per Provider',
    description: 'Maximum number of portfolio photos per provider',
  },
  max_active_offers_per_provider: {
    label: 'Max Active Offers Per Provider',
    description: 'Maximum number of active offers per provider',
  },
  max_active_sponsorships_per_provider: {
    label: 'Max Active Sponsorships Per Provider',
    description: 'Maximum number of active sponsorships per provider',
  },
};

export default function FeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags();
  const updateMutation = useUpdateFeatureFlags();
  const [localFlags, setLocalFlags] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (flags) {
      const map: Record<string, string> = {};
      flags.forEach((f: FeatureFlag) => { map[f.key] = f.value; });
      setLocalFlags(map);
      setHasChanges(false);
    }
  }, [flags]);

  const toggleFlag = (key: string) => {
    setLocalFlags((prev) => {
      const next = { ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' };
      setHasChanges(true);
      return next;
    });
  };

  const updateLimit = (key: string, value: string) => {
    setLocalFlags((prev) => {
      const next = { ...prev, [key]: value };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    const changes = Object.entries(localFlags).map(([key, value]) => ({ key, value }));
    updateMutation.mutate(changes, { onSuccess: () => setHasChanges(false) });
  };

  const booleanFlags = flags?.filter((f: FeatureFlag) => f.type === 'boolean' || FLAG_LABELS[f.key]) ?? [];
  const limitFlags = flags?.filter((f: FeatureFlag) => f.type === 'number' || LIMIT_LABELS[f.key]) ?? [];

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        description="Control platform features and limits"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Feature Flags' }]}
        actions={
          hasChanges ? (
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Boolean Feature Flags */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Feature Toggles
            </h3>
            <div className="space-y-2">
              {booleanFlags.map((flag: FeatureFlag) => {
                const meta = FLAG_LABELS[flag.key];
                const isOn = localFlags[flag.key] === 'true';
                return (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between p-4 rounded-xl border"
                    style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
                  >
                    <div className="min-w-0 mr-4">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {meta?.label || flag.key}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {meta?.description || flag.description || flag.key}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFlag(flag.key)}
                      className="flex-shrink-0 transition-colors"
                      style={{ color: isOn ? 'var(--color-primary)' : 'var(--text-muted)' }}
                    >
                      {isOn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Numeric Limits */}
          {limitFlags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {limitFlags.map((flag: FeatureFlag) => {
                  const meta = LIMIT_LABELS[flag.key];
                  return (
                    <div
                      key={flag.key}
                      className="p-4 rounded-xl border"
                      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
                    >
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        {meta?.label || flag.key}
                      </p>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                        {meta?.description || flag.description || flag.key}
                      </p>
                      <input
                        type="number"
                        min={0}
                        value={localFlags[flag.key] ?? ''}
                        onChange={(e) => updateLimit(flag.key, e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border"
                        style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
