import { useState } from 'react';
import { Check, X, Copy, RefreshCw, Loader2, Save, Send, FlaskConical, Smartphone, KeyRound, Webhook, SlidersHorizontal, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import EmptyState from '../../components/ui/EmptyState';
import { FormField } from '../../components/ui/FormField';
import { useHasPermission } from '../../hooks/usePermissions';
import { useWaSettings, useUpdateWaSettings, useRefreshWaPhoneMeta, useWaSettingsTestSend, useWaTemplates } from '../../hooks/useWhatsApp';
import { Skel } from '../../components/whatsapp/Skeleton';
import { fmtDateTime, fmtRelative, apiErrorMessage, QUALITY_COLOR, TIER_LABEL, NAME_STATUS_LABEL, formatInr, INPUT_CLASS, INPUT_STYLE } from '../../components/whatsapp/wa-utils';
import type { WaRates, WaSettings } from '../../types';

export default function WhatsAppSettings() {
  const { data: settings, isLoading, isError } = useWaSettings();
  if (isLoading) return <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><Skel className="h-64" /><Skel className="h-64" /><Skel className="h-96 xl:col-span-2" /></div>;
  if (isError || !settings) return <EmptyState title="Settings unavailable" description="The WhatsApp settings endpoint did not respond." />;
  return <SettingsView settings={settings} />;
}

function SettingsView({ settings }: { settings: WaSettings }) {
  const canEdit = useHasPermission('whatsapp.settings');
  const canSend = useHasPermission('whatsapp.send');
  const refresh = useRefreshWaPhoneMeta();

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Copy failed'); }
  };

  const onRefresh = async () => {
    try { await refresh.mutateAsync(); toast.success('Phone details refreshed'); } catch (e) { toast.error(apiErrorMessage(e, 'Refresh failed')); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Credentials */}
        <div className="card p-5">
          <SectionTitle icon={KeyRound} title="Credentials" sub="Read from the server environment; never edited here." />
          <ul className="mt-4 space-y-2.5 text-sm">
            <Flag ok={settings.configured} label="WHATSAPP_ACCESS_TOKEN · PHONE_NUMBER_ID · BUSINESS_ACCOUNT_ID" hint={settings.configured ? 'Cloud API reachable' : 'Set all three and restart the API'} />
            <Flag ok={settings.webhook.appSecretSet} label="WHATSAPP_APP_SECRET" hint="Verifies webhook signatures" />
            <Flag ok={settings.webhook.verifyTokenSet} label="WHATSAPP_VERIFY_TOKEN" hint="Pasted into the Meta webhook config" />
            <li className="flex items-center justify-between gap-3 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
              <span style={{ color: 'var(--text-muted)' }}>API version</span><span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{settings.apiVersion}</span>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Webhook className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Webhook URL</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text-primary)' }}>{settings.webhook.url}</code>
              <button onClick={() => copy(settings.webhook.url)} className="p-1.5 rounded-md shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }} aria-label="Copy webhook URL"><Copy className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Subscribe to <code>messages</code>, <code>message_template_status_update</code>, <code>phone_number_quality_update</code>. Last event: <strong style={{ color: settings.webhook.lastEventAt ? 'var(--text-secondary)' : 'var(--color-warning)' }}>{settings.webhook.lastEventAt ? `${fmtRelative(settings.webhook.lastEventAt)} (${fmtDateTime(settings.webhook.lastEventAt)})` : 'never — delivery statuses and replies will not arrive'}</strong>
            </p>
          </div>
        </div>

        {/* Phone */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle icon={Smartphone} title="Sender phone" sub="Cached from Meta; refreshed hourly." />
            <button onClick={onRefresh} disabled={refresh.isPending || !settings.configured} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
              {refresh.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
            </button>
          </div>
          {settings.isTestNumber && (
            <div className="mt-4 flex gap-2 p-3 rounded-lg text-xs" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
              <FlaskConical className="w-4 h-4 shrink-0 mt-px" />
              <span><strong>Meta test number.</strong> Only up to 5 recipient numbers verified in the Meta dashboard can receive messages, and only <code>hello_world</code> is pre-approved. Add a real business number in Meta to go live.</span>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <Item label="Display number" value={settings.phone?.displayPhoneNumber ?? '—'} mono />
            <Item label="Verified name" value={settings.phone?.verifiedName ?? '—'} />
            <Item label="Quality rating" value={<span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: QUALITY_COLOR(settings.phone?.qualityRating) }} />{settings.phone?.qualityRating ?? 'Unknown'}</span>} />
            <Item label="Messaging tier" value={TIER_LABEL(settings.phone?.messagingLimitTier)} />
            <Item label="Name status" value={NAME_STATUS_LABEL(settings.phone?.nameStatus)} />
            <Item label="Fetched" value={fmtRelative(settings.phone?.fetchedAt)} />
            <Item label="Sent (24h)" value={<span className="tabular-nums">{settings.sentLast24h.toLocaleString('en-IN')}</span>} />
            <Item label="Unique recipients (24h)" value={<span className="tabular-nums">{settings.uniqueRecipientsLast24h.toLocaleString('en-IN')} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>of {settings.dailyCap.toLocaleString('en-IN')} cap</span></span>} />
          </dl>
        </div>
      </div>

      <SettingsForm key={JSON.stringify([settings.dailyCap, settings.ratePerMinute, settings.sendWindowStart, settings.sendWindowEnd, settings.optOutKeywords, settings.optInKeywords, settings.requireOptInForMarketing, settings.rates])} settings={settings} canEdit={canEdit} />

      {canSend && <TestSendCard configured={settings.configured} />}
    </div>
  );
}

function SettingsForm({ settings, canEdit }: { settings: WaSettings; canEdit: boolean }) {
  const update = useUpdateWaSettings();
  const [dailyCap, setDailyCap] = useState(settings.dailyCap);
  const [ratePerMinute, setRatePerMinute] = useState(settings.ratePerMinute);
  const [windowStart, setWindowStart] = useState(settings.sendWindowStart);
  const [windowEnd, setWindowEnd] = useState(settings.sendWindowEnd);
  const [optOut, setOptOut] = useState<string[]>(settings.optOutKeywords);
  const [optIn, setOptIn] = useState<string[]>(settings.optInKeywords);
  const [requireOptIn, setRequireOptIn] = useState(settings.requireOptInForMarketing);
  const [rates, setRates] = useState<WaRates>(settings.rates);

  const save = async () => {
    if (windowStart >= windowEnd) { toast.error('The send window must start before it ends'); return; }
    try {
      await update.mutateAsync({ dailyCap, ratePerMinute, sendWindowStart: windowStart, sendWindowEnd: windowEnd, optOutKeywords: optOut, optInKeywords: optIn, requireOptInForMarketing: requireOptIn, rates });
      toast.success('Settings saved');
    } catch (e) { toast.error(apiErrorMessage(e, 'Could not save settings')); }
  };

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionTitle icon={SlidersHorizontal} title="Sending rules" sub="Our own guard-rails on top of Meta's limits." />
        {canEdit && (
          <button onClick={save} disabled={update.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
            {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        <FormField label="Daily cap" description="Unique recipients per rolling 24h. Meta's tier is the hard ceiling.">
          <input type="number" min={1} value={dailyCap} disabled={!canEdit} onChange={(e) => setDailyCap(Number(e.target.value))} className={INPUT_CLASS} style={INPUT_STYLE} />
        </FormField>
        <FormField label="Default rate / minute" description="Campaign throttle when none is set (10–200).">
          <input type="number" min={10} max={200} value={ratePerMinute} disabled={!canEdit} onChange={(e) => setRatePerMinute(Number(e.target.value))} className={INPUT_CLASS} style={INPUT_STYLE} />
        </FormField>
        <FormField label="Send window start (IST)">
          <select value={windowStart} disabled={!canEdit} onChange={(e) => setWindowStart(Number(e.target.value))} className={INPUT_CLASS} style={INPUT_STYLE}>{hours.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}</select>
        </FormField>
        <FormField label="Send window end (IST)" description="Queued messages outside the window wait.">
          <select value={windowEnd} disabled={!canEdit} onChange={(e) => setWindowEnd(Number(e.target.value))} className={INPUT_CLASS} style={INPUT_STYLE}>{hours.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}</select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <KeywordChips label="Opt-out keywords" hint="Inbound match (case-insensitive) sets consent to opted out and auto-replies." value={optOut} onChange={setOptOut} disabled={!canEdit} />
        <KeywordChips label="Opt-in keywords" hint="Sets consent back to opted in." value={optIn} onChange={setOptIn} disabled={!canEdit} />
      </div>

      <label className="flex items-start gap-3 mt-5 p-3 rounded-lg cursor-pointer" style={{ background: 'var(--surface-1)' }}>
        <input type="checkbox" checked={requireOptIn} disabled={!canEdit} onChange={(e) => setRequireOptIn(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>Require explicit opt-in for marketing</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>When on, marketing templates only go to contacts with consent = opted in (e.g. after they replied START to a consent request). Utility messages are unaffected.</span>
        </span>
      </label>

      <div className="mt-5">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Rates (₹ per delivered message, before 18% GST)</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Used for estimates and actual cost roll-ups. Update when Meta changes India pricing.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['marketing', 'utility', 'authentication', 'service'] as (keyof WaRates)[]).map((k) => (
            <FormField key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>₹</span>
                <input type="number" step="0.0001" min={0} value={rates[k]} disabled={!canEdit} onChange={(e) => setRates({ ...rates, [k]: Number(e.target.value) })} className={`${INPUT_CLASS} pl-7 tabular-nums`} style={INPUT_STYLE} />
              </div>
            </FormField>
          ))}
        </div>
        <p className="text-[11px] mt-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>
          1,000 marketing messages ≈ {formatInr(rates.marketing * 1000)} · 1,000 utility ≈ {formatInr(rates.utility * 1000)} · free-form replies inside the 24h window are free.
        </p>
      </div>
    </div>
  );
}

function TestSendCard({ configured }: { configured: boolean }) {
  const { data: templates = [] } = useWaTemplates({ status: 'approved' });
  const test = useWaSettingsTestSend();
  const [phone, setPhone] = useState('');
  const hello = templates.find((t) => t.name === 'hello_world');
  const [templateId, setTemplateId] = useState<string>('');
  const chosen = templateId || hello?.id || '';

  const send = async () => {
    if (!phone.trim()) return;
    try {
      await test.mutateAsync({ phone: phone.trim(), templateId: chosen || undefined });
      toast.success(`Test message sent to ${phone.trim()}`);
    } catch (e) { toast.error(apiErrorMessage(e, 'Test send failed')); }
  };

  return (
    <div className="card p-5">
      <SectionTitle icon={Send} title="Send a test message" sub="Sends one template to a number you own. On a test number the recipient must be verified in Meta." />
      <div className="flex flex-col md:flex-row gap-3 mt-4 md:items-end">
        <FormField label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={`${INPUT_CLASS} md:w-64`} style={INPUT_STYLE} />
        </FormField>
        <FormField label="Template">
          <select value={chosen} onChange={(e) => setTemplateId(e.target.value)} className={`${INPUT_CLASS} md:w-72`} style={INPUT_STYLE}>
            {templates.length === 0 && <option value="">hello_world (default)</option>}
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.category}</option>)}
          </select>
        </FormField>
        <button onClick={send} disabled={!phone.trim() || test.isPending || !configured} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 h-[38px]" style={{ background: '#128C7E' }} title={!configured ? 'Configure WhatsApp first' : undefined}>
          {test.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Send test
        </button>
      </div>
    </div>
  );
}

function KeywordChips({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: string[]; onChange: (v: string[]) => void; disabled: boolean }) {
  const [input, setInput] = useState('');
  const add = () => {
    const k = input.trim().toUpperCase();
    if (k && !value.includes(k)) onChange([...value, k]);
    setInput('');
  };
  return (
    <FormField label={label} description={hint}>
      <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 rounded-lg" style={INPUT_STYLE}>
        {value.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            {k}{!disabled && <button type="button" onClick={() => onChange(value.filter((x) => x !== k))} aria-label={`Remove ${k}`}><X className="w-3 h-3" /></button>}
          </span>
        ))}
        {!disabled && (
          <span className="inline-flex items-center gap-1 flex-1 min-w-[100px]">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Add…" className="flex-1 bg-transparent text-xs focus:outline-none" style={{ color: 'var(--text-primary)' }} />
            <button type="button" onClick={add} aria-label="Add keyword" style={{ color: 'var(--text-muted)' }}><Plus className="w-3.5 h-3.5" /></button>
          </span>
        )}
      </div>
    </FormField>
  );
}

function SectionTitle({ icon: Icon, title, sub }: { icon: typeof KeyRound; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary-light)' }}><Icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /></div>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </div>
    </div>
  );
}

function Flag({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px" style={{ background: ok ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}>
        {ok ? <Check className="w-3 h-3" style={{ color: 'var(--color-success-dark)' }} /> : <X className="w-3 h-3" style={{ color: 'var(--color-danger-dark)' }} />}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-mono font-semibold break-all" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      </div>
    </li>
  );
}

function Item({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 truncate ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  );
}
