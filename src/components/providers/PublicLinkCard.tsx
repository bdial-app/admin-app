import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  AlertTriangle, ArrowRight, BookOpen, Check, CheckCircle2, Copy, ExternalLink,
  History, Info, Link2, Loader2, Pencil, RotateCcw, X, XCircle,
} from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useHasPermission } from '../../hooks/usePermissions';
import { providerKeys } from '../../hooks/useProviders';
import { slugsService, type SlugCheck } from '../../services/slugs.service';
import { apiErrorMessage } from '../whatsapp/wa-utils';
import { PUBLIC_SITE_URL } from '../../utils/constants';

interface Props {
  providerId: string;
  brandName: string;
}

const SLUG_MAX = 60;
const SITE_HOST = PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/^www\./, '');
const businessUrl = (slug: string) => `${PUBLIC_SITE_URL}/business/${slug}/`;
const catalogueUrl = (slug: string) => `${PUBLIC_SITE_URL}/business/${slug}/catalogue/`;
const linkKey = (providerId: string) => ['slug-link', providerId] as const;

/** The same tidying the server does, so what will be saved shows while typing. */
const normalize = (input: string) =>
  input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Problems worth saying before asking the server. */
const localProblem = (slug: string) =>
  !slug ? 'Type the link you want' : slug.length < 3 ? 'Use at least 3 letters or numbers' : slug.length > SLUG_MAX ? `Use at most ${SLUG_MAX} characters` : null;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          toast.error('Could not copy — select the link and copy it instead');
        }
      }}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:opacity-80"
      style={{ background: 'var(--surface-2)', color: done ? 'var(--color-success)' : 'var(--text-secondary)' }}
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * "Public link" card for ProviderView: the business's page on the website
 * (tijarahapp.in/business/<slug>), its catalogue link, the links it had
 * before, and — for admins — changing it. A changed link never breaks: the
 * old one keeps redirecting here and no other business can take it.
 */
export function PublicLinkCard({ providerId, brandName }: Props) {
  const qc = useQueryClient();
  const canEdit = useHasPermission('providers.update');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: info, isLoading, isError, error } = useQuery({
    queryKey: linkKey(providerId),
    queryFn: () => slugsService.info(providerId),
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);

  const current = info?.slug ?? '';
  const wanted = normalize(draft);
  const problem = localProblem(wanted);
  const unchanged = wanted === current;

  // Ask the server once typing pauses.
  const [debounced, setDebounced] = useState(wanted);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(wanted), 350);
    return () => clearTimeout(t);
  }, [wanted]);
  const settled = debounced === wanted;
  const check = useQuery<SlugCheck>({
    queryKey: ['slug-check', providerId, debounced],
    queryFn: ({ signal }) => slugsService.check(providerId, debounced, signal),
    enabled: editing && settled && !problem && !unchanged,
    staleTime: 15_000,
    retry: false,
  });
  const checking = editing && !problem && !unchanged && (!settled || check.isFetching);
  const verdict = settled && !check.isFetching ? check.data : undefined;
  const canSave = !problem && !unchanged && verdict?.available === true && verdict.slug === wanted;

  const save = useMutation({
    mutationFn: (slug: string) => slugsService.set(providerId, slug),
    onSuccess: async ({ slug }) => {
      toast.success(`Link changed to /business/${slug}. The old link redirects here.`);
      setConfirmSlug(null);
      setEditing(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: linkKey(providerId) }),
        qc.invalidateQueries({ queryKey: providerKeys.detail(providerId) }),
      ]);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not change the link'));
      setConfirmSlug(null);
      void check.refetch();
    },
  });

  const startEdit = () => {
    setDraft(current);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' }}>
            <Link2 className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Public link</p>
          {info && !info.isPublic && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
              Hidden
            </span>
          )}
        </div>
        {canEdit && info && (
          !editing ? (
            <button onClick={startEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80" style={{ color: 'var(--color-primary)', background: 'var(--surface-2)' }}>
              <Pencil className="w-3 h-3" />Change link
            </button>
          ) : (
            <button onClick={cancelEdit} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
              <X className="w-3 h-3" />Cancel
            </button>
          )
        )}
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-10 rounded-lg" style={{ background: 'var(--surface-2)' }} />
            <div className="h-3 w-2/3 rounded" style={{ background: 'var(--surface-2)' }} />
          </div>
        ) : isError || !info ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {(error as { response?: { status?: number } } | null)?.response?.status === 404
              ? 'Links are not live on the server yet — they appear once the API with public links is deployed.'
              : apiErrorMessage(error, 'The link is unavailable right now.')}
          </p>
        ) : !editing ? (
          /* ── Viewing ── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={businessUrl(current)}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-auto sm:flex-1 min-w-0 flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
                title="Open the public page"
              >
                {/* The domain gives way before the slug does. */}
                <span className="min-w-0 truncate" style={{ color: 'var(--text-muted)' }}>{SITE_HOST}/business/</span>
                <span className="shrink-0 max-w-full truncate font-semibold group-hover:underline" style={{ color: 'var(--text-primary)' }}>{current}</span>
              </a>
              <CopyButton text={businessUrl(current)} label="Copy the business link" />
              <a
                href={businessUrl(current)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:opacity-80"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />Open
              </a>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="min-w-0 break-all">Catalogue: {SITE_HOST}/business/{current}/catalogue</span>
              </span>
              <CopyButton text={catalogueUrl(current)} label="Copy the catalogue link" />
            </div>

            {!info.isPublic && (
              <div className="flex gap-2 p-3 rounded-lg text-xs" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>This listing is suspended, disabled or deleted, so its link shows “not found” to the public until it’s restored.</span>
              </div>
            )}

            <p className="flex gap-1.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Shared from the app and listed on Google. It was made from the business name and doesn’t change when the name does.
            </p>

            {info.previous.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                  <History className="w-3 h-3" />Previous links — still redirect here
                </p>
                <ul className="flex flex-col divide-y rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)', borderColor: 'var(--border-default)' }}>
                  {info.previous.map((p) => (
                    <li key={p.slug} className="flex items-center gap-3 px-3 py-2 text-xs" style={{ borderColor: 'var(--border-default)' }}>
                      <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                        <span className="hidden sm:inline">{SITE_HOST}/business/</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.slug}</span>
                      </span>
                      <span className="shrink-0 hidden sm:inline" style={{ color: 'var(--text-muted)' }}>until {fmtDate(p.changedAt)}</span>
                      {canEdit && (
                        <button
                          onClick={() => setConfirmSlug(p.slug)}
                          className="shrink-0 inline-flex items-center gap-1 font-medium px-2 py-1 rounded-md transition-colors hover:opacity-80"
                          style={{ background: 'var(--surface-2)', color: 'var(--color-primary)' }}
                          title="Make this the link again"
                        >
                          <RotateCcw className="w-3 h-3" />Use again
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* ── Editing ── */
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSave) setConfirmSlug(wanted);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit();
            }}
          >
            <label htmlFor={inputId} className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
              New link for {brandName}
            </label>
            <div
              className="flex items-stretch rounded-lg overflow-hidden transition-shadow focus-within:ring-2"
              style={{
                border: `1px solid ${verdict && !verdict.available && !problem ? 'var(--color-danger)' : canSave ? 'var(--color-success)' : 'var(--border-default)'}`,
                background: 'var(--surface-2)',
                ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
              }}
            >
              <span className="hidden sm:flex items-center pl-3 pr-1 text-sm select-none whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {SITE_HOST}/business/
              </span>
              <input
                id={inputId}
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={SLUG_MAX + 20}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!(problem || (verdict && !verdict.available))}
                aria-describedby={`${inputId}-status`}
                placeholder="business-name"
                className="flex-1 min-w-0 px-3 sm:pl-0 py-2.5 text-sm font-semibold bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <span className="flex items-center pr-3 text-[11px] tabular-nums" style={{ color: wanted.length > SLUG_MAX ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {wanted.length}/{SLUG_MAX}
              </span>
            </div>

            {/* What will be saved, when it differs from what was typed */}
            {wanted && wanted !== draft.trim() && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Will be saved as <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{wanted}</span> — only lowercase letters, numbers and dashes.
              </p>
            )}

            {/* Status */}
            <div id={`${inputId}-status`} aria-live="polite" className="min-h-[20px] text-xs flex items-center gap-1.5">
              {unchanged ? (
                <span style={{ color: 'var(--text-muted)' }}>This is the current link.</span>
              ) : problem ? (
                <span style={{ color: draft ? 'var(--color-danger)' : 'var(--text-muted)' }}>{problem}</span>
              ) : checking ? (
                <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />Checking…
                </span>
              ) : check.isError ? (
                <span style={{ color: 'var(--color-danger)' }}>{apiErrorMessage(check.error, 'Could not check this link')}</span>
              ) : verdict?.available ? (
                <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-success)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />Available
                </span>
              ) : verdict ? (
                <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-danger)' }}>
                  <XCircle className="w-3.5 h-3.5" />{verdict.reason}
                </span>
              ) : null}
            </div>

            {verdict && !verdict.available && verdict.suggestions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Free instead:</span>
                {verdict.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setDraft(s);
                      inputRef.current?.focus();
                    }}
                    className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors hover:opacity-80"
                    style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 p-3 rounded-lg text-xs leading-relaxed" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
              <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--color-info)' }} />
              <span>
                The current link <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{SITE_HOST}/business/{current}</span> keeps
                working: it redirects to the new one and no other business can take it, so shared messages and printed QR codes stay valid.
                Google moves to the new address within a few days.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!canSave || save.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
              >
                <Check className="w-3.5 h-3.5" />Save link
              </button>
              <button type="button" onClick={cancelEdit} className="px-4 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmSlug}
        onClose={() => !save.isPending && setConfirmSlug(null)}
        onConfirm={() => confirmSlug && save.mutate(confirmSlug)}
        isLoading={save.isPending}
        title={`Change ${brandName}’s link?`}
        confirmLabel="Change link"
        variant="warning"
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            <span className="break-all line-through" style={{ color: 'var(--text-muted)' }}>{SITE_HOST}/business/{current}</span>
            <span className="flex items-start gap-1.5 min-w-0 font-semibold" style={{ color: 'var(--text-primary)' }}>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: 'var(--color-success)' }} />
              <span className="break-all">{SITE_HOST}/business/{confirmSlug}</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The old link will redirect here, so nothing already shared breaks. New shares from the app will use the new link.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
