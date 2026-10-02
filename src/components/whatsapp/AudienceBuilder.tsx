import { useEffect, useMemo, useState } from 'react';
import { Filter, ListChecks, Save, FolderOpen, Users, Loader2, X, Store } from 'lucide-react';
import { toast } from 'react-toastify';
import type { AudienceFilters, WaAudiencePreview, WaRates } from '../../types';
import { useWaAudienceOptions, useWaAudiencePreview, useWaSegments, useCreateWaSegment } from '../../hooks/useWhatsApp';
import { ProviderPicker, type PickedProvider } from '../ui/ProviderPicker';
import { MultiSelect } from './MultiSelect';
import { Skel } from './Skeleton';
import { ConsentBadge } from './ConsentBadge';
import { formatInr, rateFor, parsePhones, apiErrorMessage, SKIP_REASON_LABEL, INPUT_CLASS, INPUT_STYLE } from './wa-utils';

interface Props {
  value: AudienceFilters;
  onChange: (f: AudienceFilters) => void;
  templateCategory?: 'marketing' | 'utility';
  rates?: WaRates | null;
  onPreview?: (p: WaAudiencePreview | undefined) => void;
  /** Show the Save/Load segment controls. */
  allowSegments?: boolean;
  canSaveSegment?: boolean;
}

const STATUSES: NonNullable<AudienceFilters['statuses']> = ['active', 'unverified', 'suspended', 'disabled'];
const TRUST: NonNullable<AudienceFilters['trustLevels']> = ['unverified', 'basic', 'verified', 'trusted'];

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function AudienceBuilder({
  value,
  onChange,
  templateCategory = 'utility',
  rates,
  onPreview,
  allowSegments = true,
  canSaveSegment = true,
}: Props) {
  const mode = value.mode ?? 'filters';
  const { data: options, isLoading: optsLoading } = useWaAudienceOptions();
  const { data: segments } = useWaSegments();
  const createSegment = useCreateWaSegment();

  const [pickedNames, setPickedNames] = useState<Record<string, string>>({});
  const [phonesText, setPhonesText] = useState((value.phones ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [segName, setSegName] = useState('');
  const [segDesc, setSegDesc] = useState('');

  const debounced = useDebounced(value, 500);
  const previewPayload = useMemo(() => ({ filters: debounced, templateCategory }), [debounced, templateCategory]);
  const { data: preview, isFetching, isError, error } = useWaAudiencePreview(previewPayload, true);

  useEffect(() => { onPreview?.(preview); }, [preview, onPreview]);

  const patch = (p: Partial<AudienceFilters>) => onChange({ ...value, ...p });
  const toggleIn = <K extends 'statuses' | 'trustLevels'>(key: K, item: NonNullable<AudienceFilters[K]>[number]) => {
    const cur = (value[key] ?? []) as string[];
    const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
    patch({ [key]: next } as Partial<AudienceFilters>);
  };
  const num = (key: 'createdWithinDays' | 'createdBeforeDays' | 'inactiveDays' | 'notContactedDays') => ({
    value: value[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
      patch({ [key]: n && n > 0 ? n : undefined });
    },
  });

  const addProvider = (p: PickedProvider | null) => {
    if (!p) return;
    setPickedNames((m) => ({ ...m, [p.id]: p.city ? `${p.name} · ${p.city}` : p.name }));
    const ids = value.providerIds ?? [];
    if (!ids.includes(p.id)) patch({ providerIds: [...ids, p.id] });
  };
  const removeProvider = (id: string) => patch({ providerIds: (value.providerIds ?? []).filter((x) => x !== id) });

  const commitPhones = () => patch({ phones: parsePhones(phonesText) });

  const saveSegment = async () => {
    if (!segName.trim()) { toast.error('Give the segment a name'); return; }
    try {
      await createSegment.mutateAsync({ name: segName.trim(), description: segDesc.trim() || undefined, filters: value });
      toast.success(`Segment “${segName.trim()}” saved`);
      setSaving(false); setSegName(''); setSegDesc('');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save the segment'));
    }
  };

  const loadSegment = (id: string) => {
    const s = segments?.find((x) => x.id === id);
    if (!s) return;
    onChange({ ...s.filters });
    setPhonesText((s.filters.phones ?? []).join('\n'));
    toast.info(`Loaded segment “${s.name}”`);
  };

  const utilityCost = (preview?.sendable ?? 0) * rateFor('utility', rates);
  const marketingCost = (preview?.sendable ?? 0) * rateFor('marketing', rates);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      {/* ── Filters panel ── */}
      <div className="card p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {([
              { v: 'filters', label: 'Filters', icon: Filter },
              { v: 'manual', label: 'Manual', icon: ListChecks },
            ] as const).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => patch({ mode: t.v })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                style={{
                  background: mode === t.v ? 'var(--surface-0)' : 'transparent',
                  color: mode === t.v ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: mode === t.v ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {allowSegments && (
            <div className="flex items-center gap-2">
              {!!segments?.length && (
                <div className="relative">
                  <FolderOpen className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <select
                    value=""
                    onChange={(e) => loadSegment(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg focus-ring"
                    style={INPUT_STYLE}
                  >
                    <option value="">Load segment…</option>
                    {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {canSaveSegment && (
                <button
                  type="button"
                  onClick={() => setSaving((s) => !s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                >
                  <Save className="w-3.5 h-3.5" /> Save as segment
                </button>
              )}
            </div>
          )}
        </div>

        {saving && (
          <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg animate-fade-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
            <input value={segName} onChange={(e) => setSegName(e.target.value)} placeholder="Segment name" className={INPUT_CLASS} style={INPUT_STYLE} />
            <input value={segDesc} onChange={(e) => setSegDesc(e.target.value)} placeholder="Description (optional)" className={INPUT_CLASS} style={INPUT_STYLE} />
            <button type="button" onClick={saveSegment} disabled={createSegment.isPending} className="px-3 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 shrink-0" style={{ background: 'var(--color-primary)' }}>
              {createSegment.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {mode === 'filters' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Cities">
                {optsLoading ? <Skel className="h-[38px]" /> : (
                  <MultiSelect
                    options={(options?.cities ?? []).map((c) => ({ value: c, label: c }))}
                    value={value.cities ?? []}
                    onChange={(cities) => patch({ cities: cities.length ? cities : undefined })}
                    placeholder="Any city"
                  />
                )}
              </Field>
              <Field label="Categories">
                {optsLoading ? <Skel className="h-[38px]" /> : (
                  <MultiSelect
                    options={(options?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    value={value.categoryIds ?? []}
                    onChange={(ids) => patch({ categoryIds: ids.length ? ids : undefined })}
                    placeholder="Any category"
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Listing status" hint="Default: active + unverified">
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => <Chip key={s} on={(value.statuses ?? []).includes(s)} onClick={() => toggleIn('statuses', s)}>{s}</Chip>)}
                </div>
              </Field>
              <Field label="Trust level">
                <div className="flex flex-wrap gap-1.5">
                  {TRUST.map((s) => <Chip key={s} on={(value.trustLevels ?? []).includes(s)} onClick={() => toggleIn('trustLevels', s)}>{s}</Chip>)}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Verification">
                <select
                  value={value.verification ?? ''}
                  onChange={(e) => patch({ verification: (e.target.value || undefined) as AudienceFilters['verification'] })}
                  className={INPUT_CLASS} style={INPUT_STYLE}
                >
                  <option value="">Any</option>
                  <option value="none">Never applied</option>
                  <option value="pending">Pending</option>
                  <option value="in_review">In review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Field>
              <Field label="Consent" hint="Opted-out contacts never get marketing">
                <select
                  value={value.consent ?? 'not_opted_out'}
                  onChange={(e) => patch({ consent: e.target.value as AudienceFilters['consent'] })}
                  className={INPUT_CLASS} style={INPUT_STYLE}
                >
                  <option value="not_opted_out">Not opted out</option>
                  <option value="opted_in">Opted in only</option>
                  <option value="any">Any</option>
                </select>
              </Field>
              <Field label="Reachability">
                <Toggle on={value.reachableOnly !== false} onClick={() => patch({ reachableOnly: value.reachableOnly === false ? true : false })} label="Skip numbers not on WhatsApp" />
              </Field>
            </div>

            <Field label="Profile flags">
              <div className="flex flex-wrap gap-2">
                <Toggle on={!!value.womenLed} onClick={() => patch({ womenLed: value.womenLed ? undefined : true })} label="Women-led" />
                <Toggle on={!!value.isFeatured} onClick={() => patch({ isFeatured: value.isFeatured ? undefined : true })} label="Featured" />
                <Toggle on={!!value.missingLogo} onClick={() => patch({ missingLogo: value.missingLogo ? undefined : true })} label="Missing logo" />
                <Toggle on={!!value.missingProducts} onClick={() => patch({ missingProducts: value.missingProducts ? undefined : true })} label="No products" />
                <Toggle on={value.locationPrecision === 'approximate'} onClick={() => patch({ locationPrecision: value.locationPrecision === 'approximate' ? undefined : 'approximate' })} label="Location not set" />
              </div>
            </Field>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Joined within (days)"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 30" {...num('createdWithinDays')} /></Field>
              <Field label="Joined before (days)"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 90" {...num('createdBeforeDays')} /></Field>
              <Field label="Inactive for (days)" hint="No app activity"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 14" {...num('inactiveDays')} /></Field>
              <Field label="Not contacted (days)" hint="No WhatsApp from us"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 7" {...num('notContactedDays')} /></Field>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Pick businesses" hint="Search by name; each pick is added to the list">
              <ProviderPicker value={null} onChange={addProvider} placeholder="Search a business…" />
              <div className="flex flex-col gap-1.5 mt-2 max-h-56 overflow-y-auto">
                {(value.providerIds ?? []).length === 0 ? (
                  <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No businesses picked yet.</p>
                ) : (
                  (value.providerIds ?? []).map((id) => (
                    <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm" style={{ background: 'var(--surface-1)' }}>
                      <Store className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{pickedNames[id] ?? `${id.slice(0, 8)}…`}</span>
                      <button type="button" onClick={() => removeProvider(id)} aria-label="Remove" style={{ color: 'var(--text-muted)' }}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
                )}
              </div>
            </Field>
            <Field label="Paste phone numbers" hint="One per line or comma-separated; 10-digit numbers get +91. Contacts are created without a business.">
              <textarea
                value={phonesText}
                onChange={(e) => setPhonesText(e.target.value)}
                onBlur={commitPhones}
                rows={8}
                placeholder={'+919876543210\n9876543211'}
                className={`${INPUT_CLASS} font-mono`}
                style={{ ...INPUT_STYLE, resize: 'vertical' }}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{(value.phones ?? []).length} valid numbers</p>
            </Field>
          </div>
        )}
      </div>

      {/* ── Live count card ── */}
      <aside className="card p-5 xl:sticky xl:top-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Audience</p>
          {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />}
        </div>

        {isError ? (
          <p className="text-xs p-3 rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
            {apiErrorMessage(error, 'Could not count the audience')}
          </p>
        ) : !preview ? (
          <div className="flex flex-col gap-3">
            <Skel className="h-10 w-28" />
            <Skel className="h-3 w-40" />
            <Skel className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>{preview.sendable.toLocaleString('en-IN')}</span>
                <span className="text-sm pb-1" style={{ color: 'var(--text-muted)' }}>sendable</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <Users className="w-3 h-3 inline mr-1 -mt-0.5" />{preview.total.toLocaleString('en-IN')} matched · {(preview.total - preview.sendable).toLocaleString('en-IN')} will be skipped
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {(Object.entries(preview.skipped) as [keyof typeof preview.skipped, number][]).map(([k, n]) => (
                <div key={k} className="flex items-center justify-between text-xs" style={{ color: n > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: n > 0 ? 1 : 0.6 }}>
                  <span>{SKIP_REASON_LABEL[k]}</span>
                  <span className="tabular-nums font-medium">{n}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3 flex flex-col gap-1.5" style={{ background: 'var(--surface-1)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Estimated cost (before 18% GST)</p>
              <CostRow label="Utility" value={preview.estimatedCost?.utility ?? utilityCost} active={templateCategory === 'utility'} />
              <CostRow label="Marketing" value={preview.estimatedCost?.marketing ?? marketingCost} active={templateCategory === 'marketing'} />
            </div>

            {preview.sample.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Sample recipients</p>
                <ul className="flex flex-col gap-1">
                  {preview.sample.slice(0, 10).map((s) => (
                    <li key={s.providerId + s.phone} className="flex items-center gap-2 text-xs">
                      <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{s.brandName}</span>
                      <span className="truncate" style={{ color: 'var(--text-muted)' }}>{s.city ?? ''}</span>
                      <ConsentBadge consent={s.consent} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors"
      style={{
        background: on ? 'var(--color-primary)' : 'var(--surface-1)',
        color: on ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}`,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
    >
      <span className="relative inline-block w-7 h-4 rounded-full transition-colors" style={{ background: on ? 'var(--color-primary)' : 'var(--surface-3)' }}>
        <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform" style={{ left: 2, transform: on ? 'translateX(12px)' : 'translateX(0)' }} />
      </span>
      {label}
    </button>
  );
}

function CostRow({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
        {active && <span className="px-1.5 py-px rounded text-[9px] font-bold uppercase" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>chosen</span>}
      </span>
      <span className="tabular-nums font-semibold" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{formatInr(value)}</span>
    </div>
  );
}

export default AudienceBuilder;
