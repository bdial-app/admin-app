import { useMemo, useRef, useState } from 'react';
import { Bell, FlaskConical, Loader2, Plus, RotateCcw, Search, Send, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useNotificationTemplates,
  useResetTemplate,
  useTemplateStats,
  useTestTemplate,
  useToggleTemplate,
  useUpdateTemplate,
} from '../../hooks/useNotifications';
import { useMinRole } from '../../hooks/usePermissions';
import type { NotificationTemplate, PushKind, TemplateStat } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DetailPanel } from '../ui/DetailPanel';
import { apiErrorMessage } from '../whatsapp/wa-utils';
import { PushLinkPicker } from './PushLinkPicker';
import { PushPhonePreview } from './PushPhonePreview';
import type { PushDraft } from './PushComposer';
import {
  BODY_LIMIT,
  CAMPAIGN_VARIABLES,
  CARD_STYLE,
  fillIn,
  insertAtCursor,
  LABEL_CLASS,
  linkLabel,
  pct,
  sampleValues,
  TITLE_LIMIT,
  variablesIn,
} from './push-utils';

const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'campaign', label: '💾 Saved messages', hint: 'Your own messages, ready to send as a campaign' },
  { value: 'onboarding', label: '🚀 Onboarding', hint: 'Welcoming new people' },
  { value: 'transactional', label: '🔔 Transactional', hint: 'Payments, approvals, replies: things people expect to hear about' },
  { value: 'engagement', label: '💡 Engagement', hint: 'Automatic nudges that bring owners and customers back' },
  { value: 'marketing', label: '📢 Marketing', hint: 'Automatic offers: boosts, deals' },
];

const TYPE_LABEL: Record<string, string> = {
  promotional: 'Promotion',
  system_announcement: 'Announcement',
  provider_status: 'Business update',
  payment_update: 'Payment',
  subscription_update: 'Plan',
  review_received: 'Review',
  chat_message: 'Chat',
  new_enquiry: 'Enquiry',
  verification_update: 'Verification',
  voucher_update: 'Voucher',
  report_update: 'Report',
  booking_update: 'Booking',
  invite_update: 'Invite',
};

const INPUT = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

interface Draft {
  name: string;
  description: string;
  titleTemplate: string;
  bodyTemplate: string;
  defaultRoute: string;
  defaultImageUrl: string;
  type: PushKind;
}

const toDraft = (t: NotificationTemplate | null): Draft => ({
  name: t?.name ?? '',
  description: t?.description ?? '',
  titleTemplate: t?.titleTemplate ?? '',
  bodyTemplate: t?.bodyTemplate ?? '',
  defaultRoute: t?.defaultRoute ?? '/',
  defaultImageUrl: t?.defaultImageUrl ?? '',
  type: t?.type === 'system_announcement' ? 'system_announcement' : 'promotional',
});

export function PushTemplates({ onUse }: { onUse?: (draft: PushDraft) => void }) {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  // null = closed, 'new' = a new saved message, else the template id.
  const [editing, setEditing] = useState<string | null>(null);
  const canEdit = useMinRole('admin');

  const { data: templates, isLoading } = useNotificationTemplates();
  const { data: stats } = useTemplateStats(30);
  const toggle = useToggleTemplate();

  const statBySlug = useMemo(() => new Map((stats ?? []).map((s) => [s.slug, s])), [stats]);
  const q = query.trim().toLowerCase();
  const visible = (templates ?? []).filter(
    (t) =>
      (!category || t.category === category) &&
      (!q || `${t.name} ${t.description ?? ''} ${t.titleTemplate} ${t.bodyTemplate}`.toLowerCase().includes(q)),
  );
  const totals = (stats ?? []).reduce((a, s) => ({ sent: a.sent + s.sent, opened: a.opened + s.opened }), { sent: 0, opened: 0 });
  const onCount = (templates ?? []).filter((t) => t.isActive && t.category !== 'campaign').length;
  const autoCount = (templates ?? []).filter((t) => t.category !== 'campaign').length;
  const current = editing && editing !== 'new' ? templates?.find((t) => t.id === editing) ?? null : null;

  const flip = (t: NotificationTemplate) =>
    toggle.mutate(
      { id: t.id, isActive: !t.isActive },
      {
        onSuccess: () => toast.success(`${t.name} ${t.isActive ? 'switched off' : 'switched on'}`),
        onError: (e) => toast.error(apiErrorMessage(e, 'Could not change it')),
      },
    );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: 'Automatic pushes on', value: `${onCount} of ${autoCount}` },
          { label: 'Sent by them, last 30 days', value: totals.sent.toLocaleString('en-IN') },
          { label: 'Opened', value: pct(totals.opened, totals.sent) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-4" style={CARD_STYLE}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg focus-ring w-60"
            style={INPUT}
          />
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {[{ value: '', label: 'All' }, ...CATEGORIES].map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{
                background: category === c.value ? 'var(--surface-0)' : 'transparent',
                color: category === c.value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: category === c.value ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing('new')}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4" /> New saved message
          </button>
        )}
      </div>

      {CATEGORIES.filter((c) => !category || c.value === category).map((c) => {
        const items = visible.filter((t) => t.category === c.value);
        if (!items.length) {
          if (c.value === 'campaign' && !q && (category === 'campaign' || !category)) {
            return (
              <div key={c.value} className="space-y-2">
                <GroupHeader label={c.label} hint={c.hint} />
                <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                  None yet. Write a push once, save it here, and reuse it from New push.
                </p>
              </div>
            );
          }
          return null;
        }
        return (
          <div key={c.value} className="space-y-2">
            <GroupHeader label={c.label} hint={c.hint} />
            <div className="grid lg:grid-cols-2 gap-2">
              {items.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  stat={statBySlug.get(t.slug)}
                  canEdit={canEdit}
                  onOpen={() => setEditing(t.id)}
                  onToggle={() => flip(t)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {!visible.length && q && (
        <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Nothing matches “{query}”.</p>
      )}
      {!templates?.length && (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No templates yet. The server adds them when it starts.</p>
        </div>
      )}

      {editing && (
        <TemplateEditor
          key={editing}
          template={current}
          stat={current ? statBySlug.get(current.slug) : undefined}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
          onCreated={(id) => setEditing(id)}
          onUse={onUse && ((d) => { setEditing(null); onUse(d); })}
        />
      )}
    </div>
  );
}

function GroupHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="px-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</h4>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>
    </div>
  );
}

function TemplateCard({
  t,
  stat,
  canEdit,
  onOpen,
  onToggle,
}: {
  t: NotificationTemplate;
  stat?: TemplateStat;
  canEdit: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const values = sampleValues(variablesIn(t.titleTemplate, t.bodyTemplate));
  const saved = t.category === 'campaign';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="p-4 rounded-xl text-left cursor-pointer transition-shadow hover:shadow-md"
      style={{ ...CARD_STYLE, opacity: t.isActive || saved ? 1 : 0.65 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              {TYPE_LABEL[t.type] ?? t.type}
            </span>
            {!saved && !t.isActive && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                Off
              </span>
            )}
          </div>
          {t.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{saved ? t.description : `When: ${t.description}`}</p>}
        </div>
        {!saved && (
          <button
            onClick={(e) => { e.stopPropagation(); if (canEdit) onToggle(); }}
            disabled={!canEdit}
            title={t.isActive ? 'On: switch off' : 'Off: switch on'}
            className="flex-shrink-0 disabled:opacity-50"
          >
            {t.isActive ? (
              <ToggleRight className="w-7 h-7" style={{ color: 'var(--color-success)' }} />
            ) : (
              <ToggleLeft className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            )}
          </button>
        )}
      </div>
      <div className="mt-2 p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
        <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>{fillIn(t.titleTemplate, values)}</p>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{fillIn(t.bodyTemplate, values)}</p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span>Opens: {linkLabel(t.defaultRoute)}</span>
        {!saved && (
          <span>
            {stat?.sent
              ? `30 days: ${stat.sent.toLocaleString('en-IN')} sent · ${pct(stat.opened, stat.sent)} opened`
              : '30 days: none sent yet'}
          </span>
        )}
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  stat,
  canEdit,
  onClose,
  onCreated,
  onUse,
}: {
  template: NotificationTemplate | null;
  stat?: TemplateStat;
  canEdit: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  onUse?: (d: PushDraft) => void;
}) {
  const isNew = !template;
  const saved = isNew || template.category === 'campaign';
  const [d, setD] = useState<Draft>(() => toDraft(template));
  const baseline = useMemo(() => toDraft(template), [template]);
  const dirty = JSON.stringify(d) !== JSON.stringify(baseline);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The app's own pushes fill in what the code passes; saved messages, the campaign variables.
  const allowed = saved ? CAMPAIGN_VARIABLES.map((v) => v.key) : template.variables;
  const used = variablesIn(d.titleTemplate, d.bodyTemplate, saved ? '' : d.defaultRoute);
  const unknown = used.filter((v) => !allowed.includes(v));
  const [samples, setSamples] = useState<Record<string, string>>(() =>
    sampleValues(saved ? CAMPAIGN_VARIABLES.map((v) => v.key) : template.variables),
  );
  const shownTitle = fillIn(d.titleTemplate, samples);
  const shownBody = fillIn(d.bodyTemplate, samples);

  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<'title' | 'body'>('body');

  const update = useUpdateTemplate();
  const create = useCreateTemplate();
  const reset = useResetTemplate();
  const remove = useDeleteTemplate();
  const test = useTestTemplate();
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const insertVar = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocus.current === 'title') insertAtCursor(titleRef.current, d.titleTemplate, token, (v) => set({ titleTemplate: v }));
    else insertAtCursor(bodyRef.current, d.bodyTemplate, token, (v) => set({ bodyTemplate: v }));
  };

  const problem =
    !d.name.trim() ? 'Give it a name'
      : !d.titleTemplate.trim() ? 'Add a title'
        : !d.bodyTemplate.trim() ? 'Add a message'
          : d.defaultRoute && !d.defaultRoute.startsWith('/') ? 'The screen path must start with /'
            : null;

  const save = async () => {
    try {
      if (isNew) {
        const t = await create.mutateAsync({
          name: d.name.trim(),
          description: d.description.trim() || undefined,
          titleTemplate: d.titleTemplate.trim(),
          bodyTemplate: d.bodyTemplate.trim(),
          defaultRoute: d.defaultRoute || '/',
          defaultImageUrl: d.defaultImageUrl.trim() || undefined,
          type: d.type,
        });
        toast.success(`Saved “${t.name}”`);
        onCreated(t.id);
        return;
      }
      await update.mutateAsync({
        id: template.id,
        payload: {
          name: d.name.trim(),
          description: d.description.trim() || null,
          titleTemplate: d.titleTemplate.trim(),
          bodyTemplate: d.bodyTemplate.trim(),
          defaultRoute: d.defaultRoute.trim() || null,
          defaultImageUrl: d.defaultImageUrl.trim() || null,
          ...(saved ? { type: d.type } : {}),
        },
      });
      toast.success('Saved. New pushes use this wording from now on.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save'));
    }
  };

  const sendTest = async () => {
    if (!template) return;
    try {
      const r = await test.mutateAsync({ id: template.id, variables: samples });
      if (!r.devices) toast.warn("Your admin account isn't signed in to the Tijarah app on any phone. Sign in there to get tests.");
      else if (!r.delivered) toast.error("Couldn't reach your phone. The app may have been uninstalled.");
      else toast.success(`Test sent to your phone (${r.delivered} ${r.delivered === 1 ? 'device' : 'devices'})`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the test'));
    }
  };

  const doReset = async () => {
    if (!template) return;
    try {
      const t = await reset.mutateAsync(template.id);
      setD(toDraft(t));
      setConfirmReset(false);
      toast.success('Back to the original wording');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not reset it'));
    }
  };

  const doDelete = async () => {
    if (!template) return;
    try {
      await remove.mutateAsync(template.id);
      toast.success(`Deleted “${template.name}”`);
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not delete it'));
    }
  };

  const busy = update.isPending || create.isPending;

  return (
    <>
    <DetailPanel
      open
      onClose={onClose}
      width="880px"
      title={isNew ? 'New saved message' : template.name}
      subtitle={
        isNew ? 'Write it once, send it as a campaign whenever you need it'
          : saved ? 'Saved message'
            : `${template.isActive ? 'On' : 'Off'} · ${stat?.sent ? `${stat.sent} sent in 30 days, ${pct(stat.opened, stat.sent)} opened` : 'none sent in 30 days'}`
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {saved && !isNew && onUse && (
            <button
              onClick={() => onUse({
                title: d.titleTemplate,
                body: d.bodyTemplate,
                imageUrl: d.defaultImageUrl || undefined,
                route: d.defaultRoute || '/',
                type: d.type,
                templateId: template.id,
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <Send className="w-3.5 h-3.5" /> Use in a push
            </button>
          )}
          {!isNew && canEdit && (
            <button
              onClick={sendTest}
              disabled={dirty || test.isPending}
              title={dirty ? 'Save first, then test' : 'Send it to your own phone with the sample values'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              {test.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              {dirty ? 'Save to test' : 'Test on my phone'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={save}
              disabled={!!problem || (!dirty && !isNew) || busy}
              className="px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {busy ? 'Saving…' : isNew ? 'Save message' : 'Save changes'}
            </button>
          )}
        </div>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_300px] gap-5">
        <div className="space-y-4 min-w-0">
          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Name</label>
            <input
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={INPUT}
              placeholder="e.g. Friday deals reminder"
              maxLength={200}
            />
            {!saved && template.description && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sent automatically: {template.description}</p>
            )}
          </div>
          {saved && (
            <div>
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Note (optional)</label>
              <input
                value={d.description}
                onChange={(e) => set({ description: e.target.value })}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={INPUT}
                placeholder="When to use it, e.g. every Thursday evening"
                maxLength={1000}
              />
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between">
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Title</label>
              <span className="text-[11px]" style={{ color: shownTitle.length > TITLE_LIMIT ? 'var(--color-warning-dark)' : 'var(--text-muted)' }}>
                {shownTitle.length}/{TITLE_LIMIT}
              </span>
            </div>
            <input
              ref={titleRef}
              value={d.titleTemplate}
              onFocus={() => (lastFocus.current = 'title')}
              onChange={(e) => set({ titleTemplate: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={INPUT}
              maxLength={200}
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Message</label>
              <span className="text-[11px]" style={{ color: shownBody.length > BODY_LIMIT ? 'var(--color-warning-dark)' : 'var(--text-muted)' }}>
                {shownBody.length}/{BODY_LIMIT}
              </span>
            </div>
            <textarea
              ref={bodyRef}
              value={d.bodyTemplate}
              onFocus={() => (lastFocus.current = 'body')}
              onChange={(e) => set({ bodyTemplate: e.target.value })}
              disabled={!canEdit}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ ...INPUT, resize: 'vertical' }}
              maxLength={2000}
            />
            {allowed.length > 0 && canEdit && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] mr-1" style={{ color: 'var(--text-muted)' }}>Fill in:</span>
                {allowed.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertVar(v)}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-full font-mono"
                    style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            )}
            {unknown.length > 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
                {unknown.map((v) => `{{${v}}}`).join(', ')} {unknown.length === 1 ? "isn't" : "aren't"} filled in for this push, so{' '}
                {unknown.length === 1 ? 'it' : 'they'} will show up blank.
              </p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Picture (optional)</label>
            <input
              value={d.defaultImageUrl}
              onChange={(e) => set({ defaultImageUrl: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={INPUT}
              placeholder="https://… (2:1, e.g. 1024×512)"
              maxLength={500}
            />
          </div>

          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Tapping it opens</label>
            {saved ? (
              <PushLinkPicker value={d.defaultRoute} onChange={(r) => set({ defaultRoute: r })} audience="everyone" />
            ) : (
              <>
                <input
                  value={d.defaultRoute}
                  onChange={(e) => set({ defaultRoute: e.target.value.trim() })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 text-sm rounded-lg font-mono focus-ring"
                  style={INPUT}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {linkLabel(d.defaultRoute)}. Change this only if you know the app screen's path.
                </p>
              </>
            )}
          </div>

          {saved && (
            <div>
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Kind of push</label>
              <div className="flex gap-2">
                {(['promotional', 'system_announcement'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set({ type: k })}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg"
                    style={{
                      background: d.type === k ? 'var(--color-primary-light)' : 'var(--surface-1)',
                      color: d.type === k ? 'var(--color-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${d.type === k ? 'var(--color-primary)' : 'var(--border-default)'}`,
                    }}
                  >
                    {k === 'promotional' ? 'Promotion' : 'Announcement'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isNew && canEdit && (
            <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
              {saved ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg mt-2"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete message
                </button>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg mt-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Back to the original wording
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <PushPhonePreview
            title={shownTitle}
            body={shownBody}
            imageUrl={d.defaultImageUrl.trim() || null}
            caption={`Opens: ${linkLabel(d.defaultRoute)}`}
          />
          {Object.keys(samples).length > 0 && (
            <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--surface-1)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Sample values for the preview</p>
              {Object.keys(samples).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono w-24 truncate flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <input
                    value={samples[k]}
                    onChange={(e) => setSamples((s) => ({ ...s, [k]: e.target.value }))}
                    className="flex-1 min-w-0 px-2 py-1 text-xs rounded-md"
                    style={{ ...INPUT, background: 'var(--surface-0)' }}
                  />
                </label>
              ))}
            </div>
          )}
          {problem && dirty && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>To save: {problem}</p>}
        </div>
      </div>

    </DetailPanel>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={doReset}
        isLoading={reset.isPending}
        variant="warning"
        title="Go back to the original wording?"
        description="Your edits to the title, message, picture and link are replaced. Whether it's on or off stays as it is."
        confirmLabel="Reset"
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        isLoading={remove.isPending}
        variant="danger"
        title="Delete this saved message?"
        description="Campaigns already sent with it aren't affected."
        confirmLabel="Delete"
      />
    </>
  );
}
