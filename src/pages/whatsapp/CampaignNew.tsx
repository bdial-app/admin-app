import { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Users, FileText, CalendarClock, ClipboardCheck, ChevronLeft, ChevronRight, Save, Send, Loader2,
  FlaskConical, AlertTriangle, Check, Clock, Zap,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useHasPermission } from '../../hooks/usePermissions';
import {
  useWaCampaign, useWaTemplates, useWaSettings, useCreateWaCampaign, useUpdateWaCampaign,
  useSendWaCampaign, useWaCampaignTestSend,
} from '../../hooks/useWhatsApp';
import { AudienceBuilder } from '../../components/whatsapp/AudienceBuilder';
import { TemplatePicker } from '../../components/whatsapp/TemplatePicker';
import { VariableMappingTable } from '../../components/whatsapp/VariableMappingTable';
import { WaPhonePreview } from '../../components/whatsapp/WaPhonePreview';
import { CostHint } from '../../components/whatsapp/CostHint';
import { Skel } from '../../components/whatsapp/Skeleton';
import { useNow } from '../../components/whatsapp/useNow';
import { API_BASE_URL } from '../../utils/constants';
import {
  WA_ROUTES, DEFAULT_AUDIENCE, GST_RATE, formatInr, rateFor, getHeader, getBody, getButtons, extractVariableIndexes,
  resolveMappingValues, resolveSourceValue, summarizeFilters, apiErrorMessage, toLocalInputValue, estimateMinutes, humanMinutes,
  VARIABLE_SOURCES, CATEGORY_LABEL, INPUT_CLASS, INPUT_STYLE,
} from '../../components/whatsapp/wa-utils';
import type {
  AudienceFilters, WaAudiencePreview, WaCampaign, WaCampaignPayload, WaTemplate, WaVariableMapping, WaButtonUrlParams, VariableSource, WaHeaderMediaSource,
} from '../../types';

/** Variable sources a customer (no business) has no value for. */
const BUSINESS_ONLY = new Set<string | undefined>(['brand_name', 'category', 'profile_url', 'products_count', 'visits_7d', 'enquiries_7d']);

// ── Form state ────────────────────────────────────────────
interface FormState {
  name: string;
  audience: AudienceFilters;
  templateId: string | null;
  variableMapping: WaVariableMapping;
  headerMediaUrl: string;
  headerMediaSource: WaHeaderMediaSource;
  buttonUrlParams: WaButtonUrlParams;
  schedule: 'now' | 'later';
  scheduledAt: string;
  ratePerMinute: number;
}

interface RouteState {
  audience?: AudienceFilters;
  name?: string;
  templateId?: string;
}

const STEPS = [
  { key: 'audience', label: 'Audience', icon: Users },
  { key: 'message', label: 'Message', icon: FileText },
  { key: 'schedule', label: 'Schedule', icon: CalendarClock },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
] as const;

const defaultSchedule = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
};

export default function CampaignNew() {
  const { id } = useParams<{ id: string }>();
  const canSend = useHasPermission('whatsapp.send');
  const navigate = useNavigate();
  const { data: campaign, isLoading, isError } = useWaCampaign(id);
  const { data: settings, isLoading: settingsLoading } = useWaSettings();

  if (!canSend) {
    return <EmptyState icon={AlertTriangle} title="Admins only" description="Creating and sending campaigns needs the admin role." action={{ label: 'Back to campaigns', onClick: () => navigate(WA_ROUTES.campaigns) }} />;
  }
  if ((id && isLoading) || settingsLoading) {
    return <div className="space-y-4"><Skel className="h-14 w-full" /><Skel className="h-96 w-full" /></div>;
  }
  if (id && (isError || !campaign)) {
    return <EmptyState title="Campaign not found" action={{ label: 'Back to campaigns', onClick: () => navigate(WA_ROUTES.campaigns) }} />;
  }
  if (campaign && campaign.status !== 'draft') {
    return <EmptyState icon={AlertTriangle} title="Only drafts can be edited" description={`This campaign is ${campaign.status}. Duplicate it from the detail page to make changes.`} action={{ label: 'Open campaign', onClick: () => navigate(WA_ROUTES.campaign(campaign.id)) }} />;
  }
  return <CampaignWizard key={campaign?.id ?? 'new'} existing={campaign ?? null} defaultRate={settings?.ratePerMinute ?? 60} />;
}

function CampaignWizard({ existing, defaultRate }: { existing: WaCampaign | null; defaultRate: number }) {
  const navigate = useNavigate();
  const routeState = (useLocation().state ?? {}) as RouteState;
  const { data: settings } = useWaSettings();
  const { data: templates = [], isLoading: templatesLoading } = useWaTemplates({ status: 'approved' });
  const createMut = useCreateWaCampaign();
  const updateMut = useUpdateWaCampaign();
  const sendMut = useSendWaCampaign();
  const testMut = useWaCampaignTestSend();

  const [step, setStep] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);
  const [preview, setPreview] = useState<WaAudiencePreview | undefined>(undefined);
  const [hovered, setHovered] = useState<WaTemplate | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [confirm, setConfirm] = useState(false);

  const now = useNow(30_000);
  const [form, setForm] = useState<FormState>(() => ({
    name: existing?.name ?? routeState.name ?? '',
    audience: existing?.audience ?? routeState.audience ?? { ...DEFAULT_AUDIENCE },
    templateId: existing?.template.id ?? routeState.templateId ?? null,
    variableMapping: existing?.variableMapping ?? {},
    headerMediaUrl: existing?.headerMediaUrl ?? '',
    // New campaigns greet each business with its own logo.
    headerMediaSource: existing?.headerMediaSource ?? 'provider_logo',
    buttonUrlParams: existing?.buttonUrlParams ?? {},
    schedule: existing?.scheduledAt ? 'later' : 'now',
    scheduledAt: existing?.scheduledAt ? toLocalInputValue(new Date(existing.scheduledAt)) : defaultSchedule(),
    ratePerMinute: existing?.ratePerMinute ?? defaultRate,
  }));
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const onPreview = useCallback((p: WaAudiencePreview | undefined) => setPreview(p), []);

  const template = useMemo(() => templates.find((t) => t.id === form.templateId) ?? null, [templates, form.templateId]);
  const previewTemplate = hovered ?? template;
  const category = template?.category ?? 'utility';
  const templateCategory: 'marketing' | 'utility' = category === 'marketing' ? 'marketing' : 'utility';
  const header = getHeader(template?.components);
  const urlButtons = getButtons(template?.components)
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.type === 'URL' && /\{\{\s*1\s*\}\}/.test(b.url));
  const indexes = extractVariableIndexes(getBody(template?.components)?.text ?? '');
  const sample = preview?.sample?.[0] ?? null;
  // The same card WhatsApp will fetch for the sample business.
  const headerPreviewUrl =
    form.headerMediaSource === 'provider_logo'
      ? `${API_BASE_URL.replace(/\/+$/, '')}/whatsapp/media/logo-card/${sample?.providerId ?? 'tijarah'}.jpg`
      : form.headerMediaUrl || undefined;

  // Full mapping: user choices over template defaults, so the payload always covers every {{n}}.
  const fullMapping: WaVariableMapping = useMemo(() => {
    const out: WaVariableMapping = {};
    for (const i of indexes) {
      const k = String(i);
      const def = template?.variables.find((v) => v.index === i);
      out[k] = form.variableMapping[k] ?? { source: def?.source ?? 'custom', value: def?.source === 'custom' ? def?.sample : undefined };
    }
    return out;
  }, [indexes, template, form.variableMapping]);

  const previewValues = resolveMappingValues(previewTemplate, previewTemplate === template ? fullMapping : {}, sample);
  const buttonValues: Record<string, string> = {};
  for (const { i } of urlButtons) {
    const e = form.buttonUrlParams[String(i)];
    buttonValues[String(i)] = e ? resolveSourceValue(e.source, e.value, sample) : '';
  }

  const mappingComplete = indexes.every((i) => {
    const e = fullMapping[String(i)];
    return e && (e.source !== 'custom' || (e.value ?? '').trim());
  });
  const buttonsComplete = urlButtons.every(({ i }) => {
    const e = form.buttonUrlParams[String(i)];
    return e && (e.source !== 'custom' || (e.value ?? '').trim());
  });
  // Customers have no business: any field filled from business details would
  // reach them as the template's sample. The server refuses such a send too.
  const reachesCustomers = (preview?.byKind?.customer ?? 0) > 0;
  const businessOnlyFields = [
    ...indexes.filter((i) => BUSINESS_ONLY.has(fullMapping[String(i)]?.source)).map((i) => `{{${i}}}`),
    ...urlButtons.filter(({ i }) => BUSINESS_ONLY.has(form.buttonUrlParams[String(i)]?.source ?? 'profile_url')).map(({ b }) => `the “${b.text}” button`),
  ];
  const customerConflict = reachesCustomers && businessOnlyFields.length > 0;

  const scheduleValid = form.schedule === 'now' || (!!form.scheduledAt && new Date(form.scheduledAt).getTime() > now);

  const stepValid = [
    form.name.trim().length > 0 && !!preview && preview.sendable > 0,
    !!template && mappingComplete && buttonsComplete && !customerConflict && (header?.format !== 'IMAGE' || form.headerMediaSource === 'provider_logo' || form.headerMediaUrl.trim().length > 0),
    scheduleValid,
    true,
  ];

  const sendable = preview?.sendable ?? 0;
  const rate = rateFor(category, settings?.rates);
  const cost = sendable * rate;
  const gst = cost * GST_RATE;
  const remainingToday = Math.max(0, (settings?.dailyCap ?? 0) - (settings?.uniqueRecipientsLast24h ?? 0));
  const overCap = settings ? sendable > remainingToday : false;
  const minutes = estimateMinutes(sendable, form.ratePerMinute);

  const buildPayload = (): WaCampaignPayload => ({
    name: form.name.trim(),
    templateId: form.templateId!,
    audience: form.audience,
    variableMapping: fullMapping,
    headerMediaUrl: form.headerMediaUrl.trim() || undefined,
    headerMediaSource: header?.format === 'IMAGE' ? form.headerMediaSource : 'fixed',
    buttonUrlParams: Object.keys(form.buttonUrlParams).length ? form.buttonUrlParams : undefined,
    ratePerMinute: form.ratePerMinute,
  });

  const persist = async (): Promise<string> => {
    const payload = buildPayload();
    const saved = savedId
      ? await updateMut.mutateAsync({ id: savedId, payload })
      : await createMut.mutateAsync(payload);
    setSavedId(saved.id);
    return saved.id;
  };

  const saveDraft = async () => {
    if (!form.name.trim()) { toast.error('Give the campaign a name first'); return; }
    if (!form.templateId) { toast.error('Pick a template before saving a draft'); return; }
    try {
      await persist();
      toast.success('Draft saved');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save the draft'));
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim()) return;
    try {
      const id = await persist();
      await testMut.mutateAsync({ id, phone: testPhone.trim() });
      toast.success(`Test sent to ${testPhone.trim()}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Test send failed'));
    }
  };

  const launch = async () => {
    try {
      const id = await persist();
      const scheduledAt = form.schedule === 'later' ? new Date(form.scheduledAt).toISOString() : undefined;
      await sendMut.mutateAsync({ id, scheduledAt });
      toast.success(scheduledAt ? 'Campaign scheduled' : `Sending to ${sendable.toLocaleString('en-IN')} businesses`);
      setConfirm(false);
      navigate(WA_ROUTES.campaign(id));
    } catch (e) {
      setConfirm(false);
      toast.error(apiErrorMessage(e, 'Could not start the campaign'));
    }
  };

  const busy = createMut.isPending || updateMut.isPending || sendMut.isPending;

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="card p-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={s.key}
              type="button"
              disabled={i > step && !stepValid.slice(0, i).every(Boolean)}
              onClick={() => setStep(i)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 disabled:opacity-50"
              style={{ background: active ? 'var(--color-primary-light)' : 'transparent', color: active ? 'var(--color-primary)' : done ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--surface-2)', color: done || active ? '#fff' : 'var(--text-muted)' }}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              {s.label}
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" style={{ color: 'var(--border-strong)' }} />}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 pl-3">
          <button type="button" onClick={saveDraft} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
            {updateMut.isPending || createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save draft
          </button>
        </div>
      </div>

      {/* Step body */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="card p-5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Campaign name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Profile completion nudge · Hyderabad · Oct"
              className={`${INPUT_CLASS} mt-1.5 max-w-xl`}
              style={INPUT_STYLE}
              maxLength={200}
            />
          </div>
          <AudienceBuilder value={form.audience} onChange={(a) => patch({ audience: a })} templateCategory={templateCategory} rates={settings?.rates} onPreview={onPreview} />
        </div>
      )}

      {step > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          <div className="space-y-5">
            {step === 1 && (
              <>
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Pick an approved template</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Only Meta-approved templates can be sent. Hover to preview, click to select.</p>
                  <TemplatePicker
                    templates={templates}
                    isLoading={templatesLoading}
                    value={form.templateId}
                    onChange={(t) => patch({ templateId: t.id, variableMapping: {}, buttonUrlParams: {}, headerMediaUrl: '' })}
                    onHover={setHovered}
                    rates={settings?.rates}
                    emptyAction={{ label: 'Go to templates', onClick: () => navigate(WA_ROUTES.templates) }}
                  />
                </div>

                {template && (
                  <div className="card p-5 space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Variables</h3>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Each placeholder is resolved per recipient. Samples use {sample ? <strong>{sample.brandName}</strong> : 'the first matching business'}.</p>
                      <VariableMappingTable template={template} mapping={fullMapping} onChange={(m) => patch({ variableMapping: m })} sample={sample} />
                      {customerConflict && (
                        <p className="text-xs mt-3 p-3 rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
                          This audience includes {preview?.byKind?.customer.toLocaleString('en-IN')} app customers, who have no business. {businessOnlyFields.join(', ')} {businessOnlyFields.length > 1 ? 'use' : 'uses'} business details — change {businessOnlyFields.length > 1 ? 'them' : 'it'} to Owner name (the customer's name), City, App download link or your own text, or go back and send to businesses only.
                        </p>
                      )}
                    </div>

                    {header?.format === 'IMAGE' && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Header image</h3>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>This template opens with an image.</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {([
                            { value: 'provider_logo', title: "Each business's logo", desc: 'Their logo beside the Tijarah mark. Businesses without a logo get the Tijarah card.' },
                            { value: 'fixed', title: 'Same image for everyone', desc: 'One public JPG or PNG link, under 5 MB.' },
                          ] as const).map((o) => {
                            const on = form.headerMediaSource === o.value;
                            return (
                              <button
                                key={o.value}
                                type="button"
                                onClick={() => patch({ headerMediaSource: o.value })}
                                className="text-left p-3 rounded-lg border-2 transition-colors"
                                style={{ borderColor: on ? 'var(--accent, #4f46e5)' : 'var(--border)', background: on ? 'var(--surface-2)' : 'var(--surface-1)' }}
                              >
                                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  <span className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: on ? 'var(--accent, #4f46e5)' : 'var(--text-muted)', background: on ? 'var(--accent, #4f46e5)' : 'transparent', boxShadow: on ? 'inset 0 0 0 2px var(--surface-2)' : undefined }} />
                                  {o.title}
                                </span>
                                <span className="block text-xs mt-1 ml-5.5" style={{ color: 'var(--text-muted)' }}>{o.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                        {form.headerMediaSource === 'fixed' ? (
                          <input value={form.headerMediaUrl} onChange={(e) => patch({ headerMediaUrl: e.target.value })} placeholder="https://… (public JPG/PNG, under 5 MB)" className={`${INPUT_CLASS} mt-2.5`} style={INPUT_STYLE} />
                        ) : (
                          <p className="text-xs mt-2.5" style={{ color: 'var(--text-muted)' }}>
                            The preview shows {sample ? <strong>{sample.brandName}</strong> : 'the first matching business'}'s card. Logos are converted to JPEG automatically, so WebP logos work too.
                          </p>
                        )}
                      </div>
                    )}

                    {urlButtons.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Button link parameters</h3>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>These URL buttons end in <code>{'{{1}}'}</code>; choose what fills the suffix.</p>
                        <div className="space-y-2">
                          {urlButtons.map(({ b, i }) => {
                            const e = form.buttonUrlParams[String(i)] ?? { source: 'profile_url' as VariableSource };
                            return (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                                <div className="sm:w-56 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{b.text}</p>
                                  <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{b.type === 'URL' ? b.url : ''}</p>
                                </div>
                                <select value={e.source} onChange={(ev) => patch({ buttonUrlParams: { ...form.buttonUrlParams, [String(i)]: { ...e, source: ev.target.value as VariableSource } } })} className={INPUT_CLASS} style={INPUT_STYLE}>
                                  {VARIABLE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                                {e.source === 'custom' && (
                                  <input value={e.value ?? ''} onChange={(ev) => patch({ buttonUrlParams: { ...form.buttonUrlParams, [String(i)]: { ...e, value: ev.target.value } } })} placeholder="suffix" className={INPUT_CLASS} style={INPUT_STYLE} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="card p-5 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>When should it go out?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { v: 'now', title: 'Send now', detail: 'Starts immediately, inside the send window.', icon: Zap },
                      { v: 'later', title: 'Schedule', detail: 'Pick a date and time (IST).', icon: Clock },
                    ] as const).map((o) => {
                      const on = form.schedule === o.v;
                      return (
                        <button key={o.v} type="button" onClick={() => patch({ schedule: o.v })} className="text-left p-4 rounded-xl transition-all" style={{ background: on ? 'var(--color-primary-light)' : 'var(--surface-1)', border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}` }}>
                          <div className="flex items-center gap-2">
                            <o.icon className="w-4 h-4" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{o.title}</span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{o.detail}</p>
                        </button>
                      );
                    })}
                  </div>
                  {form.schedule === 'later' && (
                    <div className="mt-3 max-w-xs">
                      <input type="datetime-local" value={form.scheduledAt} min={toLocalInputValue(new Date(now))} onChange={(e) => patch({ scheduledAt: e.target.value })} className={INPUT_CLASS} style={{ ...INPUT_STYLE, border: `1px solid ${scheduleValid ? 'var(--border-default)' : 'var(--color-danger)'}` }} />
                      {!scheduleValid && <p className="text-[11px] mt-1" style={{ color: 'var(--color-danger)' }}>Pick a time in the future.</p>}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Throttle</h3>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-primary)' }}>{form.ratePerMinute} / min</span>
                  </div>
                  <input type="range" min={10} max={200} step={10} value={form.ratePerMinute} onChange={(e) => patch({ ratePerMinute: Number(e.target.value) })} className="w-full" style={{ accentColor: 'var(--color-primary)' }} />
                  <div className="flex items-center justify-between text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>10 / min (gentle)</span>
                    <span>≈ finishes in <strong style={{ color: 'var(--text-primary)' }}>{humanMinutes(minutes)}</strong> for {sendable.toLocaleString('en-IN')} messages</span>
                    <span>200 / min</span>
                  </div>
                </div>

                <div className="flex gap-2 p-3 rounded-lg text-xs" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                  <span>
                    Messages only go out between <strong>{settings?.sendWindowStart ?? 9}:00</strong> and <strong>{settings?.sendWindowEnd ?? 21}:00 IST</strong>. Anything queued outside that window waits for the next morning. Our own daily cap is {settings?.dailyCap?.toLocaleString('en-IN') ?? '—'} unique recipients; {remainingToday.toLocaleString('en-IN')} remain today.
                  </span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SummaryCard title="Audience" value={`${sendable.toLocaleString('en-IN')} businesses`} sub={`${(preview?.total ?? 0).toLocaleString('en-IN')} matched · ${((preview?.total ?? 0) - sendable).toLocaleString('en-IN')} skipped`}>
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {summarizeFilters(form.audience).map((s) => <li key={s} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{s}</li>)}
                    </ul>
                  </SummaryCard>
                  <SummaryCard title="Template" value={template?.name ?? '—'} mono sub={template ? `${CATEGORY_LABEL[template.category]} · ${template.language} · ${formatInr(rate, 4)} per delivered message` : ''} />
                  <SummaryCard title="Estimated cost" value={formatInr(cost + gst)} sub="incl. 18% GST">
                    <dl className="mt-2 text-xs space-y-1 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex justify-between"><dt>{sendable.toLocaleString('en-IN')} × {formatInr(rate, 4)}</dt><dd>{formatInr(cost)}</dd></div>
                      <div className="flex justify-between"><dt>GST 18%</dt><dd>{formatInr(gst)}</dd></div>
                      <div className="flex justify-between font-semibold" style={{ color: 'var(--text-primary)' }}><dt>Total</dt><dd>{formatInr(cost + gst)}</dd></div>
                    </dl>
                    <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>Only delivered messages are billed; failures and skips cost nothing.</p>
                  </SummaryCard>
                </div>

                {(preview?.skipped.marketingCap ?? 0) > 0 || overCap || settings?.isTestNumber ? (
                  <div className="card p-4 space-y-2">
                    {(preview?.skipped.marketingCap ?? 0) > 0 && (
                      <Warn>{preview!.skipped.marketingCap.toLocaleString('en-IN')} recipients received a marketing message in the last 24h and will be skipped (Meta’s per-user cap).</Warn>
                    )}
                    {overCap && (
                      <Warn>{sendable.toLocaleString('en-IN')} recipients exceeds today’s remaining daily cap ({remainingToday.toLocaleString('en-IN')}). The overflow rolls over and keeps sending as the cap frees up.</Warn>
                    )}
                    {settings?.isTestNumber && (
                      <Warn>You’re on Meta’s test number — only up to 5 verified recipient numbers will actually receive this.</Warn>
                    )}
                  </div>
                ) : null}

                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Send a test to your number</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Uses the first matching business’s values. Saves the draft first. Test sends cost one message.</p>
                  <div className="flex gap-2 max-w-md">
                    <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLASS} style={INPUT_STYLE} />
                    <button type="button" onClick={sendTest} disabled={!testPhone.trim() || testMut.isPending || busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg shrink-0 disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                      {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Send test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky preview + summary */}
          <aside className="xl:sticky xl:top-4 space-y-4">
            <WaPhonePreview
              components={previewTemplate?.components}
              values={previewValues}
              headerImageUrl={headerPreviewUrl}
              buttonUrlValues={buttonValues}
              businessName={settings?.phone?.verifiedName || 'Tijarah Connect'}
              emptyHint="Pick a template to preview the message"
            />
            <div className="card p-4 text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between"><span>Audience</span><span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{sendable.toLocaleString('en-IN')} sendable</span></div>
              <div className="flex justify-between"><span>Template</span><span className="font-mono truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>{template?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span>Schedule</span><span style={{ color: 'var(--text-primary)' }}>{form.schedule === 'now' ? 'Now' : form.scheduledAt ? new Date(form.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
              <div className="pt-1.5" style={{ borderTop: '1px solid var(--border-light)' }}>
                <CostHint count={sendable} rates={settings?.rates} category={category === 'marketing' ? 'marketing' : 'utility'} />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 py-3 px-4 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
        <button type="button" onClick={() => (step === 0 ? navigate(WA_ROUTES.campaigns) : setStep(step - 1))} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
          <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex items-center gap-3">
          {step === 0 && !stepValid[0] && (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              {!form.name.trim() ? 'Name the campaign' : !preview ? 'Counting audience…' : 'No sendable recipients'}
            </span>
          )}
          {step === 1 && !stepValid[1] && template && (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              {!mappingComplete ? 'Fill every variable' : !buttonsComplete ? 'Map the button link' : 'Header image URL required'}
            </span>
          )}
          {step < 3 ? (
            <button type="button" disabled={!stepValid[step]} onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" disabled={busy || !stepValid.every(Boolean)} onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: form.schedule === 'now' ? '#128C7E' : 'var(--color-primary)' }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : form.schedule === 'now' ? <Send className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
              {form.schedule === 'now' ? `Send to ${sendable.toLocaleString('en-IN')} businesses` : 'Schedule'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={launch}
        variant="warning"
        isLoading={busy}
        title={form.schedule === 'now' ? `Send to ${sendable.toLocaleString('en-IN')} businesses?` : 'Schedule this campaign?'}
        description={`“${form.name.trim()}” will ${form.schedule === 'now' ? 'start sending now' : `start on ${new Date(form.scheduledAt).toLocaleString('en-IN')}`} using ${template?.name}. Estimated cost ${formatInr(cost)} + GST ${formatInr(gst)} = ${formatInr(cost + gst)} if everything is delivered. Marketing recipients who hit Meta’s cap are skipped automatically.`}
        confirmLabel={form.schedule === 'now' ? 'Send now' : 'Schedule'}
      />
    </div>
  );
}

function SummaryCard({ title, value, sub, mono, children }: { title: string; value: string; sub?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <p className={`text-lg font-bold mt-1 truncate ${mono ? 'font-mono text-base' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}
