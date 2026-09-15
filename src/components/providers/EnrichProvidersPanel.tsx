import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, CheckCircle2, ExternalLink, Globe, Loader2, Sparkles, XCircle } from 'lucide-react';
import { DetailPanel } from '../ui/DetailPanel';
import {
  providersService,
  type EnrichImageCandidate,
  type ProviderEnrichment,
} from '../../services/providers.service';
import { providerKeys } from '../../hooks/useProviders';
import { withRateLimitRetry } from '../../utils/bulk-import-images';

/** Providers per lookup request — each one can take several seconds (Google + website + images). */
const LOOKUP_CHUNK = 5;
const APPLY_CONCURRENCY = 2;

interface Choice {
  logoUrl: string | null;
  bannerUrl: string | null;
  saveWebsite: boolean;
}

type ApplyState =
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string };

/**
 * Only high-confidence matches are pre-selected, and never over an existing
 * logo, banner or website — anything else waits for the admin to pick.
 */
function defaultChoice(r: ProviderEnrichment): Choice {
  const trusted = r.confidence === 'high';
  return {
    logoUrl: trusted && !r.current.logoUrl ? (r.logos[0]?.url ?? null) : null,
    bannerUrl: trusted && !r.current.bannerUrl ? (r.banners[0]?.url ?? null) : null,
    saveWebsite: trusted && r.website?.source === 'google' && !r.current.websiteUrl,
  };
}

function hasSelection(choice: Choice | undefined, r: ProviderEnrichment): boolean {
  if (!choice) return false;
  return !!choice.logoUrl || !!choice.bannerUrl || (choice.saveWebsite && !!r.website);
}

const CONFIDENCE_STYLE: Record<ProviderEnrichment['confidence'], { label: string; bg: string; fg: string }> = {
  high: { label: 'Strong match', bg: 'var(--color-success-light)', fg: 'var(--color-success-dark)' },
  check: { label: 'Check match', bg: 'var(--color-warning-light)', fg: 'var(--color-warning-dark)' },
  none: { label: 'Nothing found', bg: 'var(--surface-2)', fg: 'var(--text-muted)' },
};

interface Props {
  /** Provider ids to look up; null keeps the panel closed. Give the panel a new `key` per open so it starts fresh. */
  providerIds: string[] | null;
  onClose: () => void;
}

export function EnrichProvidersPanel({ providerIds, onClose }: Props) {
  const qc = useQueryClient();
  const [results, setResults] = useState<ProviderEnrichment[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [applyState, setApplyState] = useState<Record<string, ApplyState>>({});
  const [lookedUp, setLookedUp] = useState(0);
  const [lookupFailed, setLookupFailed] = useState(0);
  const [lookingUp, setLookingUp] = useState(() => !!providerIds?.length);
  const [applying, setApplying] = useState(false);
  // Results from an abandoned run (panel closed, Strict Mode re-mount) are ignored.
  const runRef = useRef(0);

  const total = providerIds?.length ?? 0;

  useEffect(() => {
    if (!providerIds || providerIds.length === 0) return;
    const run = ++runRef.current;

    void (async () => {
      for (let i = 0; i < providerIds.length; i += LOOKUP_CHUNK) {
        const chunk = providerIds.slice(i, i + LOOKUP_CHUNK);
        try {
          const found = await withRateLimitRetry(() => providersService.enrich(chunk));
          if (runRef.current !== run) return;
          setResults((prev) => [...prev, ...found]);
          setChoices((prev) => {
            const next = { ...prev };
            for (const r of found) next[r.providerId] = defaultChoice(r);
            return next;
          });
        } catch {
          if (runRef.current !== run) return;
          setLookupFailed((n) => n + chunk.length);
        }
        setLookedUp((n) => n + chunk.length);
      }
      if (runRef.current === run) setLookingUp(false);
    })();
  }, [providerIds]);

  const handleClose = () => {
    runRef.current++;
    setLookingUp(false);
    onClose();
  };

  const setChoice = (id: string, patch: Partial<Choice>) =>
    setChoices((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const toApply = results.filter(
    (r) => hasSelection(choices[r.providerId], r) && applyState[r.providerId]?.status !== 'saved',
  );

  const applySelected = async () => {
    setApplying(true);
    const queue = [...toApply];
    let saved = 0;
    let failed = 0;

    const applyOne = async (r: ProviderEnrichment) => {
      const choice = choices[r.providerId];
      setApplyState((prev) => ({ ...prev, [r.providerId]: { status: 'saving' } }));
      const problems: string[] = [];
      try {
        if (choice.logoUrl || choice.bannerUrl) {
          const res = await withRateLimitRetry(() =>
            providersService.importImageUrls(r.providerId, {
              logoUrl: choice.logoUrl ?? undefined,
              bannerUrl: choice.bannerUrl ?? undefined,
            }),
          );
          for (const item of res.results) {
            if (!item.ok) problems.push(`${item.kind}: ${item.error ?? 'failed'}`);
          }
        }
        if (choice.saveWebsite && r.website) {
          const websiteUrl = r.website.url;
          await withRateLimitRetry(() => providersService.update(r.providerId, { websiteUrl }));
        }
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        problems.push(message || 'Save failed');
      }
      if (problems.length) {
        failed++;
        setApplyState((prev) => ({ ...prev, [r.providerId]: { status: 'error', message: problems.join(' · ') } }));
      } else {
        saved++;
        setApplyState((prev) => ({ ...prev, [r.providerId]: { status: 'saved' } }));
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(APPLY_CONCURRENCY, queue.length) }, async () => {
        for (let r = queue.shift(); r; r = queue.shift()) await applyOne(r);
      }),
    );

    await qc.invalidateQueries({ queryKey: providerKeys.all });
    setApplying(false);
    if (failed === 0) toast.success(`Updated ${saved} provider${saved === 1 ? '' : 's'}`);
    else toast.warning(`Updated ${saved}, ${failed} had problems — see the highlighted rows`);
  };

  const counts = {
    high: results.filter((r) => r.confidence === 'high').length,
    check: results.filter((r) => r.confidence === 'check').length,
    none: results.filter((r) => r.confidence === 'none').length,
  };

  return (
    <DetailPanel
      open={!!providerIds}
      onClose={handleClose}
      title="Find logos & websites"
      subtitle={`${total} provider${total === 1 ? '' : 's'} · suggestions from Google and each business's own website`}
      width="780px"
      actions={
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg"
            style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
          >
            Close
          </button>
          <button
            onClick={applySelected}
            disabled={applying || toApply.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {applying ? 'Saving…' : `Apply selected (${toApply.length})`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Progress + summary */}
        <div className="rounded-xl p-3 border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {lookingUp ? `Looking up ${lookedUp} of ${total}…` : `Looked up ${lookedUp} of ${total}`}
            </span>
            <span>
              {counts.high} strong · {counts.check} to check · {counts.none} nothing found
              {lookupFailed > 0 && <span style={{ color: 'var(--color-danger)' }}> · {lookupFailed} failed</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${total ? (lookedUp / total) * 100 : 0}%`, background: 'var(--color-primary)' }}
            />
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Only strong matches are pre-selected, and never over an existing logo, banner or website. Click a
            suggestion to choose it; nothing is saved until you apply.
          </p>
        </div>

        {results.map((r) => (
          <ResultCard
            key={r.providerId}
            result={r}
            choice={choices[r.providerId]}
            state={applyState[r.providerId]}
            disabled={applying || applyState[r.providerId]?.status === 'saved'}
            onChange={(patch) => setChoice(r.providerId, patch)}
          />
        ))}

        {!lookingUp && results.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
            {lookupFailed > 0 ? 'The lookup failed. Close and try again.' : 'No results.'}
          </p>
        )}
      </div>
    </DetailPanel>
  );
}

function ResultCard({
  result: r,
  choice,
  state,
  disabled,
  onChange,
}: {
  result: ProviderEnrichment;
  choice: Choice | undefined;
  state: ApplyState | undefined;
  disabled: boolean;
  onChange: (patch: Partial<Choice>) => void;
}) {
  const badge = CONFIDENCE_STYLE[r.confidence];
  const websiteIsNew = !!r.website && r.website.url !== r.current.websiteUrl;
  const borderColor =
    state?.status === 'error' ? 'var(--color-danger)' : state?.status === 'saved' ? 'var(--color-success)' : 'var(--border-default)';

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--surface-0)', borderColor }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {r.brandName}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {r.match
              ? `Google: ${r.match.name}${r.match.address ? ` · ${r.match.address}` : ''} (matched by ${r.match.matchedBy === 'phone' ? 'phone number' : 'name & city'})`
              : 'No Google listing matched'}
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: badge.bg, color: badge.fg }}>
          {badge.label}
        </span>
      </div>

      {r.notes.length > 0 && (
        <ul className="text-[11px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
          {r.notes.map((note) => (
            <li key={note} className="flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {note}
            </li>
          ))}
        </ul>
      )}

      {/* Website */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="w-14 font-medium" style={{ color: 'var(--text-secondary)' }}>Website</span>
        {r.current.websiteUrl && (
          <a href={r.current.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: 'var(--text-primary)' }}>
            <Globe className="w-3.5 h-3.5" /> {r.current.websiteUrl.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
        {websiteIsNew && r.website ? (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!choice?.saveWebsite}
              disabled={disabled}
              onChange={(e) => onChange({ saveWebsite: e.target.checked })}
            />
            <span style={{ color: 'var(--text-primary)' }}>
              {r.current.websiteUrl ? 'Replace with' : 'Save'}{' '}
              <a href={r.website.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-primary)' }}>
                {r.website.url.replace(/^https?:\/\//, '').slice(0, 40)} <ExternalLink className="w-3 h-3 inline" />
              </a>
            </span>
          </label>
        ) : (
          !r.current.websiteUrl && <span style={{ color: 'var(--text-muted)' }}>None found</span>
        )}
      </div>

      <CandidateRow
        label="Logo"
        shape="square"
        currentUrl={r.current.logoUrl}
        candidates={r.logos}
        selected={choice?.logoUrl ?? null}
        disabled={disabled}
        onSelect={(url) => onChange({ logoUrl: url })}
      />
      <CandidateRow
        label="Banner"
        shape="wide"
        currentUrl={r.current.bannerUrl}
        candidates={r.banners}
        selected={choice?.bannerUrl ?? null}
        disabled={disabled}
        onSelect={(url) => onChange({ bannerUrl: url })}
      />

      {state?.status === 'saving' && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
        </p>
      )}
      {state?.status === 'saved' && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-success-dark)' }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Saved
        </p>
      )}
      {state?.status === 'error' && (
        <p className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-danger)' }}>
          <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {state.message}
        </p>
      )}
    </div>
  );
}

function CandidateRow({
  label,
  shape,
  currentUrl,
  candidates,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  shape: 'square' | 'wide';
  currentUrl: string | null;
  candidates: EnrichImageCandidate[];
  selected: string | null;
  disabled: boolean;
  onSelect: (url: string | null) => void;
}) {
  const box = shape === 'square' ? 'w-16 h-16' : 'w-32 h-16';
  const fit = shape === 'square' ? 'object-contain' : 'object-cover';

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-14 pt-1 font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {/* "Keep" — the default, and the way to undo a pick */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(null)}
          className={`${box} rounded-lg border-2 flex flex-col items-center justify-center overflow-hidden disabled:opacity-60`}
          style={{
            borderColor: selected === null ? 'var(--color-primary)' : 'var(--border-default)',
            background: 'var(--surface-1)',
          }}
          title={currentUrl ? 'Keep the current image' : 'Leave empty'}
        >
          {currentUrl ? (
            <img src={currentUrl} alt="" className={`w-full h-full ${fit}`} loading="lazy" />
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>None</span>
          )}
        </button>

        {candidates.map((c) => (
          <button
            key={c.url}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(c.url)}
            className="flex flex-col items-center gap-0.5 disabled:opacity-60"
            title={`${c.source} · ${c.width}×${c.height}\n${c.url}`}
          >
            <span
              className={`${box} rounded-lg border-2 overflow-hidden block`}
              style={{
                borderColor: selected === c.url ? 'var(--color-primary)' : 'var(--border-default)',
                background: 'var(--surface-2)',
              }}
            >
              <img src={c.url} alt="" className={`w-full h-full ${fit}`} loading="lazy" referrerPolicy="no-referrer" />
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {c.width}×{c.height}
            </span>
          </button>
        ))}

        {candidates.length === 0 && (
          <span className="pt-1" style={{ color: 'var(--text-muted)' }}>No suggestion</span>
        )}
      </div>
    </div>
  );
}
