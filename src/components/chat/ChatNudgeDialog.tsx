import { useState } from 'react';
import { BellRing, Check, Clock, Loader2, MessageCircle, Smartphone, type LucideIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { apiErrorMessage, fmtDateTime, fmtRelative } from '../whatsapp/wa-utils';
import { useChatNudge, useSendChatNudge } from '../../hooks/useChat';
import type { ChatNudgeChannel, ChatNudgeState } from '../../types';

const ROLE_LABEL = { customer: 'Customer', provider: 'Business' } as const;

/** One past reminder, in words: where it got to, not just that it was tried. */
const historyLabel = (h: ChatNudgeState['history'][number]) => {
  const status = h.status ?? h.outcome;
  switch (status) {
    case 'pushed': return 'Push reached their phone';
    case 'inbox': return 'In-app inbox only';
    case 'pending': case 'scheduled': return 'Waiting for sending hours';
    case 'sent': return 'Sent';
    case 'delivered': return 'Delivered';
    case 'read': return 'Read';
    case 'cancelled': return h.reason ? `Not sent: ${h.reason}` : 'Not sent';
    case 'skipped': return h.reason ? `Not sent: ${h.reason}` : 'Not sent';
    default: return h.reason ? `Failed: ${h.reason}` : 'Failed';
  }
};

function ChannelOption({ icon: Icon, label, selected, disabled, onSelect, detail, preview, note }: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  detail?: string | null;
  preview?: string | null;
  note?: string | null;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className="w-full text-left p-3 rounded-lg transition-colors disabled:cursor-not-allowed"
      style={{
        border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--border-default)'}`,
        background: selected ? 'var(--surface-1)' : 'var(--surface-0)',
        opacity: disabled ? 0.75 : 1,
      }}
    >
      <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: selected ? 'var(--color-primary)' : 'var(--text-muted)' }} />
        {label}
        {detail && <span className="ml-auto text-[11px] font-normal truncate" style={{ color: 'var(--text-muted)' }}>{detail}</span>}
      </span>
      {preview && <span className="block mt-2 text-xs whitespace-pre-line break-words" style={{ color: 'var(--text-secondary)' }}>{preview}</span>}
      {note && <span className="block mt-2 text-xs" style={{ color: disabled ? 'var(--color-danger)' : 'var(--color-warning-dark)' }}>{note}</span>}
    </button>
  );
}

/** Remind the person who owes a reply in one chat. Shows exactly what they'd get. */
export function ChatNudgeDialog({ conversationId, open, onClose }: { conversationId: string; open: boolean; onClose: () => void }) {
  const { data, isLoading, isError } = useChatNudge(conversationId, open);
  const send = useSendChatNudge();
  const [picked, setPicked] = useState<ChatNudgeChannel | null>(null);

  // What's picked only counts while it's still possible; otherwise the first that is.
  const channel: ChatNudgeChannel | null = !data
    ? null
    : picked && data.channels[picked].available
      ? picked
      : data.channels.push.available
        ? 'push'
        : data.channels.whatsapp.available
          ? 'whatsapp'
          : null;

  const close = () => {
    setPicked(null);
    onClose();
  };

  const handleSend = async () => {
    if (!channel) return;
    try {
      const result = await send.mutateAsync({ conversationId, channel });
      if (result.outcome === 'inbox' || result.outcome === 'scheduled') toast.info(result.message);
      else toast.success(result.message);
      close();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Couldn’t send the reminder'));
    }
  };

  const push = data?.channels.push;
  const whatsapp = data?.channels.whatsapp;
  const sendsAt = channel === 'whatsapp' ? whatsapp?.sendsAt : null;

  return (
    <ConfirmDialog
      open={open}
      onClose={close}
      onConfirm={handleSend}
      title="Remind them to reply"
      confirmLabel={!channel ? 'Send reminder' : channel === 'push' ? 'Send push' : sendsAt ? `Send at ${fmtDateTime(sendsAt)}` : 'Send WhatsApp'}
      confirmDisabled={!channel}
      isLoading={send.isPending}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>Couldn’t load this chat’s reminder options.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {data.recipient && data.waitingOn ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.recipient.name}</span>
              {' '}({ROLE_LABEL[data.waitingOn].toLowerCase()}) hasn’t replied to{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.waitingFor}</span>
              {'. '}Last message {fmtRelative(data.waitingSince)}.
              {data.unreadCount > 0 ? ` ${data.unreadCount} unread.` : ' They’ve seen the message.'}
            </p>
          ) : null}

          {data.problem ? (
            <p className="text-sm p-3 rounded-lg" style={{ color: 'var(--color-warning-dark)', background: 'var(--color-warning-light)' }}>{data.problem}</p>
          ) : (
            <div role="radiogroup" aria-label="Send by" className="space-y-2">
              <ChannelOption
                icon={Smartphone}
                label="Push notification"
                selected={channel === 'push'}
                disabled={!push?.available}
                onSelect={() => setPicked('push')}
                detail={push?.devices ? `${push.devices} device${push.devices === 1 ? '' : 's'}` : null}
                preview={push?.title ? `${push.title}\n${push.body ?? ''}` : null}
                note={push?.reason ?? (push?.inboxOnly ? 'No phone would get this right now (notifications off or not signed in). It would only reach their app inbox.' : null)}
              />
              <ChannelOption
                icon={MessageCircle}
                label="WhatsApp"
                selected={channel === 'whatsapp'}
                disabled={!whatsapp?.available}
                onSelect={() => setPicked('whatsapp')}
                detail={whatsapp?.phone}
                preview={whatsapp?.text}
                note={whatsapp?.reason ?? (whatsapp?.sendsAt ? `Outside sending hours (10 AM–8 PM India). It goes at ${fmtDateTime(whatsapp.sendsAt)}, unless they reply first.` : null)}
              />
            </div>
          )}

          {data.history.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Earlier reminders</p>
              <ul className="space-y-1">
                {data.history.map((h) => (
                  <li key={h.id} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {h.status === 'read' || h.status === 'delivered' || h.outcome === 'pushed'
                      ? <Check className="w-3.5 h-3.5 mt-px shrink-0" style={{ color: 'var(--color-success)' }} />
                      : h.channel === 'push' ? <BellRing className="w-3.5 h-3.5 mt-px shrink-0" /> : <Clock className="w-3.5 h-3.5 mt-px shrink-0" />}
                    <span>
                      {h.channel === 'push' ? 'Push' : 'WhatsApp'} · {historyLabel(h)} · {fmtRelative(h.at)}{h.adminName ? ` by ${h.adminName}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}
