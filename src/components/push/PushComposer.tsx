import { useCallback, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, CalendarClock, FlaskConical, Loader2, Megaphone, Send, Sparkles, Tag } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useCreateCampaign,
  useCreateTemplate,
  useNotificationTemplates,
  useSendTestPush,
} from '../../hooks/useNotifications';
import type { PushAudience, PushAudiencePreview, PushKind, PushTestTarget } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProviderPicker } from '../ui/ProviderPicker';
import { CustomerPicker } from '../whatsapp/CustomerPicker';
import { apiErrorMessage, pickedBusinessId, toLocalInputValue } from '../whatsapp/wa-utils';
import { useNow } from '../whatsapp/useNow';
import { PushAudiencePicker } from './PushAudiencePicker';
import { PushLinkPicker } from './PushLinkPicker';
import { PushPhonePreview } from './PushPhonePreview';
import {
  BODY_LIMIT,
  CAMPAIGN_VARIABLES,
  CARD_STYLE,
  cleanAudience,
  describeAudience,
  fillIn,
  insertAtCursor,
  LABEL_CLASS,
  linkLabel,
  TITLE_LIMIT,
  valuesForRecipient,
  variablesIn,
} from './push-utils';

export interface PushDraft {
  title: string;
  body: string;
  imageUrl?: string;
  route?: string;
  type?: PushKind;
  audience?: PushAudience;
  templateId?: string;
}

interface Props {
  initial?: PushDraft | null;
  onSent: () => void;
}

const EMOJI = ['🎉', '🔥', '✨', '🛍️', '🌙', '⏰', '💸', '❤️', '📍', '🎁'];

const INPUT = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

function Counter({ n, limit }: { n: number; limit: number }) {
  const over = n > limit;
  return (
    <span className="text-[11px]" style={{ color: over ? 'var(--color-warning-dark)' : 'var(--text-muted)' }}>
      {n}/{limit}
      {over ? ' · may be cut off' : ''}
    </span>
  );
}

function Card({ title, icon: Icon, children, aside }: { title: string; icon: typeof Send; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function PushComposer({ initial, onSent }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [route, setRoute] = useState(initial?.route ?? '/');
  const [type, setType] = useState<PushKind>(initial?.type ?? 'promotional');
  const [audience, setAudience] = useState<PushAudience>(initial?.audience ?? { kind: 'everyone' });
  const [templateId, setTemplateId] = useState<string | undefined>(initial?.templateId);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60_000)));
  const [preview, setPreview] = useState<PushAudiencePreview | undefined>();
  const [names, setNames] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState<'me' | 'business' | 'customer'>('me');
  const [testTarget, setTestTarget] = useState<PushTestTarget & { label?: string }>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<'title' | 'body'>('body');

  const now = useNow();
  const { data: saved } = useNotificationTemplates('campaign');
  const createCampaign = useCreateCampaign();
  const createTemplate = useCreateTemplate();
  const sendTest = useSendTestPush();

  const onPreview = useCallback((p: PushAudiencePreview | undefined) => setPreview(p), []);
  const onName = useCallback((id: string, label: string) => setNames((m) => (m[id] === label ? m : { ...m, [id]: label })), []);

  // ── Derived ──
  const sample = preview?.sample?.[0] ?? null;
  const values = sample
    ? valuesForRecipient(sample)
    : { name: 'Aisha', city: 'Mumbai', businessName: audience.kind === 'businesses' ? 'Burhani Sweets' : '' };
  const shownTitle = fillIn(title, values);
  const shownBody = fillIn(body, values);
  const used = variablesIn(title, body);
  const unknownVars = used.filter((v) => !CAMPAIGN_VARIABLES.some((c) => c.key === v));
  const businessNameForCustomers = used.includes('businessName') && audience.kind !== 'businesses' && (preview?.customers ?? 1) > 0;
  const linkProblem =
    !route ? 'Pick where it opens' : !route.startsWith('/') ? 'The screen path must start with /' : null;
  const laterAt = when === 'later' ? new Date(scheduledAt) : null;
  const timeProblem = laterAt && (Number.isNaN(laterAt.getTime()) || laterAt.getTime() < now + 2 * 60_000)
    ? 'Pick a time at least a few minutes from now'
    : null;
  const total = preview?.total ?? 0;
  const problems = [
    !title.trim() && 'Add a title',
    !body.trim() && 'Add a message',
    linkProblem,
    unknownVars.length > 0 && `Remove {{${unknownVars[0]}}}: campaigns can only fill in ${CAMPAIGN_VARIABLES.map((c) => `{{${c.key}}}`).join(', ')}`,
    timeProblem,
    preview && total === 0 && 'Nobody matches this audience',
  ].filter(Boolean) as string[];

  const insertVar = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocus.current === 'title') insertAtCursor(titleRef.current, title, token, setTitle);
    else insertAtCursor(bodyRef.current, body, token, setBody);
  };

  const loadTemplate = (id: string) => {
    const t = saved?.find((x) => x.id === id);
    if (!t) {
      setTemplateId(undefined);
      return;
    }
    setTemplateId(t.id);
    setTitle(t.titleTemplate);
    setBody(t.bodyTemplate);
    setImageUrl(t.defaultImageUrl ?? '');
    setRoute(t.defaultRoute || '/');
    setType(t.type === 'system_announcement' ? 'system_announcement' : 'promotional');
    toast.info(`Loaded “${t.name}”`);
  };

  const message = () => ({
    title: title.trim(),
    body: body.trim(),
    imageUrl: imageUrl.trim() || undefined,
    route: route || '/',
    type,
  });

  const doTest = async () => {
    const target: PushTestTarget =
      testTo === 'me' ? {} : testTo === 'business' ? { providerId: testTarget.providerId } : { userId: testTarget.userId };
    if (testTo !== 'me' && !target.providerId && !target.userId) {
      toast.error(`Pick the ${testTo === 'business' ? 'business' : 'customer'} to send the test to`);
      return;
    }
    try {
      const r = await sendTest.mutateAsync({ ...message(), ...target });
      if (!r.devices) {
        toast.warn(
          testTo === 'me'
            ? "Your admin account isn't signed in to the Tijarah app on any phone. Sign in there, or send the test to someone else."
            : `${r.sentTo} isn't signed in to the app on any phone.`,
        );
      } else if (!r.delivered) {
        toast.error(`Couldn't reach ${r.sentTo}'s phone. The app may have been uninstalled.`);
      } else {
        toast.success(`Test sent to ${r.sentTo} (${r.delivered} ${r.delivered === 1 ? 'device' : 'devices'})`);
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the test'));
    }
  };

  const doSend = async () => {
    try {
      await createCampaign.mutateAsync({
        ...message(),
        audience: cleanAudience(audience),
        scheduledAt: laterAt ? laterAt.toISOString() : undefined,
        templateId,
      });
      toast.success(
        laterAt
          ? `Scheduled for ${laterAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
          : `Sending to ${total.toLocaleString('en-IN')} people…`,
      );
      setConfirming(false);
      onSent();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the push'));
    }
  };

  const doSave = async () => {
    if (!saveName.trim()) {
      toast.error('Give the message a name');
      return;
    }
    try {
      const t = await createTemplate.mutateAsync({
        name: saveName.trim(),
        titleTemplate: title.trim(),
        bodyTemplate: body.trim(),
        defaultRoute: route || '/',
        defaultImageUrl: imageUrl.trim() || undefined,
        type,
      });
      setTemplateId(t.id);
      setSaving(false);
      setSaveName('');
      toast.success(`Saved “${t.name}” to your messages`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save the message'));
    }
  };

  const audienceText = useMemo(() => describeAudience(cleanAudience(audience)), [audience]);
  const previewCaption = [
    sample ? `As ${sample.businessName ?? sample.name ?? 'they'} will see it` : null,
    `Opens: ${pickedBusinessId(route) ? 'a business page' : linkLabel(route)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <div className="space-y-5 min-w-0">
        {/* ── Message ── */}
        <Card
          title="Message"
          icon={Megaphone}
          aside={
            <div className="flex items-center gap-2">
              <select
                value={templateId ?? ''}
                onChange={(e) => loadTemplate(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-lg focus-ring max-w-[200px]"
                style={INPUT}
                aria-label="Start from a saved message"
              >
                <option value="">{saved?.length ? 'Start from a saved message…' : 'No saved messages yet'}</option>
                {saved?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setSaving((s) => !s)}
                disabled={!title.trim() || !body.trim()}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                title="Keep this message to reuse later"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          }
        >
          {saving && (
            <div className="flex gap-2 mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSave()}
                placeholder="Name it, e.g. Weekend deals reminder"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg focus-ring"
                style={{ ...INPUT, background: 'var(--surface-0)' }}
                maxLength={200}
              />
              <button
                type="button"
                onClick={doSave}
                disabled={createTemplate.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
              >
                Save message
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Title</label>
                <Counter n={shownTitle.length} limit={TITLE_LIMIT} />
              </div>
              <input
                ref={titleRef}
                value={title}
                onFocus={() => (lastFocus.current = 'title')}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={INPUT}
                placeholder="e.g. 🌙 Eid deals near you"
                maxLength={200}
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Message</label>
                <Counter n={shownBody.length} limit={BODY_LIMIT} />
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onFocus={() => (lastFocus.current = 'body')}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ ...INPUT, resize: 'vertical' }}
                placeholder="Salaam {{name}}, 12 businesses in {{city}} have Eid offers this week."
                maxLength={2000}
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] mr-1" style={{ color: 'var(--text-muted)' }}>Personalise:</span>
                {CAMPAIGN_VARIABLES.filter((v) => !v.businessesOnly || audience.kind !== 'customers').map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertVar(v.key)}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-full"
                    style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                    title={`e.g. ${v.hint}`}
                  >
                    + {v.label}
                  </button>
                ))}
                <span className="w-px h-4 mx-1" style={{ background: 'var(--border-default)' }} />
                {EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => (lastFocus.current === 'title'
                      ? insertAtCursor(titleRef.current, title, e, setTitle)
                      : insertAtCursor(bodyRef.current, body, e, setBody))}
                    className="w-7 h-7 rounded-md text-base leading-none hover:opacity-70"
                    style={{ background: 'var(--surface-1)' }}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {businessNameForCustomers && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-warning-dark)' }}>
                  Customers don't have a business name, so {'{{businessName}}'} will be left out for them.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Picture (optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                  style={INPUT}
                  placeholder="https://… (2:1, e.g. 1024×512)"
                  maxLength={500}
                />
              </div>
              <div>
                <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Tapping it opens</label>
                <PushLinkPicker value={route} onChange={setRoute} audience={audience.kind} />
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Kind of push</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {([
                  { v: 'promotional', label: 'Promotion', hint: 'Deals, new features, nudges. Skips people who turned promotions off.', icon: Tag },
                  { v: 'system_announcement', label: 'Announcement', hint: 'Important news about Tijarah. Skips people who turned announcements off.', icon: Sparkles },
                ] as const).map((k) => {
                  const on = type === k.v;
                  return (
                    <button
                      key={k.v}
                      type="button"
                      onClick={() => setType(k.v)}
                      className="text-left p-3 rounded-lg flex gap-2.5"
                      style={{
                        background: on ? 'var(--color-primary-light)' : 'var(--surface-1)',
                        border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}`,
                      }}
                    >
                      <k.icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                      <span>
                        <span className="block text-sm font-medium" style={{ color: on ? 'var(--color-primary)' : 'var(--text-primary)' }}>{k.label}</span>
                        <span className="block text-[11px]" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)', opacity: on ? 0.8 : 1 }}>{k.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Audience ── */}
        <Card title="Who gets it" icon={Send}>
          <PushAudiencePicker
            value={audience}
            onChange={setAudience}
            type={type}
            onPreview={onPreview}
            names={names}
            onName={onName}
          />
        </Card>

        {/* ── When ── */}
        <Card title="When" icon={CalendarClock}>
          <div className="flex flex-wrap items-center gap-3">
            {(['now', 'later'] as const).map((w) => (
              <label key={w} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input type="radio" checked={when === w} onChange={() => setWhen(w)} />
                {w === 'now' ? 'Send now' : 'Schedule for'}
              </label>
            ))}
            {when === 'later' && (
              <input
                type="datetime-local"
                value={scheduledAt}
                min={toLocalInputValue(new Date(now))}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg focus-ring"
                style={INPUT}
              />
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Best reach is usually 7–9 pm. People with quiet hours on get it in their notifications without a sound.
          </p>
        </Card>

        {/* ── Actions ── */}
        <div className="rounded-xl p-4" style={CARD_STYLE}>
          {problems.length > 0 && (
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>To send: {problems.join(' · ')}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTestOpen((o) => !o)}
              disabled={!title.trim() || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg disabled:opacity-40"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              <FlaskConical className="w-4 h-4" />
              Send a test
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={problems.length > 0 || !preview || createCampaign.isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 ml-auto"
              style={{ background: 'var(--color-primary)' }}
            >
              {when === 'later' ? <CalendarClock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {when === 'later' ? 'Schedule' : 'Send'}
              {preview && total > 0 ? ` to ${total.toLocaleString('en-IN')}` : ''}
            </button>
          </div>

          {testOpen && (
            <div className="mt-3 p-3 rounded-lg space-y-3" style={{ background: 'var(--surface-1)' }}>
              <div className="flex flex-wrap gap-3">
                {([
                  { v: 'me', label: 'My phone' },
                  { v: 'business', label: 'A business owner' },
                  { v: 'customer', label: 'A customer' },
                ] as const).map((o) => (
                  <label key={o.v} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                    <input type="radio" checked={testTo === o.v} onChange={() => { setTestTo(o.v); setTestTarget({}); }} />
                    {o.label}
                  </label>
                ))}
              </div>
              {testTo === 'business' && (
                <ProviderPicker
                  value={testTarget.providerId ? { id: testTarget.providerId, name: testTarget.label ?? '' } : null}
                  onChange={(p) => setTestTarget(p ? { providerId: p.id, label: p.name } : {})}
                />
              )}
              {testTo === 'customer' && (
                testTarget.userId ? (
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {testTarget.label}{' '}
                    <button type="button" className="text-xs underline ml-1" style={{ color: 'var(--text-muted)' }} onClick={() => setTestTarget({})}>change</button>
                  </p>
                ) : (
                  <CustomerPicker onPick={(c) => setTestTarget({ userId: c.id, label: c.name })} />
                )
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={doTest}
                  disabled={sendTest.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {sendTest.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                  Send test now
                </button>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Goes straight to their phone, personalised for them. It isn't saved to their notifications.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="xl:sticky xl:top-4 rounded-xl p-5" style={CARD_STYLE}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Preview</p>
        <PushPhonePreview title={shownTitle} body={shownBody} imageUrl={imageUrl.trim() || null} caption={previewCaption} />
        <div className="mt-4 pt-4 space-y-1.5 text-xs" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
          <p><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>To:</span> {audienceText}</p>
          <p><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Kind:</span> {type === 'promotional' ? 'Promotion' : 'Announcement'}</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={doSend}
        isLoading={createCampaign.isPending}
        variant="warning"
        title={
          laterAt
            ? `Schedule for ${laterAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}?`
            : `Send to ${total.toLocaleString('en-IN')} ${total === 1 ? 'person' : 'people'} now?`
        }
        description={
          laterAt
            ? `It goes to whoever matches “${audienceText}” at that time. You can cancel it until then.`
            : `“${shownTitle}” goes out to ${audienceText}. A push can't be taken back once it's sent.`
        }
        confirmLabel={laterAt ? 'Schedule' : 'Send now'}
      />
    </div>
  );
}
