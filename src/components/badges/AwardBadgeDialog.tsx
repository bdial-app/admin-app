import { useState } from 'react';
import { toast } from 'react-toastify';
import { Award, Loader2 } from 'lucide-react';
import { DetailPanel } from '../ui/DetailPanel';
import { ProviderPicker, type PickedProvider } from '../ui/ProviderPicker';
import { useAwardBadge } from '../../hooks/useBadges';
import { apiErrorMessage } from '../whatsapp/wa-utils';

const REASON_MAX = 300;

/** How long a Tijarah Pick lasts; most are for a season, some for good. */
const DURATIONS: { label: string; months: number | null }[] = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: 'No end date', months: null },
];

const endOf = (months: number | null) => {
  if (months == null) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  d.setHours(23, 59, 0, 0);
  return d;
};

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Give a business the curated Tijarah Pick: who, why (customers may see it),
 * and for how long. Automatic badges aren't given here — they follow their
 * rules every night. Mount it when opening (`{open && <AwardBadgeDialog open … />}`)
 * so each time starts blank.
 */
export function AwardBadgeDialog({
  open,
  onClose,
  business,
}: {
  open: boolean;
  onClose: () => void;
  /** When opened from a business's page: that business, fixed. */
  business?: PickedProvider | null;
}) {
  const award = useAwardBadge();
  const [picked, setPicked] = useState<PickedProvider | null>(business ?? null);
  const [reason, setReason] = useState('');
  const [months, setMonths] = useState<number | null>(3);
  const [tried, setTried] = useState(false);

  const until = endOf(months);
  const ready = !!picked && reason.trim().length >= 10;

  const submit = async () => {
    setTried(true);
    if (!ready || !picked) return;
    try {
      await award.mutateAsync({
        providerId: picked.id,
        type: 'tijarah_pick',
        reason: reason.trim(),
        expiresAt: until ? until.toISOString() : null,
      });
      toast.success(`${picked.name} is now a Tijarah Pick${until ? ` until ${fmt(until)}` : ''}`);
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not give the badge'));
    }
  };

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title="Give Tijarah Pick"
      subtitle="The team’s badge for standout businesses"
      actions={
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={award.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: '#4f46e5' }}
          >
            {award.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Give badge
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-3 p-3 rounded-xl" style={{ background: 'color-mix(in srgb, #4f46e5 8%, transparent)' }}>
          <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: '#4f46e5' }}>
            <Award className="w-5 h-5" />
          </span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Shows on the business’s page and cards as <strong>Tijarah Pick</strong>, ahead of every other badge. Customers who tap it see the reason
            you write below.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>Business</label>
          <ProviderPicker value={picked} onChange={setPicked} locked={!!business} invalid={tried && !picked} autoFocus={!business} />
          {tried && !picked && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Pick a business</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="pick-reason" className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Why this business</label>
            <span className="text-[11px] tabular-nums" style={{ color: reason.length > REASON_MAX ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              {reason.length}/{REASON_MAX}
            </span>
          </div>
          <textarea
            id="pick-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            rows={3}
            placeholder="e.g. Hand-embroidered ridas, loved by customers at the Eid mela"
            className="w-full px-3 py-2 text-sm rounded-lg resize-none"
            style={{
              background: 'var(--surface-2)',
              border: `1px solid ${tried && reason.trim().length < 10 ? 'var(--color-danger)' : 'var(--border-default)'}`,
              color: 'var(--text-primary)',
            }}
          />
          <p className="text-[11px] mt-1" style={{ color: tried && reason.trim().length < 10 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
            {tried && reason.trim().length < 10 ? 'Write at least a short sentence.' : 'Customers can read this, so keep it warm and specific.'}
          </p>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>For how long</label>
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map((d) => {
              const on = months === d.months;
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setMonths(d.months)}
                  className="px-3 py-2 text-sm rounded-lg text-left transition-colors"
                  style={{
                    background: on ? 'color-mix(in srgb, #4f46e5 10%, transparent)' : 'var(--surface-2)',
                    border: `1px solid ${on ? '#4f46e5' : 'var(--border-default)'}`,
                    color: on ? '#4f46e5' : 'var(--text-secondary)',
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {until ? `Ends on ${fmt(until)}, by itself.` : 'Stays until someone takes it back.'}
          </p>
        </div>
      </div>
    </DetailPanel>
  );
}
