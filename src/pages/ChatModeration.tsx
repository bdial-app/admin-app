import { useState } from 'react';
import { MessageSquare, Eye, XCircle, Lock, Users, MessageCircle, AlertTriangle, CheckCircle2, Flag, EyeOff, Ban } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatCard } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import { CHAT_FILTER_DEFS, CHAT_FILTER_KEYS, CHAT_SORTS, chatSegments, withChatOptions } from '../components/chat/chat-filters';
import { useChatConversations, useChatFilterOptions, useChatMessages, useRedactMessage, useCloseConversation, useChatStats } from '../hooks/useChat';
import type { ChatFilters } from '../services/chat.service';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Conversation, Message } from '../types';

const LIMIT = 20;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const timeAgo = (iso: string | null) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

/** Small pill for a safety flag on a row. */
function Flag_({ icon: Icon, label, color, bg }: { icon: typeof Flag; label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: bg, color }} title={label}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function ChatModeration() {
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(CHAT_FILTER_KEYS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [confirmClose, setConfirmClose] = useState<Conversation | null>(null);
  const [confirmRedact, setConfirmRedact] = useState<Message | null>(null);

  const { data, isLoading } = useChatConversations({
    ...(filters as ChatFilters),
    sort: (sort || undefined) as ChatFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = useChatFilterOptions();

  const { data: messagesData } = useChatMessages(selectedConversation?.id || '');
  const { data: stats } = useChatStats();
  const closeMutation = useCloseConversation();
  const redactMutation = useRedactMessage();

  const totalCount = filterOptions?.counts.total ?? stats?.totalConversations;

  const handleClose = async () => {
    if (!confirmClose) return;
    try {
      await closeMutation.mutateAsync(confirmClose.id);
      toast.success('Conversation closed');
      setConfirmClose(null);
      setSelectedConversation(null);
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

  const getParticipantNames = (conversation: Conversation) => {
    if (!conversation.participants || conversation.participants.length === 0) return '—';
    return conversation.participants
      .map((p) => p.user?.name || p.user?.mobileNumber || 'Unknown')
      .join(' ↔ ');
  };

  const getParticipantRoles = (conversation: Conversation) => {
    if (!conversation.participants || conversation.participants.length === 0) return '';
    return conversation.participants.map((p) => p.role).join(' ↔ ');
  };

  const hasFlags = (row: Conversation) => row.reported || row.hasRedacted || row.blocked;

  const columns: Column<Conversation>[] = [
    {
      key: 'participants',
      header: 'Conversation',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: row.status === 'active' ? 'var(--color-success-light)' : row.status === 'closed' ? 'var(--color-danger-light)' : 'var(--surface-2)',
              color: row.status === 'active' ? 'var(--color-success)' : row.status === 'closed' ? 'var(--color-danger)' : 'var(--text-muted)',
            }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {getParticipantNames(row)}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {getParticipantRoles(row)} • {row.type || 'direct'}
              {row.contextTitle && ` • "${row.contextTitle}"`}
              {row.providerCity && ` • ${row.providerCity}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'lastMessage',
      header: 'Last Message',
      render: (row) => (
        <div className="min-w-0 max-w-[200px]">
          <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
            {row.lastMessagePreview || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'messageCount',
      header: 'Messages',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm tabular-nums" style={{ color: row.messageCount ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          <MessageCircle className="h-3.5 w-3.5" />
          {row.messageCount ?? '—'}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (row) =>
        hasFlags(row) ? (
          <div className="flex flex-wrap items-center gap-1">
            {row.reported && <Flag_ icon={Flag} label="Reported" color="var(--color-danger)" bg="var(--color-danger-light)" />}
            {row.hasRedacted && <Flag_ icon={EyeOff} label="Redacted" color="var(--color-warning-dark)" bg="var(--color-warning-light)" />}
            {row.blocked && <Flag_ icon={Ban} label="Blocked" color="var(--text-secondary)" bg="var(--surface-2)" />}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'lastMessageAt',
      header: 'Last Activity',
      render: (row) => (
        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }} title={formatDate(row.lastMessageAt)}>
          {timeAgo(row.lastMessageAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <button
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelectedConversation(row); }}
          aria-label="View conversation"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Chat Moderation"
        description={
          data?.meta
            ? hasNarrowing && totalCount != null
              ? `${data.meta.total.toLocaleString()} of ${totalCount.toLocaleString()} conversations match your filters`
              : `${data.meta.total.toLocaleString()} conversations`
            : 'Monitor and moderate conversations'
        }
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Chat Moderation' },
        ]}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Conversations" value={stats.totalConversations} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Active" value={stats.activeConversations} icon={<CheckCircle2 className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Closed" value={stats.closedConversations} icon={<Lock className="w-5 h-5" />} accent="var(--color-danger)" />
          <StatCard title="Total Messages" value={stats.totalMessages} icon={<MessageCircle className="w-5 h-5" />} accent="var(--color-info)" />
        </div>
      )}

      <FilterBar
        defs={withChatOptions(CHAT_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by name, mobile, product title, or message…' }}
        sort={{ options: CHAT_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: most recent' }}
        segments={chatSegments(filterOptions)}
        resultCount={hasNarrowing ? data?.meta?.total : undefined}
        totalCount={totalCount}
      />

      <DataTable<Conversation>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelectedConversation}
        emptyIcon={<MessageSquare className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle={hasNarrowing ? 'No conversations match these filters' : 'No conversations yet'}
        emptyDescription={hasNarrowing ? 'Remove a filter or pick a different segment above.' : 'Conversations appear here as customers message businesses.'}
      />

      {/* Conversation Detail + Messages */}
      <DetailPanel
        open={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        title="Conversation Details"
        subtitle={selectedConversation ? getParticipantNames(selectedConversation) : undefined}
        width="lg"
        actions={
          selectedConversation?.status === 'active' ? (
            <button
              onClick={() => setConfirmClose(selectedConversation)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2"
              style={{ background: 'var(--color-danger)' }}
            >
              <Lock className="w-4 h-4" />
              Force Close
            </button>
          ) : undefined
        }
      >
        {selectedConversation && (
          <div className="space-y-5">
            {/* Safety flags */}
            {hasFlags(selectedConversation) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedConversation.reported && <Flag_ icon={Flag} label="Reported" color="var(--color-danger)" bg="var(--color-danger-light)" />}
                {selectedConversation.hasRedacted && <Flag_ icon={EyeOff} label="Has redactions" color="var(--color-warning-dark)" bg="var(--color-warning-light)" />}
                {selectedConversation.blocked && <Flag_ icon={Ban} label="Participant blocked" color="var(--text-secondary)" bg="var(--surface-2)" />}
              </div>
            )}

            {/* Conversation Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
                <StatusBadge status={selectedConversation.status} />
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Type</p>
                <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                  {selectedConversation.type || 'direct'}
                </span>
              </div>
              {selectedConversation.contextTitle && (
                <div className="p-3 rounded-lg col-span-2" style={{ background: 'var(--surface-1)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Context</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selectedConversation.contextTitle}
                    {selectedConversation.contextType && (
                      <span className="ml-2 text-xs opacity-60">({selectedConversation.contextType})</span>
                    )}
                  </p>
                </div>
              )}
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Created</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(selectedConversation.createdAt)}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Last Activity</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(selectedConversation.lastMessageAt)}</p>
              </div>
            </div>

            {/* Participants */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Participants</p>
              <div className="space-y-2">
                {selectedConversation.participants?.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {(p.user?.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {p.user?.name || p.user?.mobileNumber || 'Unknown'}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {p.user?.mobileNumber && p.user.name ? p.user.mobileNumber : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded capitalize"
                        style={{ background: p.role === 'provider' ? 'var(--color-info-light)' : 'var(--color-success-light)', color: p.role === 'provider' ? 'var(--color-info)' : 'var(--color-success)' }}
                      >
                        {p.role}
                      </span>
                      {p.unreadCount > 0 && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-warning)' }}>
                          {p.unreadCount} unread
                        </p>
                      )}
                      {p.blockedAt && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-danger)' }}>
                          blocked
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages Timeline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Messages ({messagesData?.meta?.total || 0})
                </p>
                {messagesData?.meta && messagesData.meta.total > messagesData.items.length && (
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Showing latest {messagesData.items.length}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                {messagesData?.items?.map((msg) => {
                  const isRedacted = !!msg.deletedAt;
                  const senderParticipant = selectedConversation.participants?.find((p) => p.userId === msg.senderId);
                  const isProvider = senderParticipant?.role === 'provider';
                  return (
                    <div
                      key={msg.id}
                      className="p-3 rounded-lg group relative"
                      style={{
                        background: isRedacted ? 'var(--color-danger-light)' : 'var(--surface-1)',
                        border: `1px solid ${isRedacted ? 'var(--color-danger)20' : 'var(--border-default)'}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold" style={{ color: isProvider ? 'var(--color-info)' : 'var(--color-success)' }}>
                              {msg.sender?.name || 'Unknown'}
                            </p>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-medium capitalize"
                              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                            >
                              {senderParticipant?.role || 'unknown'}
                            </span>
                            {msg.messageType !== 'text' && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                                style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}
                              >
                                {msg.messageType}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                          <p
                            className="text-sm leading-relaxed"
                            style={{
                              color: isRedacted ? 'var(--color-danger)' : 'var(--text-primary)',
                              fontStyle: isRedacted ? 'italic' : 'normal',
                            }}
                          >
                            {msg.content || `[${msg.messageType}]`}
                          </p>
                        </div>
                        {!isRedacted && (
                          <button
                            onClick={() => setConfirmRedact(msg)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: 'var(--color-danger)' }}
                            title="Redact message"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {isRedacted && (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
                        )}
                      </div>
                    </div>
                  );
                }) ?? (
                  <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
                    No messages loaded
                  </p>
                )}
              </div>
            </div>

            {/* Conversation ID */}
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                ID: {selectedConversation.id}
              </span>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Close Conversation Confirmation */}
      <ConfirmDialog
        open={!!confirmClose}
        onClose={() => setConfirmClose(null)}
        onConfirm={handleClose}
        title="Close Conversation"
        description="Are you sure you want to force-close this conversation? Participants will no longer be able to send messages. This action cannot be undone."
        confirmLabel="Close Conversation"
        variant="danger"
        isLoading={closeMutation.isPending}
      />

      {/* Redact Message Confirmation */}
      <ConfirmDialog
        open={!!confirmRedact}
        onClose={() => setConfirmRedact(null)}
        onConfirm={handleRedact}
        title="Redact Message"
        description="This will permanently replace the message content with '[Message removed by admin]'. The sender and receiver will see the redacted state. This action cannot be undone."
        confirmLabel="Redact Message"
        variant="danger"
        isLoading={redactMutation.isPending}
      />
    </div>
  );
}
