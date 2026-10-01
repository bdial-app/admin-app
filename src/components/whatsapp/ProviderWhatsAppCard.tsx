import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Inbox, Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useHasPermission } from '../../hooks/usePermissions';
import { useWaProviderInfo, useSendWaToProvider, useWaSettings } from '../../hooks/useWhatsApp';
import { ConsentBadge } from './ConsentBadge';
import { WindowTimer } from './WindowTimer';
import { MessageStatusIcon } from './MessageStatusIcon';
import { SendTemplateDialog } from './SendTemplateDialog';
import { Skel } from './Skeleton';
import { WA_ROUTES, fmtRelative, apiErrorMessage } from './wa-utils';

interface Props {
  providerId: string;
  brandName?: string;
  city?: string | null;
}

const SOURCE_LABEL = { whatsapp_number: 'WhatsApp number', contact_number: 'Contact number', mobile_number: 'Owner mobile' } as const;

/** "WhatsApp" card for ProviderView: contact state, phone candidates, last messages, send + open-in-inbox. */
export function ProviderWhatsAppCard({ providerId, brandName, city }: Props) {
  const navigate = useNavigate();
  const canView = useHasPermission('whatsapp.view');
  const canSend = useHasPermission('whatsapp.send');
  const { data, isLoading, isError, error } = useWaProviderInfo(canView ? providerId : undefined);
  const { data: settings } = useWaSettings();
  const send = useSendWaToProvider();
  const [dialog, setDialog] = useState(false);

  if (!canView) return null;

  const contact = data?.contact ?? null;
  const messages = (data?.messages ?? []).slice(0, 5);
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;

  const handleSend = async (templateId: string, variables: Record<string, string>) => {
    try {
      await send.mutateAsync({ providerId, payload: { templateId, variables } });
      toast.success('Template queued for delivery');
      setDialog(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the template'));
    }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, #25D366 18%, transparent)' }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: '#128C7E' }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>WhatsApp</p>
          {contact && <ConsentBadge consent={contact.consent} />}
          {contact && !contact.reachable && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Not on WhatsApp</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canSend && (
            <button
              onClick={() => setDialog(true)}
              disabled={settings?.configured === false}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}
            >
              <Send className="w-3 h-3" /> Send template
            </button>
          )}
          <button
            onClick={() => navigate(contact ? WA_ROUTES.thread(contact.id) : WA_ROUTES.inbox)}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
          >
            <Inbox className="w-3 h-3" /> Open in inbox
          </button>
        </div>
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="flex flex-col gap-2"><Skel className="h-4 w-48" /><Skel className="h-4 w-64" /><Skel className="h-16 w-full" /></div>
        ) : isError ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {status === 503
              ? 'WhatsApp is not configured yet. Set the WHATSAPP_* env vars on the server.'
              : apiErrorMessage(error, 'WhatsApp details are unavailable right now.')}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Contact</p>
                {contact ? (
                  <div className="mt-1 flex flex-col gap-1">
                    <p className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{contact.phone}{contact.displayName ? ` · ${contact.displayName}` : ''}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <WindowTimer expiresAt={data?.windowExpiresAt} />
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {contact.messagesSent} sent · last reply {fmtRelative(contact.lastInboundAt)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Never messaged on WhatsApp. The first send creates the contact.</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phone candidates</p>
                {(data?.phoneCandidates ?? []).length === 0 ? (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>No phone number on file — add one before sending.</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1">
                    {data!.phoneCandidates.map((c, i) => (
                      <li key={c.source} className="flex items-center gap-2 text-xs">
                        <Phone className="w-3 h-3 shrink-0" style={{ color: i === 0 ? 'var(--color-success)' : 'var(--text-muted)' }} />
                        <span className="w-32 shrink-0" style={{ color: 'var(--text-muted)' }}>{SOURCE_LABEL[c.source]}</span>
                        <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{c.raw}</span>
                        <span className="font-mono" style={{ color: c.normalized ? 'var(--text-secondary)' : 'var(--color-danger)' }}>
                          {c.normalized ? `→ ${c.normalized}` : 'invalid'}
                        </span>
                        {i === 0 && <span className="px-1.5 rounded text-[9px] font-bold uppercase" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}>used</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Recent messages</p>
              {messages.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {messages.map((m) => (
                    <li key={m.id} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                      {m.direction === 'outbound'
                        ? <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                        : <ArrowDownLeft className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate" style={{ color: 'var(--text-primary)' }}>{m.body || `[${m.kind}]`}</p>
                        <p className="flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {m.templateName && <span className="font-mono">{m.templateName}</span>}
                          <span>{fmtRelative(m.createdAt)}</span>
                          {m.direction === 'outbound' && <MessageStatusIcon status={m.status} size={13} />}
                          {m.errorMessage && <span style={{ color: 'var(--color-danger)' }}>{m.errorMessage}</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <SendTemplateDialog
        open={dialog}
        onClose={() => setDialog(false)}
        recipientLabel={[brandName, contact?.phone ?? data?.phoneCandidates?.[0]?.normalized].filter(Boolean).join(' · ') || undefined}
        prefill={{ brand_name: brandName, city: city ?? undefined }}
        onSend={handleSend}
        isSending={send.isPending}
        rates={settings?.rates}
      />
    </div>
  );
}

export default ProviderWhatsAppCard;
