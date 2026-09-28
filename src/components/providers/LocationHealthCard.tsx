import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { providersService } from '../../services/providers.service';
import { providerKeys } from '../../hooks/useProviders';

/** The server accepts at most 50 ids per geocode call. */
const CHUNK = 50;
/** One sweep covers this many providers; run it again for the rest. */
const SWEEP_LIMIT = 200;

interface Tally {
  exact: number;
  approx: number;
  none: number;
  failed: number;
}

/**
 * How many businesses customers can actually find, and a one-click sweep for
 * the ones they can't. Businesses imported from a sheet usually arrive with a
 * city and nothing else, which is why this exists.
 */
export function LocationHealthCard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['providers', 'location-stats'],
    queryFn: () => providersService.locationStats(),
    staleTime: 60_000,
  });

  const runSweep = async () => {
    setRunning(true);
    const tally: Tally = { exact: 0, approx: 0, none: 0, failed: 0 };
    try {
      const ids = await providersService.locationCandidates(SWEEP_LIMIT);
      if (ids.length === 0) {
        toast.info('Every business already has the best location we can give it');
        return;
      }
      setProgress({ done: 0, total: ids.length });

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        try {
          const results = await providersService.geocode(chunk);
          for (const r of results) {
            if (r.skipped) continue;
            if (!r.precision) tally.none += 1;
            else if (r.precision === 'city') tally.approx += 1;
            else tally.exact += 1;
          }
        } catch {
          tally.failed += chunk.length;
        }
        setProgress({ done: Math.min(i + CHUNK, ids.length), total: ids.length });
      }

      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: providerKeys.all })]);

      if (tally.exact || tally.approx) {
        toast.success(
          `Located ${tally.exact} from their address, ${tally.approx} at the city centre`,
        );
      }
      if (tally.none) {
        toast.warn(
          `${tally.none} had no usable address and no serviceable city — they stay off the map`,
        );
      }
      if (tally.failed) toast.error(`Lookup failed for ${tally.failed} — run the sweep again`);
      if (!tally.exact && !tally.approx && !tally.none && !tally.failed) {
        toast.info('Nothing changed — those businesses already had a good pin');
      }
    } catch {
      toast.error('Could not start the sweep — check that the API is reachable');
    } finally {
      setProgress(null);
      setRunning(false);
    }
  };

  if (isLoading || !stats) return null;

  const needsWork = stats.missing + stats.approximate;
  // Nothing to say when every business is properly pinned.
  if (needsWork === 0) return null;

  const pct = stats.total > 0 ? Math.round((stats.precise / stats.total) * 100) : 0;

  return (
    <div
      className="mb-4 rounded-xl border p-4"
      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-warning-light)' }}
          >
            <MapPin className="h-4 w-4" style={{ color: 'var(--color-warning-dark)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {needsWork} of {stats.total} businesses can't be found properly
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {stats.missing} have no location at all and {stats.approximate} sit on a city centre,
              so the app can't show a distance or give directions to them.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void refetch()}
            disabled={running}
            className="rounded-lg p-2 disabled:opacity-50"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
            title="Refresh these numbers"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => void runSweep()}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
            title="Geocode the address or locality we already hold. Anything with only a city is placed at that city's centre and marked approximate. Pins the owner set are never touched."
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {running
              ? progress
                ? `Locating ${progress.done}/${progress.total}…`
                : 'Finding businesses…'
              : 'Fix all missing locations'}
          </button>
        </div>
      </div>

      {/* Precise / approximate / missing, at a glance */}
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
        <div style={{ width: `${(stats.precise / Math.max(1, stats.total)) * 100}%`, background: 'var(--color-success)' }} />
        <div style={{ width: `${(stats.approximate / Math.max(1, stats.total)) * 100}%`, background: 'var(--color-warning)' }} />
        <div style={{ width: `${(stats.missing / Math.max(1, stats.total)) * 100}%`, background: 'var(--color-danger)' }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        <span>
          <b style={{ color: 'var(--color-success-dark)' }}>{stats.precise}</b> exact ({pct}%)
        </span>
        <span>
          <b style={{ color: 'var(--color-warning-dark)' }}>{stats.approximate}</b> approximate
        </span>
        <span>
          <b style={{ color: 'var(--color-danger-dark)' }}>{stats.missing}</b> no location
        </span>
        {stats.improvable > 0 && <span>{stats.improvable} can be improved from the text we hold</span>}
      </div>

      {progress && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, background: 'var(--color-primary)' }}
          />
        </div>
      )}
    </div>
  );
}
