import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, Send, FileText, ChevronLeft, Info, Inbox as InboxIcon, Loader2, ExternalLink, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { DetailPanel } from '../../components/ui/DetailPanel';
import { useHasPermission } from '../../hooks/usePermissions';
import { useWaConversations, useWaThread, useWaReply, useMarkWaRead, useWaSettings } from '../../hooks/useWhatsApp';
import { ConsentBadge } from '../../components/whatsapp/ConsentBadge';
import { WindowTimer } from '../../components/whatsapp/WindowTimer';
import { MessageStatusIcon } from '../../components/whatsapp/MessageStatusIcon';
import { SendTemplateDialog } from '../../components/whatsapp/SendTemplateDialog';
import { ContactEditor } from '../../components/whatsapp/ContactEditor';
import { Skel } from '../../components/whatsapp/Skeleton';
import { useNow } from '../../components/whatsapp/useNow';
import { renderWaMarkdown } from '../../components/whatsapp/wa-markdown';
import { WA_ROUTES, fmtRelative, fmtTime, dayLabel, initials, apiErrorMessage } from '../../components/whatsapp/wa-utils';
import { ROUTES } from '../../utils/constants';
import type { WaConversation, WaConversationFilter, WaMessage } from '../../types';

const FILTERS: { label: string; value: WaConversationFilter }[] = [
  { label: 'All', value: 'all' }, { label: 'Unread', value: 'unread' }, { label: 'Window open', value: 'open_window' },
];

export default function Inbox() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<WaConversationFilter>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const now = useNow(60_000);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useWaConversations({ page: 1, limit: 50, filter, search: debounced || undefined });
  const conversations = data?.items ?? [];
  const active = conversations.find((c) => c.contactId === contactId);

  return (
    <div className="card overflow-hidden flex" style={{ height: 'calc(100vh - 260px)', minHeight: 520 }}>
      {/* Left: conversation list */}
      <div className={`${contactId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[340px] xl:w-[380px] shrink-0`} style={{ borderRight: '1px solid var(--border-default)' }}>
        <div className="p-3 space-y-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or business…" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {FILTERS.map((f) => (
              <button key={f.value} onClick={() => setFilter(f.value)} className="flex-1 px-2 py-1 text-xs font-medium rounded-md transition-colors" style={{ background: filter === f.value ? 'var(--surface-0)' : 'transparent', color: filter === f.value ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: filter === f.value ? 'var(--shadow-sm)' : 'none' }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skel key={i} className="h-16" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <InboxIcon className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{filter === 'unread' ? 'Nothing unread' : filter === 'open_window' ? 'No open windows' : 'No conversations yet'}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{filter === 'all' ? 'Replies to your campaigns land here. Send a campaign to get started.' : 'Try the “All” filter.'}</p>
            </div>
          ) : (
            conversations.map((c) => <ConversationRow key={c.contactId} c={c} now={now} active={c.contactId === contactId} onClick={() => navigate(WA_ROUTES.thread(c.contactId))} />)
          )}
        </div>
      </div>

      {/* Right: thread */}
      <div className={`${contactId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
        {contactId ? (
          <Thread key={contactId} contactId={contactId} summary={active} onBack={() => navigate(WA_ROUTES.inbox)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 wa-wallpaper">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--wa-bubble-in)' }}><InboxIcon className="w-7 h-7" style={{ color: 'var(--wa-time)' }} /></div>
            <p className="text-sm font-semibold" style={{ color: 'var(--wa-text)' }}>Pick a conversation</p>
            <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--wa-time)' }}>Replies within 24h of a contact’s last message are free; after that you need an approved template.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ c, active, onClick, now }: { c: WaConversation; active: boolean; onClick: () => void; now: number }) {
  const name = c.provider?.brandName ?? c.displayName ?? c.phone;
  const windowOpen = !!c.windowExpiresAt && new Date(c.windowExpiresAt).getTime() > now;
  return (
    <button onClick={onClick} className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors" style={{ background: active ? 'var(--sidebar-active)' : 'transparent', borderBottom: '1px solid var(--border-light)' }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{initials(name)}</div>
        {windowOpen && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: '#25D366', borderColor: 'var(--surface-0)' }} title="24h window open" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate flex-1 ${c.unreadCount ? 'font-bold' : 'font-medium'}`} style={{ color: 'var(--text-primary)' }}>{name}</p>
          <span className="text-[11px] shrink-0 tabular-nums" style={{ color: c.unreadCount ? '#25D366' : 'var(--text-muted)' }}>{c.lastMessage ? fmtRelative(c.lastMessage.at) : ''}</span>
        </div>
        {c.provider && c.displayName && <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{c.displayName} · {c.phone}</p>}
        {!c.provider && <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{c.phone}</p>}
        <div className="flex items-center gap-1.5 mt-0.5">
          {c.lastMessage?.direction === 'outbound' && <MessageStatusIcon status={c.lastMessage.status} size={13} />}
          <p className={`text-xs truncate flex-1 ${c.unreadCount ? 'font-medium' : ''}`} style={{ color: c.unreadCount ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {c.lastMessage?.body || (c.lastMessage ? `[${c.lastMessage.kind}]` : 'No messages')}
          </p>
          {c.unreadCount > 0 && <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white tabular-nums shrink-0" style={{ background: '#25D366' }}>{c.unreadCount}</span>}
        </div>
      </div>
    </button>
  );
}

function Thread({ contactId, summary, onBack }: { contactId: string; summary?: WaConversation; onBack: () => void }) {
  const canSend = useHasPermission('whatsapp.send');
  const { data: settings } = useWaSettings();
  const { data: thread, isLoading } = useWaThread(contactId);
  const reply = useWaReply();
  const markRead = useMarkWaRead();
  const [text, setText] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<string | null>(null);
  const now = useNow(30_000);

  const contact = thread?.contact;
  const unread = contact?.unreadCount ?? summary?.unreadCount ?? 0;

  // Mark read once per thread open when there is something unread.
  useEffect(() => {
    if (!thread || unread === 0 || markedRef.current === contactId) return;
    markedRef.current = contactId;
    markRead.mutate(contactId);
  }, [thread, unread, contactId, markRead]);

  const count = thread?.items.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [count, contactId]);

  const windowExpiresAt = thread?.windowExpiresAt ?? summary?.windowExpiresAt ?? null;
  const windowOpen = !!windowExpiresAt && new Date(windowExpiresAt).getTime() > now;
  const name = contact?.provider?.brandName ?? summary?.provider?.brandName ?? contact?.displayName ?? summary?.displayName ?? summary?.phone ?? '';
  const phone = contact?.phone ?? summary?.phone ?? '';
  const providerId = contact?.provider?.id ?? summary?.provider?.id;

  const grouped = useMemo(() => {
    const out: { day: string; items: WaMessage[] }[] = [];
    for (const m of thread?.items ?? []) {
      const day = dayLabel(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m); else out.push({ day, items: [m] });
    }
    return out;
  }, [thread]);

  const sendText = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      await reply.mutateAsync({ contactId, payload: { text: body } });
      setText('');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send — the 24h window may have closed'));
    }
  };

  const sendTemplate = async (templateId: string, variables: Record<string, string>) => {
    try {
      await reply.mutateAsync({ contactId, payload: { templateId, variables } });
      toast.success('Template queued');
      setTemplateOpen(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the template'));
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>
        <button onClick={onBack} className="lg:hidden p-1 rounded-md" style={{ color: 'var(--text-muted)' }} aria-label="Back"><ChevronLeft className="w-5 h-5" /></button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{initials(name)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name || <Skel className="h-4 w-32" />}</p>
            {contact && <ConsentBadge consent={contact.consent} />}
            <WindowTimer expiresAt={windowExpiresAt} />
          </div>
          <p className="text-xs truncate tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {phone}
            {providerId && <> · <Link to={ROUTES.PROVIDER_VIEW.replace(':id', providerId)} className="inline-flex items-center gap-0.5 hover:underline" style={{ color: 'var(--color-primary)' }}>Open business <ExternalLink className="w-3 h-3" /></Link></>}
          </p>
        </div>
        <button onClick={() => setInfoOpen(true)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }} aria-label="Contact info" title="Contact info"><Info className="w-4.5 h-4.5" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto wa-wallpaper px-4 py-4">
        {isLoading ? (
          <div className="space-y-3 max-w-md">{[0, 1, 2].map((i) => <Skel key={i} className={`h-14 ${i % 2 ? 'ml-auto w-2/3' : 'w-3/4'}`} />)}</div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-xs py-10" style={{ color: 'var(--wa-time)' }}>No messages yet.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.day} className="space-y-1.5 mb-3">
              <div className="flex justify-center py-1">
                <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-medium shadow-sm" style={{ background: 'var(--wa-day-chip)', color: 'var(--wa-time)' }}>{g.day}</span>
              </div>
              {g.items.map((m) => <Bubble key={m.id} m={m} />)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 px-3 py-2.5" style={{ background: 'var(--wa-composer)', borderTop: '1px solid var(--border-default)' }}>
        {!canSend ? (
          <p className="text-xs text-center py-1.5" style={{ color: 'var(--text-muted)' }}>Replying needs the admin role.</p>
        ) : windowOpen ? (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendText(); } }}
              rows={1}
              placeholder="Type a reply… (⌘/Ctrl + Enter to send)"
              className="flex-1 px-3.5 py-2.5 text-sm rounded-2xl focus-ring resize-none max-h-32"
              style={{ background: 'var(--wa-bubble-in)', color: 'var(--wa-text)', border: '1px solid transparent', minHeight: 42 }}
            />
            <button onClick={() => setTemplateOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--wa-bubble-in)', color: 'var(--wa-time)' }} title="Send a template instead" aria-label="Send template"><FileText className="w-4.5 h-4.5" /></button>
            <button onClick={sendText} disabled={!text.trim() || reply.isPending} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white disabled:opacity-50" style={{ background: '#00A884' }} aria-label="Send">
              {reply.isPending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><Lock className="w-3.5 h-3.5" /> The 24h window is closed — free-text replies would be rejected by Meta (error 131047).</p>
            <button onClick={() => setTemplateOpen(true)} disabled={settings?.configured === false} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: '#128C7E' }}><FileText className="w-4 h-4" /> Send template</button>
          </div>
        )}
      </div>

      <SendTemplateDialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        recipientLabel={[name, phone].filter(Boolean).join(' · ')}
        prefill={{ brand_name: contact?.provider?.brandName ?? summary?.provider?.brandName, city: contact?.provider?.city ?? summary?.provider?.city ?? undefined }}
        onSend={sendTemplate}
        isSending={reply.isPending}
        rates={settings?.rates}
      />

      <DetailPanel open={infoOpen} onClose={() => setInfoOpen(false)} title={name} subtitle={phone} width="420px">
        {contact ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <ConsentBadge consent={contact.consent} size="md" />
              <WindowTimer expiresAt={windowExpiresAt} size="md" />
              {!contact.reachable && <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>Not on WhatsApp</span>}
            </div>
            {contact.provider && (
              <Link to={ROUTES.PROVIDER_VIEW.replace(':id', contact.provider.id)} className="flex items-center justify-between p-3 rounded-lg text-sm" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>
                <span><span className="font-semibold">{contact.provider.brandName}</span>{contact.provider.city ? <span style={{ color: 'var(--text-muted)' }}> · {contact.provider.city}</span> : null}</span>
                <ExternalLink className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </Link>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Messages sent</dt><dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{contact.messagesSent}</dd></div>
              <div><dt className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Last campaign</dt><dd className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{contact.lastCampaignName ?? '—'}</dd></div>
            </dl>
            <ContactEditor key={contact.id} contact={contact} />
          </div>
        ) : <Skel className="h-40" />}
      </DetailPanel>
    </>
  );
}

function Bubble({ m }: { m: WaMessage }) {
  const out = m.direction === 'outbound';
  const failed = m.status === 'failed';
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`wa-bubble max-w-[78%] md:max-w-[65%] rounded-lg px-2.5 pt-1.5 pb-1 ${out ? 'rounded-tr-none ml-2' : 'rounded-tl-none mr-2'}`}
        data-side={out ? 'out' : 'in'}
        style={{ background: out ? 'var(--wa-bubble-out)' : 'var(--wa-bubble-in)', color: 'var(--wa-text)', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
      >
        {m.templateName && (
          <p className="text-[10.5px] font-mono mb-0.5 inline-flex items-center gap-1" style={{ color: 'var(--wa-time)' }}>
            <FileText className="w-3 h-3" /> {m.templateName}{m.campaign ? <> · <Link to={WA_ROUTES.campaign(m.campaign.id)} className="hover:underline">{m.campaign.name}</Link></> : null}
          </p>
        )}
        <p className="text-[14px] leading-[1.35] whitespace-pre-wrap break-words">{m.body ? renderWaMarkdown(m.body) : <em style={{ color: 'var(--wa-time)' }}>[{m.kind}]</em>}</p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          {failed && m.errorMessage && <span className="text-[10.5px] mr-auto" style={{ color: 'var(--color-danger)' }}>{m.errorMessage}</span>}
          <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--wa-time)' }}>{fmtTime(m.createdAt)}</span>
          {out && <MessageStatusIcon status={m.status} size={14} inBubble />}
        </div>
      </div>
    </div>
  );
}
