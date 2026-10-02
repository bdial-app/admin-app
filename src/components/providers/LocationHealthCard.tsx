import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Loader2, RefreshCw, Search, MessageCircle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { providersService, type ProviderLocationResult } from '../../services/providers.service';
import { providerKeys } from '../../hooks/useProviders';
import { ROUTES } from '../../utils/constants';

/** The server accepts at most 50 ids per call. */
const CHUNK = 50;
/** One sweep covers this many providers; run it again for the rest. */
const SWEEP_LIMIT = 200;

type Sweep = 'text' | 'name';

interface Tally {
  exact: number;
  approx: number;
  unmatched: number;
  failed: number;
}

/**
 * How many businesses customers can actually find, and the three ways to fix
 * the ones they can't. Businesses imported from a sheet usually arrive with a
 * city and nothing else: no address to geocode, so the only automatic route
 * left is asking Google Places for the business by name or phone; after that
 * it is the owner's pin.
 */
export function LocationHealthCard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [running, setRunning] = useState<Sweep | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['providers', 'location-stats'],
    queryFn: () => providersService.locationStats(),
    staleTime: 60_000,
    retry: 1,
  });

  const runSweep = async (kind: Sweep) => {
    setRunning(kind);
    const tally: Tally = { exact: 0, approx: 0, unmatched: 0, failed: 0 };
    try {
      const ids = await providersService.locationCandidates(SWEEP_LIMIT, kind);
      if (ids.length === 0) {
        toast.info(kind === 'name' ? 'Google has already been asked about every business' : 'No business has an address we have not tried yet');
        return;
      }
      setProgress({ done: 0, total: ids.length });

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        try {
          const results: ProviderLocationResult[] =
            kind === 'name' ? await providersService.pinByName(chunk) : await providersService.geocode(chunk);
          for (const r of results) {
            if (r.skipped) continue;
            if (r.source?.startsWith('places-miss') || !r.precision) tally.unmatched += 1;
            else if (r.precision === 'city') tally.approx += 1;
            else tally.exact += 1;
          }
        } catch {
          tally.failed += chunk.length;
        }
        setProgress({ done: Math.min(i + CHUNK, ids.length), total: ids.length });
      }

      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: providerKeys.all })]);

      if (kind === 'name') {
        if (tally.exact) toast.success(`Google found ${tally.exact} of these businesses and pinned them`);
        if (tally.unmatched) toast.warn(`${tally.unmatched} have no Google listing (or none that looks like them) — only the owner can pin those`);
      } else {
        if (tally.exact || tally.approx) toast.success(`Located ${tally.exact} from their address, ${tally.approx} at the city centre`);
        if (tally.unmatched) toast.warn(`${tally.unmatched} had no usable address and no serviceable city`);
      }
      if (tally.failed) toast.error(`Lookup failed for ${tally.failed} — run it again`);
      if (!tally.exact && !tally.approx && !tally.unmatched && !tally.failed) toast.info('Nothing changed');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not start the sweep — check that the API is reachable');
    } finally {
      setProgress(null);
      setRunning(null);
    }
  };

  const askOwners = () => {
    navigate(`${ROUTES.WHATSAPP}/campaigns/new`, {
      state: {
        name: 'Set your map location',
        audience: { locationPrecision: 'approximate', statuses: ['active', 'unverified'] },
      },
    });
  };

  if (isLoading) return null;

  // Say so rather than disappearing: a hidden card looks identical to a healthy
  // catalogue, which is how a broken endpoint went unnoticed.
  if (isError || !stats) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border p-3" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <MapPin className="mr-1 inline h-3.5 w-3.5" />
          Couldn't read location coverage — the backend may not have this endpoint yet.
        </p>
        <button onClick={() => void refetch()} className="rounded-lg px-2.5 py-1.5 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
          Retry
        </button>
      </div>
    );
  }

  const needsWork = stats.missing + stats.approximate;
  // Nothing to say when every business is properly pinned.
  if (needsWork === 0) return null;

  const total = Math.max(1, stats.total);
  const findable = stats.precise + stats.neighbourhood;
  const pct = Math.round((findable / total) * 100);
  const busy = running !== null;

  const parts = [
    stats.approximate > 0 && `${stats.approximate} sit at a city centre`,
    stats.missing > 0 && `${stats.missing} have no location at all`,
  ].filter(Boolean);

  return (
    <div className="mb-4 rounded-xl border p-4" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--color-warning-light)' }}>
            <MapPin className="h-4 w-4" style={{ color: 'var(--color-warning-dark)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {needsWork} of {stats.total} businesses show only their town, with no distance
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {parts.join(' and ')}. Customers see them after everyone with a real pin, and can't get directions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void refetch()} disabled={busy} className="rounded-lg p-2 disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }} title="Refresh these numbers">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {stats.improvable > 0 && (
            <ActionButton
              onClick={() => void runSweep('text')}
              disabled={busy}
              busy={running === 'text'}
              progress={progress}
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={`Geocode ${stats.improvable} address${stats.improvable === 1 ? '' : 'es'}`}
              title="Geocode the address, area or pincode we hold. Pins the owner set are never touched."
              secondary
            />
          )}
          {stats.nameSearchable > 0 && (
            <ActionButton
              onClick={() => void runSweep('name')}
              disabled={busy}
              busy={running === 'name'}
              progress={progress}
              icon={<Search className="h-3.5 w-3.5" />}
              label={`Find ${stats.nameSearchable} on Google`}
              title="Ask Google Places for the business itself: by phone number first, then by name within its city. A result that doesn't look like the business, or sits outside the city, is ignored. About ₹1–2 per lookup; each business is asked about once."
            />
          )}
          <ActionButton
            onClick={askOwners}
            disabled={busy}
            busy={false}
            progress={null}
            icon={<MessageCircle className="h-3.5 w-3.5" />}
            label="Ask owners on WhatsApp"
            title="Opens a WhatsApp campaign to every owner whose listing has no real pin, asking them to set it in the app."
            secondary
          />
        </div>
      </div>

      {/* Precise / neighbourhood / city centre / missing, at a glance */}
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
        <div style={{ width: `${(stats.precise / total) * 100}%`, background: 'var(--color-success)' }} />
        <div style={{ width: `${(stats.neighbourhood / total) * 100}%`, background: 'var(--color-info)' }} />
        <div style={{ width: `${(stats.approximate / total) * 100}%`, background: 'var(--color-warning)' }} />
        <div style={{ width: `${(stats.missing / total) * 100}%`, background: 'var(--color-danger)' }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        <span><b style={{ color: 'var(--color-success-dark)' }}>{stats.precise}</b> exact pin</span>
        <span title="Google placed these within their neighbourhood. Customers still see a distance; only turn-by-turn directions may be a street off.">
          <b style={{ color: 'var(--color-info-dark)' }}>{stats.neighbourhood}</b> neighbourhood
        </span>
        <span><b style={{ color: 'var(--color-warning-dark)' }}>{stats.approximate}</b> city centre</span>
        <span><b style={{ color: 'var(--color-danger-dark)' }}>{stats.missing}</b> no location</span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Info className="h-3 w-3" />
          {pct}% findable with a distance
        </span>
      </div>

      {progress && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, background: 'var(--color-primary)' }} />
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, disabled, busy, progress, icon, label, title, secondary }: {
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  progress: { done: number; total: number } | null;
  icon: React.ReactNode;
  label: string;
  title: string;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
      style={secondary
        ? { background: 'var(--surface-2)', color: 'var(--text-primary)' }
        : { background: 'var(--color-primary)', color: '#fff' }}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {busy ? (progress ? `${progress.done}/${progress.total}…` : 'Starting…') : label}
    </button>
  );
}
