import { useState } from 'react';
import { toast } from 'react-toastify';
import { Award, Medal, X } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AwardBadgeDialog } from './AwardBadgeDialog';
import { badgeStyle } from './badge-style';
import { useBusinessBadges, useRevokeBadge } from '../../hooks/useBadges';
import { useHasPermission } from '../../hooks/usePermissions';
import { apiErrorMessage } from '../whatsapp/wa-utils';

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/**
 * "Badges" card for ProviderView: what the business holds, where it stands
 * on the automatic ones (the same numbers the nightly check uses), and its
 * Tijarah Pick — given or taken back here.
 */
export function BusinessBadgesCard({ providerId, brandName, city }: { providerId: string; brandName: string; city?: string | null }) {
  const canEdit = useHasPermission('providers.update');
  const { data, isLoading } = useBusinessBadges(providerId);
  const revoke = useRevokeBadge();
  const [awarding, setAwarding] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const held = data?.badges.filter((b) => b.held) ?? [];
  const next = data?.badges.filter((b) => !b.held && b.kind === 'automatic' && b.possible !== false) ?? [];
  const pick = data?.badges.find((b) => b.key === 'tijarah_pick');
  // The live Tijarah Pick row (for its reason and to take it back).
  const pickRow = data?.history.find((h) => h.type === 'tijarah_pick' && h.isActive);

  const takeBack = async () => {
    if (!pickRow) return;
    try {
      await revoke.mutateAsync(pickRow.id);
      toast.success(`Took back Tijarah Pick from ${brandName}`);
      setConfirm(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not take it back'));
    }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, #f59e0b 16%, transparent)' }}>
            <Medal className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Badges</p>
        </div>
        {canEdit && !pick?.held && (
          <button
            onClick={() => setAwarding(true)}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
            style={{ color: '#4f46e5', background: 'var(--surface-2)' }}
          >
            <Award className="w-3 h-3" /> Give Tijarah Pick
          </button>
        )}
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
        ) : (
          <div className="space-y-4">
            {held.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {held.map((b) => {
                  const { icon: Icon, color } = badgeStyle(b.key);
                  return (
                    <span
                      key={b.key}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                      title={b.meaning}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: color }}>
                        <Icon className="w-3 h-3" />
                      </span>
                      {b.label}
                      <span className="font-normal opacity-70">since {fmtDate(b.since)}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No badges yet.</p>
            )}

            {pick?.held && pickRow && (
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, #4f46e5 7%, transparent)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: '#4f46e5' }}>
                    Tijarah Pick{pick.expiresAt ? ` · until ${fmtDate(pick.expiresAt)}` : ' · no end date'}
                  </p>
                  {pickRow.reason && (
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>“{pickRow.reason}”</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => setConfirm(true)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                    style={{ color: 'var(--color-danger)', background: 'var(--surface-0)' }}
                  >
                    <X className="w-3 h-3" /> Take back
                  </button>
                )}
              </div>
            )}

            {next.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Not yet — where it stands</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {next.map((b) => {
                    const { icon: Icon, color } = badgeStyle(b.key);
                    return (
                      <li key={b.key} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                        <span className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white opacity-60" style={{ background: color }}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{b.label}</p>
                          <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{b.progress}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {awarding && (
        <AwardBadgeDialog open onClose={() => setAwarding(false)} business={{ id: providerId, name: brandName, city: city ?? null }} />
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={takeBack}
        isLoading={revoke.isPending}
        title="Take back Tijarah Pick?"
        description={`${brandName} stops showing the badge straight away.`}
        confirmLabel="Take back"
        variant="danger"
      />
    </div>
  );
}
