import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageOff, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { providersService } from '../../services/providers.service';
import { providerKeys } from '../../hooks/useProviders';

/** Businesses per request; the server renders and uploads each one. */
const BATCH = 100;

/**
 * Most imported businesses have no logo. This gives each a generated brand
 * mark (initials and category colours, all in one consistent style) so the
 * app never shows a blank avatar. Real logos are never touched, and one found
 * later (owner upload, "Find logos & websites") replaces the generated one.
 */
export function MissingLogosCard() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['providers', 'brand-mark-summary'],
    queryFn: () => providersService.brandMarkSummary(),
    staleTime: 60_000,
    retry: 1,
  });

  const run = async () => {
    const total = data?.missing ?? 0;
    setProgress({ done: 0, total });
    let generated = 0;
    let failed = 0;
    try {
      // Batch until none are left, or a batch makes no progress.
      for (;;) {
        const r = await providersService.backfillBrandMarks(BATCH);
        generated += r.generated;
        failed += r.failed;
        setProgress({ done: Math.min(total, generated), total });
        if (r.remaining === 0 || r.generated === 0) break;
      }
      if (generated) toast.success(`Made logos for ${generated} businesses`);
      if (failed) toast.warn(`${failed} could not be made — run it again`);
      if (!generated && !failed) toast.info('Every business already has a logo');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not make logos — check that the API is reachable');
    } finally {
      setProgress(null);
      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: providerKeys.all })]);
    }
  };

  if (!data?.missing) return null;
  const busy = progress !== null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <ImageOff className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data.missing.toLocaleString()} {data.missing === 1 ? 'business has' : 'businesses have'} no logo
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Give them a matching logo from their name and category. Free and instant; a real logo replaces it whenever one turns up.
          </p>
        </div>
      </div>
      <button
        onClick={() => void run()}
        disabled={busy}
        className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {busy ? `Making logos… ${progress.done}/${progress.total}` : 'Make logos'}
      </button>
    </div>
  );
}
