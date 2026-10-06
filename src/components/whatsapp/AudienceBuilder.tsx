import { useEffect, useMemo, useState } from 'react';
import {
  Filter, ListChecks, Save, FolderOpen, Users, Loader2, X, Store, User, Phone, ChevronDown,
  MapPin, Activity, MessageCircle, PlusCircle, MinusCircle, Gauge, Eye,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { AudienceFilters, WaAudiencePreview, WaAudienceType, WaRates, WaRecipientRow, WaYesNo } from '../../types';
import { useWaAudienceOptions, useWaAudiencePreview, useWaSegments, useCreateWaSegment } from '../../hooks/useWhatsApp';
import { ProviderPicker, type PickedProvider } from '../ui/ProviderPicker';
import { CustomerPicker } from './CustomerPicker';
import { RecipientsDialog } from './RecipientsDialog';
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
const TYPES: { v: WaAudienceType; label: string; hint: string; icon: typeof Store }[] = [
  { v: 'businesses', label: 'Businesses', hint: 'Business owners listed on Tijarah', icon: Store },
  { v: 'customers', label: 'App customers', hint: 'People who use Tijarah to find businesses', icon: User },
  { v: 'both', label: 'Both', hint: 'Businesses and customers together', icon: Users },
];

type NumKey = 'createdWithinDays' | 'createdBeforeDays' | 'inactiveDays' | 'activeWithinDays' | 'notContactedDays' | 'minProducts' | 'maxProducts' | 'maxRecipients';

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const countSet = (...vals: unknown[]) => vals.filter((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '' && v !== false)).length;

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
  const type = value.audienceType ?? 'businesses';
  const showBusiness = type !== 'customers';
  const showCustomer = type !== 'businesses';
  const { data: options, isLoading: optsLoading } = useWaAudienceOptions();
  const { data: segments } = useWaSegments();
  const createSegment = useCreateWaSegment();

  // Names for picked / excluded people, so lists never show bare ids.
  const [names, setNames] = useState<Record<string, string>>({});
  const remember = (id: string, label: string) => setNames((m) => (m[id] === label ? m : { ...m, [id]: label }));
  const [phonesText, setPhonesText] = useState((value.phones ?? []).join('\n'));
  const [excludePhonesText, setExcludePhonesText] = useState((value.excludePhones ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [segName, setSegName] = useState('');
  const [segDesc, setSegDesc] = useState('');
  const [listOpen, setListOpen] = useState(false);

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
  const num = (key: NumKey, { allowZero = false } = {}) => ({
    value: value[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value === '') { patch({ [key]: undefined }); return; }
      const n = Math.max(0, Math.floor(Number(e.target.value)));
      patch({ [key]: allowZero ? n : n > 0 ? n : undefined });
    },
  });
  const listPatch = (key: keyof AudienceFilters) => (ids: string[]) => patch({ [key]: ids.length ? ids : undefined } as Partial<AudienceFilters>);

  // ── Picks and exclusions ──
  const addTo = (key: 'providerIds' | 'customerIds' | 'excludeProviderIds' | 'excludeCustomerIds', id: string) => {
    const ids = value[key] ?? [];
    if (!ids.includes(id)) patch({ [key]: [...ids, id] });
  };
  const removeFrom = (key: 'providerIds' | 'customerIds' | 'excludeProviderIds' | 'excludeCustomerIds', id: string) => {
    const next = (value[key] ?? []).filter((x) => x !== id);
    patch({ [key]: next.length ? next : undefined });
  };
  const pickBusiness = (key: 'providerIds' | 'excludeProviderIds') => (p: PickedProvider | null) => {
    if (!p) return;
    remember(p.id, p.city ? `${p.name} · ${p.city}` : p.name);
    addTo(key, p.id);
  };
  const excludeRow = (r: WaRecipientRow) => {
    if (r.kind === 'business' && r.providerId) {
      remember(r.providerId, r.city ? `${r.name} · ${r.city}` : r.name);
      patch({ excludeProviderIds: [...new Set([...(value.excludeProviderIds ?? []), r.providerId])], providerIds: value.providerIds?.filter((x) => x !== r.providerId) });
    } else if (r.kind === 'customer' && r.userId) {
      remember(r.userId, r.city ? `${r.name} · ${r.city}` : r.name);
      patch({ excludeCustomerIds: [...new Set([...(value.excludeCustomerIds ?? []), r.userId])], customerIds: value.customerIds?.filter((x) => x !== r.userId) });
    } else if (r.phone) {
      const next = [...new Set([...(value.excludePhones ?? []), r.phone])];
      setExcludePhonesText(next.join('\n'));
      patch({ excludePhones: next, phones: value.phones?.filter((x) => x !== r.phone) });
    }
    toast.success(`${r.name} won't get this message`);
  };

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
    setExcludePhonesText((s.filters.excludePhones ?? []).join('\n'));
    toast.info(`Loaded segment “${s.name}”`);
  };

  // Areas within the chosen cities (or all, when no city is chosen).
  const areaOptions = useMemo(() => {
    const cities = (value.cities ?? []).map((c) => c.toLowerCase());
    const seen = new Set<string>();
    return (options?.areas ?? [])
      .filter((a) => !cities.length || cities.includes(a.city.toLowerCase()))
      .filter((a) => { const k = a.area.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .map((a) => ({ value: a.area, label: cities.length === 1 ? a.area : `${a.area} · ${a.city}` }));
  }, [options?.areas, value.cities]);
  const campaignOptions = (options?.campaigns ?? []).map((c) => ({ value: c.id, label: c.name }));

  const utilityCost = (preview?.sendable ?? 0) * rateFor('utility', rates);
  const marketingCost = (preview?.sendable ?? 0) * rateFor('marketing', rates);

  const pickedCount = (value.providerIds?.length ?? 0) + (value.customerIds?.length ?? 0) + (value.phones?.length ?? 0);
  const excludedCount = (value.excludeProviderIds?.length ?? 0) + (value.excludeCustomerIds?.length ?? 0) + (value.excludePhones?.length ?? 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      {/* ── Filters panel ── */}
      <div className="card p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {([
              { v: 'filters', label: 'Filters', icon: Filter },
              { v: 'manual', label: 'Pick manually', icon: ListChecks },
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
                  <select value="" onChange={(e) => loadSegment(e.target.value)} className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg focus-ring" style={INPUT_STYLE}>
                    <option value="">Load segment…</option>
                    {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {canSaveSegment && (
                <button type="button" onClick={() => setSaving((s) => !s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
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
            {/* Who */}
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Who should the filters find?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TYPES.map((t) => {
                  const on = type === t.v;
                  return (
                    <button key={t.v} type="button" onClick={() => patch({ audienceType: t.v })} className="text-left p-3 rounded-xl transition-colors"
                      style={{ background: on ? 'var(--color-primary-light)' : 'var(--surface-1)', border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}` }}>
                      <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: on ? 'var(--color-primary)' : 'var(--text-primary)' }}><t.icon className="w-4 h-4" />{t.label}</span>
                      <span className="block text-[11px] mt-0.5" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)', opacity: on ? 0.8 : 1 }}>{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Section icon={MapPin} title="Location" active={countSet(value.cities, value.areas)} defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Cities">
                  {optsLoading ? <Skel className="h-[38px]" /> : (
                    <MultiSelect options={(options?.cities ?? []).map((c) => ({ value: c, label: c }))} value={value.cities ?? []} onChange={listPatch('cities')} placeholder="Any city" />
                  )}
                </Field>
                <Field label="Areas" hint={value.cities?.length ? 'Within the chosen cities' : 'Pick a city first to narrow the list'}>
                  {optsLoading ? <Skel className="h-[38px]" /> : (
                    <MultiSelect options={areaOptions} value={value.areas ?? []} onChange={listPatch('areas')} placeholder="Any area" />
                  )}
                </Field>
              </div>
            </Section>

            {showBusiness && (
              <Section icon={Store} title="Business profile" hint={type === 'both' ? 'Applies to businesses only' : undefined}
                active={countSet(value.categoryIds, value.statuses, value.trustLevels, value.verification, value.ownerSignedIn, value.paidPlan, value.googleLinked, value.minRating, value.minProducts, value.maxProducts, value.womenLed, value.isFeatured, value.missingLogo, value.missingProducts, value.locationPrecision)}
                defaultOpen>
                <div className="flex flex-col gap-4">
                  <Field label="Categories" hint={type === 'both' ? 'Businesses in these categories; customers interested in them' : undefined}>
                    {optsLoading ? <Skel className="h-[38px]" /> : (
                      <MultiSelect options={(options?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))} value={value.categoryIds ?? []} onChange={listPatch('categoryIds')} placeholder="Any category" />
                    )}
                  </Field>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Owner uses the app?" hint="“Never opened” = added by us, never signed in">
                      <YesNoSelect value={value.ownerSignedIn} onChange={(v) => patch({ ownerSignedIn: v })} yes="Has signed in" no="Never opened the app" />
                    </Field>
                    <Field label="Verification">
                      <select value={value.verification ?? ''} onChange={(e) => patch({ verification: (e.target.value || undefined) as AudienceFilters['verification'] })} className={INPUT_CLASS} style={INPUT_STYLE}>
                        <option value="">Any</option>
                        <option value="none">Never applied</option>
                        <option value="pending">Pending</option>
                        <option value="in_review">In review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </Field>
                    <Field label="Plan">
                      <YesNoSelect value={value.paidPlan} onChange={(v) => patch({ paidPlan: v })} yes="Paid plan" no="Free" />
                    </Field>
                    <Field label="Google reviews">
                      <YesNoSelect value={value.googleLinked} onChange={(v) => patch({ googleLinked: v })} yes="Google linked" no="Not linked" />
                    </Field>
                    <Field label="Rating at least">
                      <select value={value.minRating ?? ''} onChange={(e) => patch({ minRating: e.target.value ? Number(e.target.value) : undefined })} className={INPUT_CLASS} style={INPUT_STYLE}>
                        <option value="">Any</option>
                        {[3, 3.5, 4, 4.5].map((r) => <option key={r} value={r}>★ {r}+</option>)}
                      </select>
                    </Field>
                    <Field label="Products (active)">
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} placeholder="Min" className={INPUT_CLASS} style={INPUT_STYLE} {...num('minProducts', { allowZero: true })} />
                        <span style={{ color: 'var(--text-muted)' }}>–</span>
                        <input type="number" min={0} placeholder="Max" className={INPUT_CLASS} style={INPUT_STYLE} {...num('maxProducts', { allowZero: true })} />
                      </div>
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
                </div>
              </Section>
            )}

            {showCustomer && (
              <Section icon={User} title="Customers" hint={type === 'both' ? 'Applies to customers only' : undefined}
                active={countSet(type === 'customers' ? value.categoryIds : undefined, value.customerSignedInOnly === false)} defaultOpen>
                <div className="flex flex-col gap-4">
                  {type === 'customers' && (
                    <Field label="Interested in" hint="Categories they picked as favourites in the app">
                      {optsLoading ? <Skel className="h-[38px]" /> : (
                        <MultiSelect options={(options?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))} value={value.categoryIds ?? []} onChange={listPatch('categoryIds')} placeholder="Any category" />
                      )}
                    </Field>
                  )}
                  <Toggle
                    on={value.customerSignedInOnly !== false}
                    onClick={() => patch({ customerSignedInOnly: value.customerSignedInOnly === false ? undefined : false })}
                    label="Only people who signed up themselves (skip accounts we created)"
                  />
                </div>
              </Section>
            )}

            <Section icon={Activity} title="Joined & activity" active={countSet(value.createdWithinDays, value.createdBeforeDays, value.activeWithinDays, value.inactiveDays)}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Joined within (days)"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 30" {...num('createdWithinDays')} /></Field>
                <Field label="Joined before (days)"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 90" {...num('createdBeforeDays')} /></Field>
                <Field label="Active within (days)" hint="Used the app recently"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 7" {...num('activeWithinDays')} /></Field>
                <Field label="Inactive for (days)" hint="No app activity"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 14" {...num('inactiveDays')} /></Field>
              </div>
            </Section>

            <Section icon={MessageCircle} title="WhatsApp history & consent"
              active={countSet(value.everContacted, value.repliedEver, value.notContactedDays, value.receivedCampaignIds, value.notReceivedCampaignIds, value.contactTags, value.consent && value.consent !== 'not_opted_out', value.reachableOnly === false)}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Messaged by us before?">
                    <YesNoSelect value={value.everContacted} onChange={(v) => patch({ everContacted: v })} yes="Yes" no="Never" />
                  </Field>
                  <Field label="Replied to us before?">
                    <YesNoSelect value={value.repliedEver} onChange={(v) => patch({ repliedEver: v })} yes="Has replied" no="Never replied" />
                  </Field>
                  <Field label="Not messaged in (days)"><input type="number" min={0} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 7" {...num('notContactedDays')} /></Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Got any of these campaigns">
                    <MultiSelect options={campaignOptions} value={value.receivedCampaignIds ?? []} onChange={listPatch('receivedCampaignIds')} placeholder="Any" />
                  </Field>
                  <Field label="Did NOT get these campaigns" hint="e.g. follow up with everyone who missed one">
                    <MultiSelect options={campaignOptions} value={value.notReceivedCampaignIds ?? []} onChange={listPatch('notReceivedCampaignIds')} placeholder="None" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Contact tags" hint="Tags set in Audience → Contacts">
                    <MultiSelect options={(options?.tags ?? []).map((t) => ({ value: t, label: t }))} value={value.contactTags ?? []} onChange={listPatch('contactTags')} placeholder="Any tag" />
                  </Field>
                  <Field label="Consent" hint="Opted-out contacts never get marketing">
                    <select value={value.consent ?? 'not_opted_out'} onChange={(e) => patch({ consent: e.target.value as AudienceFilters['consent'] })} className={INPUT_CLASS} style={INPUT_STYLE}>
                      <option value="not_opted_out">Not opted out</option>
                      <option value="opted_in">Opted in only</option>
                      <option value="any">Any</option>
                    </select>
                  </Field>
                  <Field label="Reachability">
                    <Toggle on={value.reachableOnly !== false} onClick={() => patch({ reachableOnly: value.reachableOnly === false ? true : false })} label="Skip numbers not on WhatsApp" />
                  </Field>
                </div>
              </div>
            </Section>
          </>
        ) : (
          <p className="text-xs -mb-2" style={{ color: 'var(--text-muted)' }}>Only the businesses, customers and numbers you add below will get this message.</p>
        )}

        <Section icon={PlusCircle} title={mode === 'manual' ? 'Recipients' : 'Always include'} hint={mode === 'filters' ? 'Added on top of the filter results' : undefined} active={pickedCount} defaultOpen={mode === 'manual' || pickedCount > 0}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Businesses">
              <ProviderPicker value={null} onChange={pickBusiness('providerIds')} placeholder="Search a business…" />
              <PickList ids={value.providerIds} names={names} icon={Store} fallback="Business" onRemove={(id) => removeFrom('providerIds', id)} />
            </Field>
            <Field label="Customers">
              <CustomerPicker onPick={(c) => { remember(c.id, c.city ? `${c.name} · ${c.city}` : c.name); addTo('customerIds', c.id); }} />
              <PickList ids={value.customerIds} names={names} icon={User} fallback="Customer" onRemove={(id) => removeFrom('customerIds', id)} />
            </Field>
            <Field label="Phone numbers" hint="One per line or comma-separated; 10-digit numbers get +91">
              <textarea value={phonesText} onChange={(e) => setPhonesText(e.target.value)} onBlur={() => patch({ phones: parsePhones(phonesText) })} rows={5} placeholder={'+919876543210\n9876543211'} className={`${INPUT_CLASS} font-mono`} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{(value.phones ?? []).length} valid numbers</p>
            </Field>
          </div>
        </Section>

        <Section icon={MinusCircle} title="Never send to" hint="Removed even if a filter or pick matches them" active={excludedCount} defaultOpen={excludedCount > 0}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Businesses">
              <ProviderPicker value={null} onChange={pickBusiness('excludeProviderIds')} placeholder="Search a business…" />
              <PickList ids={value.excludeProviderIds} names={names} icon={Store} fallback="Business" onRemove={(id) => removeFrom('excludeProviderIds', id)} />
            </Field>
            <Field label="Customers">
              <CustomerPicker onPick={(c) => { remember(c.id, c.city ? `${c.name} · ${c.city}` : c.name); addTo('excludeCustomerIds', c.id); }} />
              <PickList ids={value.excludeCustomerIds} names={names} icon={User} fallback="Customer" onRemove={(id) => removeFrom('excludeCustomerIds', id)} />
            </Field>
            <Field label="Phone numbers">
              <textarea value={excludePhonesText} onChange={(e) => setExcludePhonesText(e.target.value)} onBlur={() => { const p = parsePhones(excludePhonesText); patch({ excludePhones: p.length ? p : undefined }); }} rows={5} placeholder={'Numbers to leave out'} className={`${INPUT_CLASS} font-mono`} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{(value.excludePhones ?? []).length} numbers excluded</p>
            </Field>
          </div>
        </Section>

        <Section icon={Gauge} title="Batch size" hint="Test on a small group before everyone" active={countSet(value.maxRecipients)} defaultOpen={!!value.maxRecipients}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Send to at most" hint="Leave empty for everyone who matches">
              <input type="number" min={1} className={INPUT_CLASS} style={INPUT_STYLE} placeholder="e.g. 50" {...num('maxRecipients')} />
            </Field>
            <Field label="Who goes first">
              <select
                value={value.order ?? 'oldest'}
                onChange={(e) => {
                  const order = e.target.value as NonNullable<AudienceFilters['order']>;
                  patch({ order, randomSeed: order === 'random' ? (value.randomSeed ?? Math.random().toString(36).slice(2, 10)) : undefined });
                }}
                className={INPUT_CLASS} style={INPUT_STYLE}
              >
                <option value="oldest">Longest on Tijarah first</option>
                <option value="newest">Newest first</option>
                <option value="random">Random sample</option>
              </select>
            </Field>
          </div>
        </Section>
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
                <span className="text-sm pb-1" style={{ color: 'var(--text-muted)' }}>will receive</span>
              </div>
              {preview.byKind && (
                <p className="text-xs mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {preview.byKind.business > 0 && <span><Store className="w-3 h-3 inline -mt-0.5 mr-0.5" />{preview.byKind.business.toLocaleString('en-IN')} businesses</span>}
                  {preview.byKind.customer > 0 && <span><User className="w-3 h-3 inline -mt-0.5 mr-0.5" />{preview.byKind.customer.toLocaleString('en-IN')} customers</span>}
                  {preview.byKind.number > 0 && <span><Phone className="w-3 h-3 inline -mt-0.5 mr-0.5" />{preview.byKind.number.toLocaleString('en-IN')} numbers</span>}
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <Users className="w-3 h-3 inline mr-1 -mt-0.5" />{preview.total.toLocaleString('en-IN')} matched · {(preview.total - preview.sendable).toLocaleString('en-IN')} will be skipped
              </p>
              {preview.limitedFrom != null && (
                <p className="text-xs mt-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  Batch of {preview.sendable.toLocaleString('en-IN')} out of {preview.limitedFrom.toLocaleString('en-IN')} who could receive it
                </p>
              )}
            </div>

            <button type="button" onClick={() => setListOpen(true)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
              <Eye className="w-3.5 h-3.5" /> View all recipients · exclude · export
            </button>

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
                  {preview.sample.slice(0, 10).map((s) => {
                    const Icon = s.kind === 'customer' ? User : s.kind === 'number' ? Phone : Store;
                    return (
                      <li key={`${s.providerId}-${s.userId}-${s.phone}`} className="flex items-center gap-2 text-xs">
                        <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{s.name ?? s.brandName ?? s.phone}</span>
                        <span className="truncate" style={{ color: 'var(--text-muted)' }}>{s.city ?? ''}</span>
                        <ConsentBadge consent={s.consent} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>

      <RecipientsDialog open={listOpen} onClose={() => setListOpen(false)} filters={value} templateCategory={templateCategory} onExclude={excludeRow} />
    </div>
  );
}

function Section({ icon: Icon, title, hint, active = 0, defaultOpen = false, children }: {
  icon: typeof Store;
  title: string;
  hint?: string;
  active?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || active > 0);
  return (
    <div className="rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left">
        <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        {active > 0 && <span className="px-1.5 py-px rounded-full text-[10px] font-bold tabular-nums" style={{ background: 'var(--color-primary)', color: '#fff' }}>{active}</span>}
        {hint && <span className="text-[11px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
        <ChevronDown className="w-4 h-4 ml-auto transition-transform" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function PickList({ ids, names, icon: Icon, fallback, onRemove }: {
  ids: string[] | undefined;
  names: Record<string, string>;
  icon: typeof Store;
  fallback: string;
  onRemove: (id: string) => void;
}) {
  if (!ids?.length) return <p className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>None yet.</p>;
  return (
    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
      {ids.map((id) => (
        <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm" style={{ background: 'var(--surface-1)' }}>
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{names[id] ?? `${fallback} ${id.slice(0, 8)}…`}</span>
          <button type="button" onClick={() => onRemove(id)} aria-label="Remove" style={{ color: 'var(--text-muted)' }}><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

function YesNoSelect({ value, onChange, yes, no }: { value: WaYesNo | undefined; onChange: (v: WaYesNo | undefined) => void; yes: string; no: string }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as WaYesNo | undefined)} className={INPUT_CLASS} style={INPUT_STYLE}>
      <option value="">Any</option>
      <option value="yes">{yes}</option>
      <option value="no">{no}</option>
    </select>
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
      className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
    >
      <span className="relative inline-block w-7 h-4 rounded-full transition-colors shrink-0" style={{ background: on ? 'var(--color-primary)' : 'var(--surface-3)' }}>
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
