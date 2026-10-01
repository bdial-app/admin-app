import { Clock, AlertCircle, Ban, Loader2 } from 'lucide-react';
import type { WaMessageStatus } from '../../types';
import { MESSAGE_STATUS_LABEL } from './wa-utils';

/** WhatsApp-style ticks: one grey (sent), two grey (delivered), two blue (read). */
function Ticks({ double, color, size }: { double: boolean; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 11" fill="none" aria-hidden>
      <path d="M1 5.5l3.2 3.2L10.5 2.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {double && (
        <path d="M6 5.5l3.2 3.2L15.5 2.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

interface Props {
  status: WaMessageStatus;
  size?: number;
  /** Rendered inside a WhatsApp bubble (uses WA palette), otherwise app tokens. */
  inBubble?: boolean;
  title?: string;
}

export function MessageStatusIcon({ status, size = 16, inBubble = false, title }: Props) {
  const grey = inBubble ? 'var(--wa-time)' : 'var(--text-muted)';
  const blue = inBubble ? 'var(--wa-tick-read)' : 'var(--color-info)';
  const label = title ?? MESSAGE_STATUS_LABEL[status];
  switch (status) {
    case 'read':
      return <span title={label} className="inline-flex"><Ticks double color={blue} size={size} /></span>;
    case 'delivered':
      return <span title={label} className="inline-flex"><Ticks double color={grey} size={size} /></span>;
    case 'sent':
      return <span title={label} className="inline-flex"><Ticks double={false} color={grey} size={size} /></span>;
    case 'failed':
      return <span title={label} className="inline-flex"><AlertCircle style={{ color: 'var(--color-danger)', width: size, height: size }} /></span>;
    case 'skipped':
      return <span title={label} className="inline-flex"><Ban style={{ color: grey, width: size, height: size }} /></span>;
    case 'sending':
      return <span title={label} className="inline-flex"><Loader2 className="animate-spin" style={{ color: grey, width: size, height: size }} /></span>;
    case 'received':
      return null;
    case 'queued':
    default:
      return <span title={label} className="inline-flex"><Clock style={{ color: grey, width: size, height: size }} /></span>;
  }
}

export default MessageStatusIcon;
