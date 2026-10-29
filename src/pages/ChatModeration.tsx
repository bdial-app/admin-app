import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, XCircle, Lock, Flag, EyeOff, Ban, ArrowRight, ExternalLink, Store, X, Clock, Hourglass,
  MessageCircle, Reply, Inbox, ChevronLeft, ChevronRight, Loader2, FileText, Package, Tag, Copy, Image as ImageIcon,
  AlertTriangle, LockOpen, Paperclip, UserRound,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { FilterBar, useUrlFilters, type FilterValues } from '../components/ui/filters';
import { CHAT_FILTER_DEFS, CHAT_FILTER_KEYS, CHAT_SORTS, chatSegments, withChatOptions } from '../components/chat/chat-filters';
import { Avatar, TierBadge } from '../components/leads/LeadBadges';
import {
  useChatConversations, useChatConversation, useChatFilterOptions, useChatThread, useRedactMessage,
  useCloseConversation, useChatStats,
} from '../hooks/useChat';
import type { ChatFilters } from '../services/chat.service';
import { fmtRelative, fmtDateTime, fmtTime, dayLabel } from '../components/whatsapp/wa-utils';
import { PUBLIC_SITE_URL, ROUTES } from '../utils/constants';
import type { Conversation, Message } from '../types';

const LIMIT = 20;
const FILTER_KEYS = CHAT_FILTER_KEYS;
/** Page state kept across filter changes: the open conversation and who it is scoped to. */
const PAGE_KEYS = ['c', 'providerId', 'business', 'customerId', 'customer'] as const;
const ALL_KEYS = [...FILTER_KEYS, ...PAGE_KEYS];

const providerPath = (id: string) => ROUTES.PROVIDER_VIEW.replace(':id', id);
const pick = (values: FilterValues, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => values[k]).map((k) => [k, values[k]])) as FilterValues;

const fmtMinutes = (m: number | null | undefined) => {
  if (m == null) return '—';
  if (m < 60) return `${m} min`;
  const h = m / 60;
  if (h < 24) return `${h < 10 ? h.toFixed(1) : Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
};

const customerOf = (c: Conversation) => c.customer ?? c.participants?.find((p) => p.role === 'customer')?.user ?? null;
const businessName = (c: Conversation) =>
  c.provider?.brandName ?? c.participants?.find((p) => p.role === 'provider')?.user?.name ?? 'Business';

export default function ChatModeration() {
  const { values, page, search, sort, update, replace, setSearch, setSort, setPage } = useUrlFilters(ALL_KEYS);
  const filters = pick(values, FILTER_KEYS);
  const keep = pick(values, PAGE_KEYS);
  const selectedId = values.c ?? null;

  const { data, isLoading, isFetching } = useChatConversations({
    ...(filters as ChatFilters),
    providerId: values.providerId,
    customerId: values.customerId,
    sort: (sort || undefined) as ChatFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = useChatFilterOptions();
  const { data: stats } = useChatStats();
  const items = data?.items ?? [];
  const fromList = items.find((c) => c.id === selectedId);
  // A deep link (e.g. from a lead) may point outside the current page.
  const { data: fetched } = useChatConversation(selectedId, !fromList);
  const active = fromList ?? fetched ?? null;

  const narrowed = Object.keys(filters).length > 0 || !!search || !!values.providerId || !!values.customerId;
  const open = (id: string | null) => update({ c: id ?? undefined });
  const scopeBusiness = (id: string, name: string) => update({ providerId: id, business: name, c: undefined });
  const scopeCustomer = (id: string, name: string) => update({ customerId: id, customer: name, c: undefined });

  return (
    <div>
      <PageHeader
        title="Chats"
        description="Who is chatting with which business — read any thread, watch reply times and step in when needed"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Chats' }]}
      />

      {/* Health */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Metric icon={MessageSquare} color="var(--color-primary)" label="Active conversations" value={stats?.activeConversations} sub={stats ? `${stats.newConversations24h} new today · ${stats.newConversations7d} this week` : undefined} />
        <Metric icon={Hourglass} color="var(--color-warning)" label="Waiting on a business" value={stats?.unansweredConversations} sub="Customer sent the last message" onClick={() => replace({ ...keep, unanswered: 'true', status: 'active' })} />
        <Metric icon={MessageCircle} color="var(--color-info)" label="Messages today" value={stats?.messages24h} sub={stats ? `${stats.activeChatters7d.toLocaleString()} people chatted this week` : undefined} />
        <Metric icon={Reply} color="var(--color-success)" label="Reply rate (30d)" value={stats?.replyRate30d != null ? `${stats.replyRate30d}%` : '—'} sub="Chats where the business answered" />
        <Metric icon={Clock} color="#8B5CF6" label="Median first reply" value={fmtMinutes(stats?.medianFirstReplyMinutes)} sub="Conversations started in 30 days" />
        <Metric icon={Flag} color="var(--color-danger)" label="Reported" value={stats?.reportedConversations} sub="A message was reported" onClick={() => replace({ ...keep, reported: 'true' })} />
      </div>

      {/* Busiest businesses */}
      {stats && stats.topBusinesses.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>Busiest (30d)</span>
          {stats.topBusinesses.map((b) => {
            const on = values.providerId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => (on ? update({ providerId: undefined, business: undefined }) : scopeBusiness(b.id, b.brandName))}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                style={{ background: on ? 'var(--color-primary)' : 'var(--surface-0)', color: on ? '#fff' : 'var(--text-primary)', border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}` }}
                title={`${b.conversations} conversations · ${b.unanswered} waiting${b.city ? ` · ${b.city}` : ''}`}
              >
                <Store className="w-3 h-3" />
                {b.brandName}
                <span className="tabular-nums opacity-70">{b.conversations}</span>
                {b.unanswered > 0 && <span className="tabular-nums px-1 rounded" style={{ background: on ? 'rgba(255,255,255,0.25)' : 'var(--color-warning-light)', color: on ? '#fff' : 'var(--color-warning-dark)' }}>{b.unanswered} waiting</span>}
              </button>
            );
          })}
        </div>
      )}

      <FilterBar
        defs={withChatOptions(CHAT_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={(next) => replace({ ...keep, ...next })}
        search={{ value: search, onChange: setSearch, placeholder: 'Search customer, business, mobile, product or message text…' }}
        sort={{ options: CHAT_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: most recent' }}
        segments={chatSegments(filterOptions)}
        resultCount={narrowed ? data?.meta?.total : undefined}
        totalCount={filterOptions?.counts.total ?? stats?.totalConversations}
      />

      {(values.providerId || values.customerId) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {values.providerId && (
            <ScopeChip icon={Store} label={values.business || 'One business'} to={providerPath(values.providerId)} onClear={() => update({ providerId: undefined, business: undefined })} />
          )}
          {values.customerId && (
            <ScopeChip icon={UserRound} label={values.customer || 'One customer'} onClear={() => update({ customerId: undefined, customer: undefined })} />
          )}
        </div>
      )}

      {/* Inbox */}
      <div className="card overflow-hidden flex" style={{ height: 'calc(100vh - 230px)', minHeight: 560 }}>
        <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] xl:w-[420px] shrink-0`} style={{ borderRight: '1px solid var(--border-default)' }}>
          <div className={`flex-1 overflow-y-auto transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
            {isLoading ? (
              <div className="p-3 space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[74px] rounded-lg animate-pulse" style={{ background: 'var(--surface-1)' }} />)}</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Inbox className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{narrowed ? 'No conversations match' : 'No conversations yet'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{narrowed ? 'Remove a filter or pick another segment.' : 'Conversations appear here as customers message businesses.'}</p>
              </div>
            ) : (
              items.map((c) => <ConversationRow key={c.id} c={c} active={c.id === selectedId} onClick={() => open(c.id)} />)
            )}
          </div>
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 text-xs shrink-0" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <span className="tabular-nums">
                {((page - 1) * LIMIT + 1).toLocaleString()}–{Math.min(page * LIMIT, data.meta.total).toLocaleString()} of {data.meta.total.toLocaleString()}
              </span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-md disabled:opacity-40 hover:bg-[var(--surface-1)]" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-md disabled:opacity-40 hover:bg-[var(--surface-1)]" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

        <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
          {selectedId && active ? (
            <Thread key={active.id} c={active} onBack={() => open(null)} onScopeBusiness={scopeBusiness} onScopeCustomer={scopeCustomer} />
          ) : selectedId ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6" style={{ background: 'var(--surface-1)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--surface-0)' }}><MessageSquare className="w-7 h-7" style={{ color: 'var(--text-muted)' }} /></div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pick a conversation</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>See the full thread, who the customer and business are, how fast the business replied, and the customer’s lead.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── List ──────────────────────────────────────────────────

function ConversationRow({ c, active, onClick }: { c: Conversation; active: boolean; onClick: () => void }) {
  const customer = customerOf(c);
  const fromCustomer = !!customer && c.lastMessageSenderId === customer.id;
  const closed = c.status !== 'active';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors"
      style={{ background: active ? 'var(--sidebar-active)' : 'transparent', borderBottom: '1px solid var(--border-light)' }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="relative shrink-0 w-11 h-11">
        <Avatar name={customer?.name} size={34} />
        <span className="absolute -bottom-0.5 -right-0.5 rounded-lg" style={{ boxShadow: '0 0 0 2px var(--surface-0)' }}>
          <Avatar name={businessName(c)} url={c.provider?.photoUrl} size={22} square />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
            {customer?.name || 'Customer'}
            <span className="font-normal" style={{ color: 'var(--text-muted)' }}> → </span>
            <span style={{ color: 'var(--color-primary)' }}>{businessName(c)}</span>
          </p>
          <span className="text-[11px] shrink-0 tabular-nums" style={{ color: c.unanswered && !closed ? 'var(--color-warning-dark)' : 'var(--text-muted)' }}>{fmtRelative(c.lastMessageAt ?? c.createdAt)}</span>
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {c.lastMessagePreview ? (
            <>
              <span style={{ color: 'var(--text-muted)' }}>{fromCustomer ? 'Customer: ' : 'Business: '}</span>
              {c.lastMessagePreview}
            </>
          ) : (
            <em style={{ color: 'var(--text-muted)' }}>No messages</em>
          )}
        </p>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {c.unanswered && !closed && <Pill color="var(--color-warning-dark)" bg="var(--color-warning-light)" icon={Hourglass}>Waiting on business</Pill>}
          {c.type === 'enquiry' && <Pill color="var(--color-info)" bg="var(--color-info-light)" icon={Package}>{c.contextTitle ? truncate(c.contextTitle, 22) : 'Enquiry'}</Pill>}
          {c.reported && <Pill color="var(--color-danger)" bg="var(--color-danger-light)" icon={Flag}>Reported</Pill>}
          {c.hasRedacted && <Pill color="var(--color-warning-dark)" bg="var(--color-warning-light)" icon={EyeOff}>Redacted</Pill>}
          {c.blocked && <Pill color="var(--text-secondary)" bg="var(--surface-2)" icon={Ban}>Blocked</Pill>}
          {closed && <Pill color="var(--text-secondary)" bg="var(--surface-2)" icon={Lock}>{c.status === 'closed' ? 'Closed' : 'Archived'}</Pill>}
          {c.lead && <TierBadge tier={c.lead.tier} />}
          <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            <MessageCircle className="w-3 h-3" />{c.messageCount ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Thread ────────────────────────────────────────────────

function Thread({ c, onBack, onScopeBusiness, onScopeCustomer }: {
  c: Conversation;
  onBack: () => void;
  onScopeBusiness: (id: string, name: string) => void;
  onScopeCustomer: (id: string, name: string) => void;
}) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useChatThread(c.id);
  const closeMutation = useCloseConversation();
  const redactMutation = useRedactMessage();
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmRedact, setConfirmRedact] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const customer = customerOf(c);
  const providerUserId = c.participants?.find((p) => p.role === 'provider')?.userId;
  const total = data?.pages[0]?.meta.total ?? 0;

  // Pages arrive newest first; show oldest at the top.
  const messages = useMemo(() => (data?.pages ?? []).flatMap((p) => p.items).slice().reverse(), [data]);
  const grouped = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const firstLoad = data?.pages.length === 1;
  // Scroll only the thread (scrollIntoView would also scroll the page).
  useEffect(() => {
    const el = scrollRef.current;
    if (firstLoad && el) el.scrollTop = el.scrollHeight;
  }, [firstLoad, messages.length]);

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync(c.id);
      toast.success('Conversation closed');
      setConfirmClose(false);
    } catch {
      toast.error('Failed to close conversation');
    }
  };
  const handleRedact = async () => {
    if (!confirmRedact) return;
    try {
      await redactMutation.mutateAsync(confirmRedact.id);
      toast.success('Message redacted');
      setConfirmRedact(null);
    } catch {
      toast.error('Failed to redact message');
    }
  };

  return (
    <>
      {/* Who is talking to whom */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>
        <div className="flex items-start gap-2">
          <button onClick={onBack} className="lg:hidden p-1 -ml-1 mt-1 rounded-md" style={{ color: 'var(--text-muted)' }} aria-label="Back"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            <Party
              role="Customer"
              name={customer?.name || 'Customer'}
              lines={[c.customer?.mobileNumber ?? customer?.mobileNumber, c.customer?.city].filter(Boolean) as string[]}
              actions={[
                ...(customer?.mobileNumber ? [{ label: 'Find in Users', to: `${ROUTES.USERS}?q=${encodeURIComponent(customer.mobileNumber)}` }] : []),
                ...(customer ? [{ label: 'All their chats', onClick: () => onScopeCustomer(customer.id, customer.name || 'Customer') }] : []),
              ]}
            />
            <div className="hidden md:flex items-center"><ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></div>
            <Party
              role="Business"
              name={businessName(c)}
              photoUrl={c.provider?.photoUrl}
              lines={[c.provider?.city, c.provider?.contactNumber, c.provider && c.provider.status !== 'active' ? `status: ${c.provider.status}` : null].filter(Boolean) as string[]}
              actions={
                c.provider
                  ? [
                      { label: 'Open business', to: providerPath(c.provider.id) },
                      ...(c.provider.slug ? [{ label: 'Public page', href: `${PUBLIC_SITE_URL}/business/${c.provider.slug}/` }] : []),
                      { label: 'All its chats', onClick: () => onScopeBusiness(c.provider!.id, c.provider!.brandName) },
                    ]
                  : []
              }
            />
          </div>
          {c.status === 'active' && (
            <button onClick={() => setConfirmClose(true)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--color-danger)' }} title="Stop both sides sending messages">
              <Lock className="w-3.5 h-3.5" /> Close
            </button>
          )}
        </div>

        {/* Facts */}
        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <StatusBadge status={c.status} />
          <span>Started {fmtDateTime(c.createdAt)}</span>
          <span className="tabular-nums">{c.customerMessages ?? 0} from customer · {c.providerMessages ?? 0} from business</span>
          <span className="inline-flex items-center gap-1" title="From the customer's first message to the business's first reply">
            <Clock className="w-3.5 h-3.5" />
            {c.firstReplyMinutes != null ? `First reply in ${fmtMinutes(c.firstReplyMinutes)}` : (c.providerMessages ?? 0) === 0 ? <span style={{ color: 'var(--color-warning-dark)' }}>Business hasn’t replied</span> : 'Business wrote first'}
          </span>
          {!!c.attachmentCount && <span className="inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" />{c.attachmentCount}</span>}
          {c.lead && (
            <Link to={`${ROUTES.LEADS}?tab=leads&lead=${c.lead.id}`} className="inline-flex items-center gap-1.5 hover:underline" title="Open this customer’s lead with the business">
              <TierBadge tier={c.lead.tier} score={c.lead.score} />
              {c.lead.isUnlocked ? <><LockOpen className="w-3.5 h-3.5" style={{ color: '#16A34A' }} /> unlocked</> : <><Lock className="w-3.5 h-3.5" /> locked</>}
            </Link>
          )}
          {(c.reported || c.hasRedacted || c.blocked) && (
            <span className="inline-flex gap-1">
              {c.reported && <Pill color="var(--color-danger)" bg="var(--color-danger-light)" icon={Flag}>Reported</Pill>}
              {c.hasRedacted && <Pill color="var(--color-warning-dark)" bg="var(--color-warning-light)" icon={EyeOff}>Redacted</Pill>}
              {c.blocked && <Pill color="var(--text-secondary)" bg="var(--surface-2)" icon={Ban}>Blocked</Pill>}
            </span>
          )}
        </div>
        {c.contextTitle && (
          <div className="flex items-center gap-2 mt-2.5 p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {c.contextImageUrl ? <img src={c.contextImageUrl} alt="" className="w-8 h-8 rounded-md object-cover" /> : <Package className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
            <p className="text-xs min-w-0 flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>About {c.contextType === 'product' ? 'the product' : 'the business'} </span>
              <span className="font-semibold">{c.contextTitle}</span>
            </p>
            {c.contextType === 'product' && c.contextId && c.provider && (
              <Link to={`${providerPath(c.provider.id)}?tab=products&product=${c.contextId}`} className="text-xs font-medium hover:underline shrink-0" style={{ color: 'var(--color-primary)' }}>View product</Link>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ background: 'var(--surface-1)' }}>
        {hasNextPage && (
          <div className="flex justify-center mb-3">
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--surface-0)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
              {isFetchingNextPage && <Loader2 className="w-3 h-3 animate-spin" />}
              Load older messages ({(total - messages.length).toLocaleString()} more)
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className={`h-14 rounded-xl animate-pulse ${i % 2 ? 'ml-auto w-2/3' : 'w-3/4'}`} style={{ background: 'var(--surface-0)' }} />)}</div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-xs py-10" style={{ color: 'var(--text-muted)' }}>No messages in this conversation.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.day} className="space-y-1.5 mb-3">
              <div className="flex justify-center py-1">
                <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-medium" style={{ background: 'var(--surface-0)', color: 'var(--text-muted)' }}>{g.day}</span>
              </div>
              {g.items.map((m, i) => (
                <Bubble
                  key={m.id}
                  m={m}
                  fromBusiness={!!providerUserId && m.senderId === providerUserId}
                  showName={i === 0 || g.items[i - 1].senderId !== m.senderId}
                  onRedact={() => setConfirmRedact(m)}
                />
              ))}
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 px-4 py-2 text-[11px] flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)', background: 'var(--surface-0)' }}>
        <span>Read-only for admins — hover a message to redact it.</span>
        <button onClick={() => { navigator.clipboard?.writeText(c.id); toast.success('Conversation ID copied'); }} className="inline-flex items-center gap-1 font-mono hover:underline"><Copy className="w-3 h-3" />{c.id.slice(0, 8)}</button>
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleClose}
        title="Close conversation"
        description={`Force-close the chat between ${customer?.name || 'the customer'} and ${businessName(c)}? Neither side will be able to send messages. This can't be undone.`}
        confirmLabel="Close conversation"
        variant="danger"
        isLoading={closeMutation.isPending}
      />
      <ConfirmDialog
        open={!!confirmRedact}
        onClose={() => setConfirmRedact(null)}
        onConfirm={handleRedact}
        title="Redact message"
        description="This permanently replaces the message with '[Message removed by admin]'. Both sides will see it was removed. This can't be undone."
        confirmLabel="Redact message"
        variant="danger"
        isLoading={redactMutation.isPending}
      />
    </>
  );
}

function Bubble({ m, fromBusiness, showName, onRedact }: { m: Message; fromBusiness: boolean; showName: boolean; onRedact: () => void }) {
  const redacted = !!m.deletedAt;
  if (m.messageType === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] px-2.5 py-1 rounded-lg italic" style={{ color: 'var(--text-muted)' }}>{m.content || String(m.metadata?.action ?? 'system')}</span>
      </div>
    );
  }
  return (
    <div className={`group flex items-end gap-1.5 ${fromBusiness ? 'justify-end' : 'justify-start'}`}>
      {fromBusiness && !redacted && <RedactButton onClick={onRedact} />}
      <div
        className={`max-w-[78%] md:max-w-[65%] rounded-2xl px-3 pt-1.5 pb-1 ${fromBusiness ? 'rounded-br-md' : 'rounded-bl-md'}`}
        style={{
          // Tinted over the surface so it reads in both themes (--color-primary-light has no dark value).
          background: redacted ? 'var(--color-danger-light)' : fromBusiness ? 'color-mix(in srgb, var(--color-primary) 16%, var(--surface-0))' : 'var(--surface-0)',
          border: `1px solid ${redacted ? 'transparent' : fromBusiness ? 'transparent' : 'var(--border-light)'}`,
        }}
      >
        {showName && (
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: fromBusiness ? 'var(--color-primary)' : 'var(--color-success)' }}>
            {m.sender?.name || (fromBusiness ? 'Business' : 'Customer')}
            <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>· {fromBusiness ? 'business' : 'customer'}</span>
          </p>
        )}
        {redacted ? (
          <p className="text-sm italic inline-flex items-center gap-1.5" style={{ color: 'var(--color-danger)' }}><AlertTriangle className="w-3.5 h-3.5" />{m.content || 'Message removed by admin'}</p>
        ) : (
          <MessageBody m={m} />
        )}
        <p className="text-[10.5px] text-right tabular-nums mt-0.5" style={{ color: 'var(--text-muted)' }} title={fmtDateTime(m.createdAt)}>
          {fmtTime(m.createdAt)}
          {fromBusiness && m.status === 'read' && <span className="ml-1">· read</span>}
        </p>
      </div>
      {!fromBusiness && !redacted && <RedactButton onClick={onRedact} />}
    </div>
  );
}

function MessageBody({ m }: { m: Message }) {
  const md = (m.metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof md[k] === 'string' ? (md[k] as string) : null);
  const text = m.content ? <p className="text-sm leading-snug whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>{m.content}</p> : null;

  if (m.messageType === 'image') {
    const url = str('thumbnailUrl') ?? str('url');
    return (
      <div className="pt-0.5">
        {url ? (
          <a href={str('url') ?? url} target="_blank" rel="noreferrer"><img src={url} alt="" className="rounded-lg max-h-56 object-cover" /></a>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}><ImageIcon className="w-4 h-4" /> Image</span>
        )}
        {text && <div className="mt-1">{text}</div>}
      </div>
    );
  }
  if (m.messageType === 'file') {
    return (
      <div className="pt-0.5">
        <a href={str('url') ?? '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          <FileText className="w-5 h-5 shrink-0" style={{ color: 'var(--color-danger)' }} />
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{str('fileName') ?? 'Document'}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        </a>
        {str('caption') && <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{str('caption')}</p>}
      </div>
    );
  }
  if ((m.messageType === 'product' || m.messageType === 'enquiry') && str('productName')) {
    const price = typeof md.productPrice === 'number' ? md.productPrice : null;
    return (
      <div className="pt-0.5 space-y-1">
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {str('productImage') ? <img src={str('productImage')!} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" /> : <Package className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{str('productName')}</p>
            {price != null && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{price.toLocaleString('en-IN')}</p>}
          </div>
        </div>
        {m.messageType === 'enquiry' && text}
      </div>
    );
  }
  if (m.messageType === 'deal' && str('title')) {
    const value = typeof md.discountValue === 'number' ? md.discountValue : null;
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg mt-0.5" style={{ background: 'var(--color-warning-light)' }}>
        <Tag className="w-4 h-4 shrink-0" style={{ color: 'var(--color-warning-dark)' }} />
        <div className="min-w-0">
          {value != null && <p className="text-xs font-bold" style={{ color: 'var(--color-warning-dark)' }}>{md.discountType === 'percentage' ? `${value}% OFF` : `₹${value.toLocaleString('en-IN')} OFF`}</p>}
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{str('title')}</p>
        </div>
      </div>
    );
  }
  if (m.messageType === 'quote_request') {
    return (
      <div className="pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Quote request</p>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{str('description') ?? m.content}</p>
        {(md.budget != null || md.deadline != null) && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{[md.budget != null ? `Budget ${String(md.budget)}` : null, md.deadline != null ? `By ${String(md.deadline)}` : null].filter(Boolean).join(' · ')}</p>
        )}
      </div>
    );
  }
  return text ?? <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>[{m.messageType}]</p>;
}

// ── Small pieces ──────────────────────────────────────────

function RedactButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0 mb-1" style={{ color: 'var(--color-danger)' }} title="Redact message" aria-label="Redact message">
      <XCircle className="w-4 h-4" />
    </button>
  );
}

function Party({ role, name, photoUrl, lines, actions }: {
  role: string;
  name: string;
  photoUrl?: string | null;
  lines: string[];
  actions: { label: string; to?: string; href?: string; onClick?: () => void }[];
}) {
  const isBusiness = role === 'Business';
  return (
    <div className="flex items-start gap-2.5 p-2 rounded-lg min-w-0" style={{ background: 'var(--surface-1)' }}>
      <Avatar name={name} url={photoUrl} size={36} square={isBusiness} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isBusiness ? 'var(--color-primary)' : 'var(--color-success)' }}>{role}</p>
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
        {lines.length > 0 && <p className="text-[11px] truncate tabular-nums" style={{ color: 'var(--text-muted)' }}>{lines.join(' · ')}</p>}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
            {actions.map((a) => {
              const cls = 'inline-flex items-center gap-0.5 text-[11px] font-medium hover:underline';
              const style = { color: 'var(--color-primary)' };
              if (a.to) return <Link key={a.label} to={a.to} className={cls} style={style}>{a.label}<ArrowRight className="w-3 h-3" /></Link>;
              if (a.href) return <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className={cls} style={style}>{a.label}<ExternalLink className="w-3 h-3" /></a>;
              return <button key={a.label} onClick={a.onClick} className={cls} style={style}>{a.label}</button>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, color, label, value, sub, onClick }: { icon: typeof Clock; color: string; label: string; value?: number | string; sub?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-3.5 ${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}`}
      style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-1.5">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        <p className="text-[11px] font-semibold uppercase tracking-wide leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>{value == null ? '—' : typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

function Pill({ icon: Icon, color, bg, children }: { icon: typeof Clock; color: string; bg: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: bg, color }}>
      <Icon className="w-3 h-3" />
      {children}
    </span>
  );
}

function ScopeChip({ icon: Icon, label, to, onClear }: { icon: typeof Clock; label: string; to?: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      {to && <Link to={to} className="font-medium opacity-80 hover:underline">open</Link>}
      <button onClick={onClear} className="p-0.5 rounded-full hover:bg-[var(--surface-0)]" aria-label="Clear"><X className="w-3.5 h-3.5" /></button>
    </span>
  );
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
