import { Link } from 'react-router-dom';
import { Copy, MessageCircle, Phone, Store, User, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import type { WaSharedContact } from '../../types';
import { ROUTES } from '../../utils/constants';
import { initials } from './wa-utils';

const tenDigits = (e164: string | null) => (e164?.startsWith('+91') ? e164.slice(3) : null);

/** "+919876543210" → "+91 98765 43210"; other numbers as they are. */
const pretty = (e164: string | null, raw: string) =>
  e164 && /^\+91\d{10}$/.test(e164) ? `+91 ${e164.slice(3, 8)} ${e164.slice(8)}` : e164 ?? raw;

/**
 * A contact card someone shared on WhatsApp ("Share contact"): who it is,
 * their numbers, and whether they're already on Tijarah.
 */
export function SharedContactCard({ c }: { c: WaSharedContact }) {
  const first = c.phones.find((p) => p.e164) ?? c.phones[0];
  const mobile = tenDigits(first?.e164 ?? null);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Number copied');
    } catch {
      toast.error("Couldn't copy. Select the number instead.");
    }
  };

  return (
    <div className="rounded-md overflow-hidden min-w-[240px]" style={{ background: 'rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2.5 p-2.5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: '#DFE5E7', color: '#54656F' }}>
          {initials(c.name) || <User className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold truncate">{c.name}</p>
          {c.company && <p className="text-[12px] truncate" style={{ color: 'var(--wa-time)' }}>{c.company}</p>}
        </div>
      </div>

      {c.phones.map((p) => (
        <div key={p.phone} className="flex items-center gap-2 px-2.5 py-1.5" style={{ borderTop: '1px solid var(--wa-divider)' }}>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] tabular-nums select-all">{pretty(p.e164, p.phone)}</p>
            {p.label && <p className="text-[10.5px]" style={{ color: 'var(--wa-time)' }}>{p.label}</p>}
          </div>
          <button type="button" onClick={() => copy(p.e164 ?? p.phone)} className="p-1.5 rounded-full hover:bg-black/5" title="Copy number">
            <Copy className="w-3.5 h-3.5" style={{ color: 'var(--wa-time)' }} />
          </button>
          <a href={`tel:${p.e164 ?? p.phone}`} className="p-1.5 rounded-full hover:bg-black/5" title="Call">
            <Phone className="w-3.5 h-3.5" style={{ color: 'var(--wa-time)' }} />
          </a>
          {p.e164 && (
            <a href={`https://wa.me/${p.e164.slice(1)}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-full hover:bg-black/5" title="Open in WhatsApp">
              <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
            </a>
          )}
        </div>
      ))}

      <div className="px-2.5 py-2 text-[12px] space-y-1" style={{ borderTop: '1px solid var(--wa-divider)' }}>
        {c.match?.business ? (
          <Link to={ROUTES.PROVIDER_VIEW.replace(':id', c.match.business.id)} className="flex items-center gap-1.5 font-medium hover:underline" style={{ color: 'var(--wa-link)' }}>
            <Store className="w-3.5 h-3.5" />
            On Tijarah: {c.match.business.brandName}
            {c.match.business.city ? ` · ${c.match.business.city}` : ''}
          </Link>
        ) : (
          <>
            {c.match?.customer && (
              <p className="flex items-center gap-1.5" style={{ color: 'var(--wa-time)' }}>
                <User className="w-3.5 h-3.5" />
                Has the app as a customer{c.match.customer.name ? ` (${c.match.customer.name})` : ''}, no business listed
              </p>
            )}
            {!c.match?.customer && c.match && (
              <p style={{ color: 'var(--wa-time)' }}>Not on Tijarah yet</p>
            )}
            <Link
              to={`${ROUTES.CREATE_PROVIDER}${mobile ? `?mobile=${mobile}` : ''}`}
              className="flex items-center gap-1.5 font-medium hover:underline"
              style={{ color: 'var(--wa-link)' }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              List their business
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
