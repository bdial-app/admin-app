import { useState } from 'react';
import { MessageSquare, Eye, XCircle, Lock, Users } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';
import { useChatConversations, useChatMessages, useRedactMessage, useCloseConversation, useChatStats } from '../hooks/useChat';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Conversation, Message } from '../types';

const LIMIT = 10;
const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'Closed', value: 'closed' },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function ChatModeration() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [confirmClose, setConfirmClose] = useState<Conversation | null>(null);
  const [confirmRedact, setConfirmRedact] = useState<Message | null>(null);

  const { data, isLoading } = useChatConversations({
    page,
    limit: LIMIT,
    status: status || undefined,
    search: search || undefined,
  });

  const { data: messagesData } = useChatMessages(selectedConversation?.id || '');
  const { data: stats } = useChatStats();
  const closeMutation = useCloseConversation();
  const redactMutation = useRedactMessage();

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

  const columns: Column<Conversation>[] = [
    {
      key: 'participants',
      header: 'Participants',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {getParticipantNames(row)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {row.type || 'direct'}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'lastMessageAt',
      header: 'Last Message',
      sortable: true,
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.lastMessageAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelectedConversation(row); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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
        description="Monitor and moderate conversations"
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Chat Moderation' },
        ]}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Conversations" value={stats.totalConversations} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Active" value={stats.activeConversations} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Closed" value={stats.closedConversations} icon={<Lock className="w-5 h-5" />} accent="var(--color-danger)" />
          <StatCard title="Total Messages" value={stats.totalMessages} icon={<MessageSquare className="w-5 h-5" />} accent="var(--color-info)" />
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: status === tab.value ? 'var(--surface-0)' : 'transparent',
              color: status === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: status === tab.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable<Conversation>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by participant name or mobile…"
        searchValue={search}
        rowKey={(row) => row.id}
        onRowClick={setSelectedConversation}
      />

      {/* Conversation Detail + Messages */}
      <DetailPanel
        open={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        title="Conversation"
        subtitle={selectedConversation ? getParticipantNames(selectedConversation) : undefined}
        width="lg"
        actions={
          selectedConversation?.status === 'active' ? (
            <button
              onClick={() => setConfirmClose(selectedConversation)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white"
              style={{ background: 'var(--color-danger)' }}
            >
              <Lock className="w-4 h-4 inline mr-1.5" />
              Close Conversation
            </button>
          ) : undefined
        }
      >
        {selectedConversation && (
          <div className="space-y-4">
            {/* Participants */}
            <div>
              <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Participants</p>
              <div className="flex flex-wrap gap-2">
                {selectedConversation.participants?.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                  >
                    {p.user?.name || p.user?.mobileNumber || 'Unknown'}
                    <span className="opacity-60">({p.role})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Messages Timeline */}
            <div>
              <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Messages ({messagesData?.meta?.total || 0})
              </p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {messagesData?.items?.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg group relative"
                    style={{
                      background: msg.deletedAt ? 'var(--color-danger-light)' : 'var(--surface-1)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          {msg.sender?.name || 'Unknown'} · {formatDate(msg.createdAt)}
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{
                            color: msg.deletedAt ? 'var(--color-danger-dark)' : 'var(--text-primary)',
                            fontStyle: msg.deletedAt ? 'italic' : 'normal',
                          }}
                        >
                          {msg.content || `[${msg.messageType}]`}
                        </p>
                      </div>
                      {!msg.deletedAt && (
                        <button
                          onClick={() => setConfirmRedact(msg)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--color-danger)' }}
                          title="Redact message"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )) ?? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No messages loaded
                  </p>
                )}
              </div>
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
        description="Are you sure you want to force-close this conversation? Participants will no longer be able to send messages."
        confirmLabel="Close"
        variant="danger"
        isLoading={closeMutation.isPending}
      />

      {/* Redact Message Confirmation */}
      <ConfirmDialog
        open={!!confirmRedact}
        onClose={() => setConfirmRedact(null)}
        onConfirm={handleRedact}
        title="Redact Message"
        description="This will permanently replace the message content with '[Message removed by admin]'. This action cannot be undone."
        confirmLabel="Redact"
        variant="danger"
        isLoading={redactMutation.isPending}
      />
    </div>
  );
}
