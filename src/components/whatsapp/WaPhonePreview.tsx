import { ExternalLink, Phone, Reply, Image as ImageIcon, Lock, Signal, Wifi, BatteryFull, ChevronLeft, MoreVertical, Video } from 'lucide-react';
import type { WaMessageStatus, WaTemplateComponent } from '../../types';
import { getBody, getButtons, getFooter, getHeader, renderWaText } from './wa-utils';
import { MessageStatusIcon } from './MessageStatusIcon';
import { renderWaMarkdown } from './wa-markdown';

interface Props {
  components?: WaTemplateComponent[] | null;
  /** Variable index → value. Unfilled placeholders are shown as chips. */
  values?: Record<string, string>;
  headerImageUrl?: string | null;
  /** URL-button index → dynamic suffix value (shown in the button tooltip). */
  buttonUrlValues?: Record<string, string>;
  businessName?: string;
  timestamp?: string;
  status?: WaMessageStatus;
  /** Replaces the template body (free-text replies). */
  bodyOverride?: string | null;
  /** Draw the full phone frame (default) or just the bubble. */
  frame?: boolean;
  className?: string;
  emptyHint?: string;
}

export function WaPhonePreview({
  components,
  values = {},
  headerImageUrl,
  buttonUrlValues = {},
  businessName = 'Tijarah Connect',
  timestamp,
  status = 'read',
  bodyOverride,
  frame = true,
  className = '',
  emptyHint = 'Pick a template to preview the message',
}: Props) {
  const header = getHeader(components ?? undefined);
  const body = getBody(components ?? undefined);
  const footer = getFooter(components ?? undefined);
  const buttons = getButtons(components ?? undefined);

  const bodyText = bodyOverride ?? (body ? renderWaText(body.text, values) : '');
  const headerText = header?.format === 'TEXT' && header.text ? renderWaText(header.text, values) : null;
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const hasContent = !!bodyText || !!headerText || header?.format === 'IMAGE';

  const bubble = (
    <div className="flex flex-col items-start gap-[3px] w-full max-w-[290px]">
      {hasContent ? (
        <div
          className="wa-bubble rounded-lg rounded-tl-none shadow-sm w-full overflow-hidden"
          data-side="in"
          style={{ background: 'var(--wa-bubble-in)', color: 'var(--wa-text)', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
        >
          {header?.format === 'IMAGE' && (
            <div className="p-[3px] pb-0">
              {headerImageUrl ? (
                <img src={headerImageUrl} alt="" className="w-full h-36 object-cover rounded-md" />
              ) : (
                <div
                  className="w-full h-36 rounded-md flex flex-col items-center justify-center gap-1 text-[11px]"
                  style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--wa-time)' }}
                >
                  <ImageIcon className="w-6 h-6" />
                  Header image
                </div>
              )}
            </div>
          )}
          <div className="px-2.5 pt-1.5 pb-1">
            {headerText && (
              <p className="text-[14.5px] font-semibold leading-snug mb-1">{renderWaMarkdown(headerText)}</p>
            )}
            <p className="text-[14.2px] leading-[1.35] whitespace-pre-wrap break-words">{renderWaMarkdown(bodyText)}</p>
            {footer?.text && (
              <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--wa-time)' }}>{footer.text}</p>
            )}
            <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5">
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--wa-time)' }}>{time}</span>
              <MessageStatusIcon status={status} size={15} inBubble />
            </div>
          </div>
          {buttons.length > 0 && (
            <div style={{ borderTop: '1px solid var(--wa-divider)' }}>
              {buttons.map((b, i) => {
                const Icon = b.type === 'URL' ? ExternalLink : b.type === 'PHONE_NUMBER' ? Phone : Reply;
                const tip =
                  b.type === 'URL'
                    ? b.url.replace(/\{\{\s*1\s*\}\}/, buttonUrlValues[String(i)] ?? '{{1}}')
                    : b.type === 'PHONE_NUMBER' ? b.phone_number : undefined;
                return (
                  <div
                    key={i}
                    title={tip}
                    className="flex items-center justify-center gap-1.5 py-2 text-[14px] font-medium"
                    style={{
                      color: 'var(--wa-link)',
                      borderTop: i > 0 ? '1px solid var(--wa-divider)' : undefined,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{b.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-lg px-3 py-6 w-full text-center text-[12.5px]"
          style={{ background: 'rgba(255,255,255,0.55)', color: 'var(--wa-time)', border: '1px dashed var(--wa-divider)' }}
        >
          {emptyHint}
        </div>
      )}
    </div>
  );

  if (!frame) return <div className={`wa-wallpaper rounded-xl p-3 ${className}`}>{bubble}</div>;

  return (
    <div className={`select-none ${className}`}>
      <div
        className="mx-auto w-full max-w-[320px] rounded-[2.2rem] p-[9px]"
        style={{ background: 'var(--wa-frame)', boxShadow: '0 18px 40px -16px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)' }}
      >
        <div className="rounded-[1.75rem] overflow-hidden flex flex-col" style={{ height: 560 }}>
          {/* Status bar + header */}
          <div style={{ background: 'var(--wa-header)', color: 'var(--wa-header-text)' }}>
            <div className="flex items-center justify-between px-5 pt-2 text-[10px] font-semibold tabular-nums">
              <span>{time}</span>
              <div className="flex items-center gap-1 opacity-90">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryFull className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-2">
              <ChevronLeft className="w-5 h-5 opacity-90" />
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background: 'rgba(255,255,255,0.22)' }}
              >
                {businessName.trim().charAt(0).toUpperCase() || 'T'}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[14px] font-semibold truncate">{businessName}</p>
                <p className="text-[11px] opacity-80">Business account</p>
              </div>
              <Video className="w-4.5 h-4.5 opacity-90" />
              <Phone className="w-4 h-4 opacity-90 ml-1.5" />
              <MoreVertical className="w-4 h-4 opacity-90 ml-1" />
            </div>
          </div>

          {/* Chat area */}
          <div className="wa-wallpaper flex-1 overflow-hidden px-3 py-3 flex flex-col gap-2">
            <div className="self-center">
              <span
                className="inline-block px-2.5 py-1 rounded-lg text-[10.5px] font-medium shadow-sm"
                style={{ background: 'var(--wa-day-chip)', color: 'var(--wa-time)' }}
              >
                Today
              </span>
            </div>
            <div
              className="self-center max-w-[240px] text-center px-3 py-1.5 rounded-lg text-[10.5px] leading-snug shadow-sm flex items-start gap-1"
              style={{ background: '#FFEECD', color: '#54656F' }}
            >
              <Lock className="w-3 h-3 mt-[1px] shrink-0" />
              <span>This business uses a secure service from Meta to manage this chat.</span>
            </div>
            <div className="mt-1 pl-1.5">{bubble}</div>
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: 'var(--wa-composer)' }}>
            <div
              className="flex-1 h-9 rounded-full px-3 flex items-center text-[13px]"
              style={{ background: 'var(--wa-bubble-in)', color: 'var(--wa-time)' }}
            >
              Message
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#00A884' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaPhonePreview;
