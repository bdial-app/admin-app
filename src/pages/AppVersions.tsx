import { useMemo, useState } from 'react';
import { Apple, ExternalLink, Info, Save, Smartphone } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAppVersion, useUpdateAppVersion } from '../hooks/useAppVersion';
import { ROUTES } from '../utils/constants';
import type { AppPlatform, AppVersionConfig, AppVersionInput } from '../types/app-version';

const PLATFORMS: { key: AppPlatform; label: string; icon: typeof Smartphone; store: string }[] = [
  { key: 'android', label: 'Android', icon: Smartphone, store: 'Google Play' },
  { key: 'ios', label: 'iOS', icon: Apple, store: 'App Store' },
];

/** Mirrors the API: 1, 1.2, 1.2.3, and Android's zero-padded 1.0.03. */
const VERSION_PATTERN = /^\d{1,4}(\.\d{1,4}){0,2}$/;
const NOTES_MAX = 500;

function parse(v: string): number[] | null {
  const s = v.trim();
  if (!VERSION_PATTERN.test(s)) return null;
  const parts = s.split('.').map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  return parts;
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const toInput = (c: AppVersionConfig): AppVersionInput => ({
  android: {
    latestVersion: c.android.latestVersion,
    minVersion: c.android.minVersion,
    releaseNotes: c.android.releaseNotes ?? '',
  },
  ios: {
    latestVersion: c.ios.latestVersion,
    minVersion: c.ios.minVersion,
    releaseNotes: c.ios.releaseNotes ?? '',
  },
});

/** What is wrong with one platform's values, field by field. */
function problems(p: AppVersionInput[AppPlatform]) {
  const latest = parse(p.latestVersion);
  const min = parse(p.minVersion);
  return {
    latest: latest ? null : 'Use a version like 1.2.3',
    min: !min
      ? 'Use a version like 1.2.3'
      : latest && compare(min, latest) > 0
        ? 'Cannot be higher than the store version — nobody could meet it'
        : null,
    notes: (p.releaseNotes ?? '').length > NOTES_MAX ? `Keep it under ${NOTES_MAX} characters` : null,
  };
}

export default function AppVersions() {
  const { data, isLoading } = useAppVersion();
  const updateMutation = useUpdateAppVersion();
  // Only what the admin has changed is held in state; the form is the saved
  // values with those edits on top, so a refetch never fights the inputs.
  const [edits, setEdits] = useState<AppVersionInput | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const saved = useMemo(() => (data ? toInput(data) : null), [data]);
  const form = edits ?? saved;
  const dirty = !!edits && !!saved && JSON.stringify(edits) !== JSON.stringify(saved);
  const errors = useMemo(
    () => (form ? { android: problems(form.android), ios: problems(form.ios) } : null),
    [form],
  );
  const valid = !!errors && PLATFORMS.every(({ key }) => !Object.values(errors[key]).some(Boolean));

  // Raising a minimum locks people out until they update, so it gets a second look.
  const raisedMinimums = useMemo(() => {
    if (!form || !saved) return [];
    return PLATFORMS.filter(({ key }) => {
      const next = parse(form[key].minVersion);
      const prev = parse(saved[key].minVersion);
      return next && prev && compare(next, prev) > 0;
    });
  }, [form, saved]);

  const set = (platform: AppPlatform, field: keyof AppVersionInput[AppPlatform], value: string) =>
    setEdits((e) => {
      const base = e ?? saved;
      return base ? { ...base, [platform]: { ...base[platform], [field]: value } } : base;
    });

  const save = () => {
    if (!form) return;
    updateMutation.mutate(form, {
      onSuccess: () => {
        setEdits(null);
        setConfirmOpen(false);
      },
    });
  };

  const onSaveClick = () => (raisedMinimums.length ? setConfirmOpen(true) : save());

  const inputStyle = (hasError: boolean) => ({
    background: 'var(--surface-0)',
    borderColor: hasError ? 'var(--color-danger, #dc2626)' : 'var(--border-default)',
    color: 'var(--text-primary)',
  });

  return (
    <div>
      <PageHeader
        title="App Versions"
        description="Prompt or require people to update the mobile app"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'App Versions' }]}
        actions={
          dirty ? (
            <button
              onClick={onSaveClick}
              disabled={!valid || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          ) : undefined
        }
      />

      {/* Keyed so React swaps the spinner out instead of reusing its div for the
          first card, which would strip borderTopColor mid-update. */}
      {isLoading || !form || !errors ? (
        <div key="loading" className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div key="content" className="space-y-6">
          <div
            className="flex gap-3 p-4 rounded-xl border text-sm"
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Store version</strong> — set this once a release is live in the store.
                Anyone on an older version sees an <em>Update available</em> prompt they can dismiss.
              </p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Minimum version</strong> — anyone below this is blocked with
                <em> Update required</em> until they update. Raise it only when old versions must stop working.
              </p>
              <p>Android and iOS are set separately, because the two stores release on different days.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {PLATFORMS.map(({ key, label, icon: Icon, store }) => {
              const p = form[key];
              const e = errors[key];
              const latest = parse(p.latestVersion);
              const min = parse(p.minVersion);
              const summary =
                latest && min && !e.min
                  ? compare(min, latest) === 0
                    ? `Everyone below ${p.minVersion} must update.`
                    : `Below ${p.minVersion}: must update. ${p.minVersion} up to ${p.latestVersion}: optional prompt.`
                  : null;
              return (
                <div
                  key={key}
                  className="p-5 rounded-xl border space-y-4"
                  style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h3>
                    </div>
                    {data && (
                      <a
                        href={data[key].storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {store} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Store version</span>
                      <input
                        value={p.latestVersion}
                        onChange={(ev) => set(key, 'latestVersion', ev.target.value)}
                        placeholder="1.0.3"
                        inputMode="decimal"
                        className="mt-1 w-full px-3 py-2 text-sm rounded-lg border font-mono"
                        style={inputStyle(!!e.latest)}
                      />
                      {e.latest && <span className="text-xs mt-1 block" style={{ color: 'var(--color-danger, #dc2626)' }}>{e.latest}</span>}
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Minimum version</span>
                      <input
                        value={p.minVersion}
                        onChange={(ev) => set(key, 'minVersion', ev.target.value)}
                        placeholder="1.0.0"
                        inputMode="decimal"
                        className="mt-1 w-full px-3 py-2 text-sm rounded-lg border font-mono"
                        style={inputStyle(!!e.min)}
                      />
                      {e.min && <span className="text-xs mt-1 block" style={{ color: 'var(--color-danger, #dc2626)' }}>{e.min}</span>}
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      What&apos;s new <span className="font-normal">(shown in the prompt, optional)</span>
                    </span>
                    <textarea
                      value={p.releaseNotes ?? ''}
                      onChange={(ev) => set(key, 'releaseNotes', ev.target.value)}
                      rows={3}
                      placeholder="e.g. Faster search and a new Deals tab."
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border resize-none"
                      style={inputStyle(!!e.notes)}
                    />
                    <span className="text-xs block text-right" style={{ color: e.notes ? 'var(--color-danger, #dc2626)' : 'var(--text-muted)' }}>
                      {(p.releaseNotes ?? '').length}/{NOTES_MAX}
                    </span>
                  </label>

                  {summary && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface-1, rgba(0,0,0,0.04))', color: 'var(--text-muted)' }}>
                      {summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {data?.updatedAt && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Last changed {new Date(data.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        isLoading={updateMutation.isPending}
        variant="warning"
        title="Raise the minimum version?"
        confirmLabel="Yes, require the update"
        description={
          form
            ? raisedMinimums
                .map(({ key, label }) => `${label}: anyone below ${form[key].minVersion} will be blocked until they update.`)
                .join(' ')
            : undefined
        }
      />
    </div>
  );
}
