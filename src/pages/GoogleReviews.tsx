import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search, Link2, Unlink, RefreshCw, Shield, ShieldCheck, ShieldAlert, ExternalLink, MessageSquareText,
  Phone, Star, AlertTriangle, Square,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DetailPanel } from '../components/ui/DetailPanel';
import StatusBadge from '../components/ui/StatusBadge';
import {
  googleReviewKeys,
  useGoogleLinkedProviders,
  useTrustOverview,
  useVerifyGooglePlace,
  useConfirmGooglePlace,
  useUnlinkGooglePlace,
  useGoogleUsage,
  useStoredGoogleReviews,
  useSyncGoogleProvider,
} from '../hooks/useGoogleReviews';
import {
  googleReviewsService,
  type GoogleLinkedProvider,
  type GooglePlaceCandidate,
} from '../services/google-reviews.service';
import { toast } from 'react-toastify';

const LIMIT = 20;

/**
 * Ratings arrive from Postgres DECIMAL columns, which some drivers serialise as
 * strings ("4.5") rather than numbers. Coerce before formatting so a type
 * mismatch degrades to a dash instead of crashing the table.
 */
const fmtRating = (value: number | string | null | undefined): string => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n.toFixed(1) : '–';
};

const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
};

const TRUST_TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Trusted', value: 'trusted' },
  { label: 'Verified', value: 'verified' },
  { label: 'Basic', value: 'basic' },
  { label: 'Unverified', value: 'unverified' },
];

const LINK_TABS: { label: string; value: '' | 'linked' | 'unlinked' }[] = [
  { label: 'All businesses', value: '' },
  { label: 'On Google', value: 'linked' },
  { label: 'Not linked', value: 'unlinked' },
];

type Progress = { label: string; running: boolean; lines: string[] };

export default function GoogleReviews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [trustFilter, setTrustFilter] = useState('');
  const [linkFilter, setLinkFilter] = useState<'' | 'linked' | 'unlinked'>('');
  const [search, setSearch] = useState('');
  const [verifyingProvider, setVerifyingProvider] = useState<GoogleLinkedProvider | null>(null);
  const [candidates, setCandidates] = useState<GooglePlaceCandidate[]>([]);
  const [unlinkConfirm, setUnlinkConfirm] = useState<GoogleLinkedProvider | null>(null);
  const [reviewsFor, setReviewsFor] = useState<GoogleLinkedProvider | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const stop = useRef(false);

  const { data, isLoading } = useGoogleLinkedProviders({
    page,
    limit: LIMIT,
    trustLevel: trustFilter || undefined,
    linked: linkFilter === '' ? undefined : linkFilter === 'linked',
    search: search.trim() || undefined,
  });

  const { data: trustOverview } = useTrustOverview();
  const { data: usage } = useGoogleUsage();
  const { data: stored, isLoading: storedLoading } = useStoredGoogleReviews(reviewsFor?.id ?? null);
  const verifyMutation = useVerifyGooglePlace();
  const confirmMutation = useConfirmGooglePlace();
  const unlinkMutation = useUnlinkGooglePlace();
  const syncMutation = useSyncGoogleProvider();

  const refreshAll = () => qc.invalidateQueries({ queryKey: googleReviewKeys.all });

  const handleVerify = async (provider: GoogleLinkedProvider) => {
    setVerifyingProvider(provider);
    try {
      const results = await verifyMutation.mutateAsync({ providerId: provider.id });
      if (!results.length) {
        toast.info(`No Google listing found for ${provider.brandName} by phone or by name`);
        setVerifyingProvider(null);
        return;
      }
      setCandidates(results);
    } catch {
      toast.error('Failed to search Google Places');
      setVerifyingProvider(null);
    }
  };

  const handleConfirm = async (placeId: string) => {
    if (!verifyingProvider) return;
    try {
      await confirmMutation.mutateAsync({ providerId: verifyingProvider.id, placeId });
      toast.success('Linked, and its Google reviews pulled in');
      setVerifyingProvider(null);
      setCandidates([]);
      refreshAll();
    } catch {
      toast.error('Failed to link Google Place');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) return;
    try {
      await unlinkMutation.mutateAsync(unlinkConfirm.id);
      toast.success('Unlinked, and its stored Google reviews removed');
      setUnlinkConfirm(null);
      refreshAll();
    } catch {
      toast.error('Failed to unlink');
    }
  };

  const handleSync = async (row: GoogleLinkedProvider) => {
    try {
      const r = await syncMutation.mutateAsync(row.id);
      if (r.status === 'synced') {
        toast.success(`${row.brandName}: ${r.stored} reviews stored · ${r.added} new · ${r.removed} removed`);
      } else {
        toast.error(r.error ?? `Sync ${r.status.replace('_', ' ')}`);
      }
    } catch {
      toast.error('Sync failed');
    }
  };

  /** Search unlinked businesses by phone, a batch at a time, until none are left or it is stopped. */
  const runAutoMatch = async () => {
    stop.current = false;
    let checked = 0, linked = 0, noListing = 0, ambiguous = 0, remaining = usage?.notYetSearched ?? 0;
    const line = () => [
      `Searched ${checked} · linked ${linked} · no listing ${noListing} · needs a manual check ${ambiguous}`,
      `${remaining} left to search`,
    ];
    setProgress({ label: 'Finding Google listings by phone', running: true, lines: line() });
    try {
      while (!stop.current) {
        const r = await googleReviewsService.autoMatch(40);
        checked += r.checked; linked += r.linked; noListing += r.noListing; ambiguous += r.ambiguous; remaining = r.remaining;
        setProgress({ label: 'Finding Google listings by phone', running: true, lines: line() });
        if (!r.checked || !r.remaining) break;
      }
    } catch {
      toast.error('Phone search stopped by an error — run it again to carry on');
    }
    setProgress((p) => (p ? { ...p, running: false } : p));
    refreshAll();
  };

  /** Pull reviews for every linked business that is due, within the monthly budget. */
  const runSyncDue = async () => {
    stop.current = false;
    let synced = 0, failed = 0, overBudget = false;
    const line = () => [`Synced ${synced}${failed ? ` · failed ${failed}` : ''}${overBudget ? ' · stopped: monthly budget reached' : ''}`];
    setProgress({ label: 'Pulling Google reviews', running: true, lines: line() });
    try {
      while (!stop.current) {
        const r = await googleReviewsService.syncDue(50);
        synced += r.synced; failed += r.failed; overBudget = r.overBudget;
        setProgress({ label: 'Pulling Google reviews', running: true, lines: line() });
        if (!r.attempted || r.overBudget) break;
      }
    } catch {
      toast.error('Sync stopped by an error — run it again to carry on');
    }
    setProgress((p) => (p ? { ...p, running: false } : p));
    refreshAll();
  };

  const columns: Column<GoogleLinkedProvider>[] = [
    {
      key: 'brandName',
      header: 'Business',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{row.brandName}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {[row.city, row.contactNumber].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      key: 'googleRating',
      header: 'Google',
      render: (row) =>
        row.googlePlaceId ? (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
            <Star className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
            {fmtRating(row.googleRating)}
            <span style={{ color: 'var(--text-muted)' }}>({(row.googleReviewCount ?? 0).toLocaleString('en-IN')})</span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            {row.googleMatchCheckedAt ? 'No listing found by phone' : 'Not linked'}
          </span>
        ),
    },
    {
      key: 'googleMatchMethod',
      header: 'Linked by',
      render: (row) =>
        row.googlePlaceId ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
            {row.googleMatchMethod === 'phone' ? 'Phone match' : 'Hand-picked'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>–</span>
        ),
    },
    {
      key: 'googleLastFetchedAt',
      header: 'Reviews synced',
      render: (row) =>
        !row.googlePlaceId ? (
          <span style={{ color: 'var(--text-muted)' }}>–</span>
        ) : row.googleSyncError ? (
          <span className="inline-flex items-center gap-1 text-xs" title={row.googleSyncError} style={{ color: 'var(--color-danger)' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> {row.googleSyncError.slice(0, 40)}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {row.googleLastFetchedAt ? ago(row.googleLastFetchedAt) : 'waiting for first sync'}
          </span>
        ),
    },
    {
      key: 'trustLevel',
      header: 'Trust',
      render: (row) => <StatusBadge status={row.trustLevel} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {!row.googlePlaceId ? (
            <button
              onClick={() => handleVerify(row)}
              className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Search Google and link"
              disabled={verifyMutation.isPending}
            >
              <Search className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setReviewsFor(row)}
                className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="View stored reviews"
              >
                <MessageSquareText className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
              </button>
              <button
                onClick={() => handleSync(row)}
                className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Sync from Google now (1 Google call)"
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending && syncMutation.variables === row.id ? 'animate-spin' : ''}`} style={{ color: 'var(--color-success)' }} />
              </button>
              <button
                onClick={() => setUnlinkConfirm(row)}
                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Unlink Google Place"
              >
                <Unlink className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const budgetPct = usage ? Math.min(100, (usage.reviewCalls / usage.monthlyBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Reviews"
        description="Link businesses to their Google listing and keep their Google reviews in sync — inside Google's free tier"
      />

      {/* Coverage & cost */}
      {usage && (
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}>
          {!usage.configured && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>GOOGLE_MAPS_API_KEY is not set on the server — nothing can be searched or synced.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat label="Linked to Google" value={usage.linked} />
            <Stat label="Not searched yet" value={usage.notYetSearched} />
            <Stat label="No listing by phone" value={usage.searchedNoMatch} hint="Link by hand with the search button" />
            <Stat label="Reviews stored" value={usage.storedReviews} hint="Up to 5 per business — Google's limit" />
            <Stat label="Due for sync" value={usage.dueForSync} hint={`Refreshed every ${usage.refreshDays} days`} />
          </div>

          <div>
            <div className="flex items-baseline justify-between text-sm mb-1.5">
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{usage.reviewCalls}</strong> of {usage.monthlyBudget} review syncs used in {usage.month}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Google's free tier: {usage.googleFreeCalls.toLocaleString('en-IN')}/month · phone searches are free ({usage.phoneLookups} so far)
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
              <div className="h-2 rounded-full" style={{ width: `${budgetPct}%`, background: budgetPct >= 90 ? 'var(--color-danger)' : 'var(--color-success)' }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runAutoMatch}
              disabled={!usage.configured || !!progress?.running || usage.notYetSearched === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              <Phone className="w-4 h-4" /> Find listings by phone ({usage.notYetSearched})
            </button>
            <button
              onClick={runSyncDue}
              disabled={!usage.configured || !!progress?.running || usage.dueForSync === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              <RefreshCw className="w-4 h-4" /> Pull reviews now ({usage.dueForSync} due)
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Reviews also refresh automatically every night at 3 AM.
            </span>
          </div>

          {progress && (
            <div className="rounded-lg p-3 text-sm flex items-start gap-3" style={{ background: 'var(--surface-2)' }}>
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {progress.label}{progress.running ? '…' : ' — done'}
                </p>
                {progress.lines.map((l) => <p key={l} className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{l}</p>)}
              </div>
              {progress.running ? (
                <button onClick={() => { stop.current = true; }} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  <Square className="w-3 h-3" /> Stop
                </button>
              ) : (
                <button onClick={() => setProgress(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Dismiss</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trust Overview Cards */}
      {trustOverview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrustCard icon={<ShieldAlert className="w-5 h-5 text-gray-400" />} label="Unverified" count={trustOverview.unverified} />
          <TrustCard icon={<Shield className="w-5 h-5 text-yellow-500" />} label="Basic" count={trustOverview.basic} />
          <TrustCard icon={<ShieldCheck className="w-5 h-5 text-blue-500" />} label="Verified" count={trustOverview.verified} />
          <TrustCard icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} label="Trusted" count={trustOverview.trusted} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {LINK_TABS.map((tab) => (
          <FilterButton key={tab.label} active={linkFilter === tab.value} onClick={() => { setLinkFilter(tab.value); setPage(1); }}>
            {tab.label}
          </FilterButton>
        ))}
        <span className="mx-1 h-5 w-px" style={{ background: 'var(--border-default)' }} />
        {TRUST_TABS.map((tab) => (
          <FilterButton key={tab.value || 'all-trust'} active={trustFilter === tab.value} onClick={() => { setTrustFilter(tab.value); setPage(1); }}>
            {tab.value ? tab.label : 'Any trust'}
          </FilterButton>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search business…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg border w-56"
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Providers Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        emptyTitle="No businesses found"
      />

      {/* Verify / Link Modal */}
      {verifyingProvider && candidates.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Link Google Place
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Select the correct Google listing for <strong>{verifyingProvider.brandName}</strong>
              {verifyingProvider.contactNumber ? ` (${verifyingProvider.contactNumber})` : ''}. Linking pulls its reviews straight away.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {candidates.map((c) => (
                <button
                  key={c.placeId}
                  onClick={() => handleConfirm(c.placeId)}
                  disabled={confirmMutation.isPending}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Link2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-info)' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.address}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {[
                          c.rating != null ? `★ ${c.rating} (${c.userRatingsTotal ?? 0})` : null,
                          c.phoneNumber,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setVerifyingProvider(null); setCandidates([]); }}
              className="mt-4 w-full py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stored reviews */}
      <DetailPanel
        open={!!reviewsFor}
        onClose={() => setReviewsFor(null)}
        title={reviewsFor?.brandName ?? ''}
        subtitle={reviewsFor ? `★ ${fmtRating(reviewsFor.googleRating)} · ${(reviewsFor.googleReviewCount ?? 0).toLocaleString('en-IN')} reviews on Google · synced ${ago(reviewsFor.googleLastFetchedAt)}` : undefined}
      >
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Google shares up to 5 reviews per business. Each sync replaces these with what Google shows now, so a review deleted on Google disappears here too.
        </p>
        {storedLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : !stored?.length ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reviews stored yet — sync this business to pull them.</p>
        ) : (
          <div className="space-y-4">
            {stored.map((r) => (
              <div key={r.id} className="pb-4 border-b last:border-0" style={{ borderColor: 'var(--border-light)' }}>
                <div className="flex items-center gap-2">
                  {r.authorPhotoUri ? <img src={r.authorPhotoUri} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.authorName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      {r.publishedAt ? ` · ${new Date(r.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                  {r.googleMapsUri && (
                    <a href={r.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--color-info)' }}>
                      Google <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {r.text && <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </DetailPanel>

      {/* Unlink Confirmation */}
      <ConfirmDialog
        open={!!unlinkConfirm}
        title="Unlink Google Place"
        description={`Remove the Google link for "${unlinkConfirm?.brandName}"? Its stored Google reviews are deleted, and the combined rating falls back to app reviews only. The automatic phone search will not re-link it.`}
        confirmLabel="Unlink"
        variant="danger"
        isLoading={unlinkMutation.isPending}
        onConfirm={handleUnlink}
        onClose={() => setUnlinkConfirm(null)}
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value.toLocaleString('en-IN')}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {hint && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
      style={active ? { backgroundColor: 'var(--color-primary)', color: '#fff' } : { color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}

function TrustCard({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}
