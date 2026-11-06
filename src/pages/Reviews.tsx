import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, Plus, Flag, Image as ImageIcon, Reply, Store, UserRound, ChevronLeft, ChevronRight, Loader2, Inbox,
  Trash2, RotateCcw, CheckCircle2, Link2, ShieldCheck, History, TrendingDown, CalendarDays, Copy, MessageSquare, EyeOff,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { FilterBar, useUrlFilters, type FilterValues } from '../components/ui/filters';
import { Party, Metric, Pill, ScopeChip } from '../components/ui/ListDetailBlocks';
import { Avatar, TierBadge } from '../components/leads/LeadBadges';
import { AddReviewDialog } from '../components/reviews/AddReviewDialog';
import { REVIEW_FILTER_DEFS, REVIEW_FILTER_KEYS, REVIEW_SORTS, reviewSegments, withReviewOptions } from '../components/reviews/review-filters';
import { useReviews, useReview, useReviewFilterOptions, useUpdateReviewStatus, useDismissReviewReports } from '../hooks/useReviews';
import { apiErrorMessage, fmtDateTime, fmtRelative } from '../components/whatsapp/wa-utils';
import { PUBLIC_SITE_URL, ROUTES } from '../utils/constants';
import type { Review, ReviewDetail, ReviewFilters, ReviewSource } from '../types';

const LIMIT = 20;
/** Page state kept across filter changes: the open review and who the list is scoped to. */
const PAGE_KEYS = ['r', 'providerId', 'business', 'reviewerId', 'reviewer'] as const;
const ALL_KEYS = [...REVIEW_FILTER_KEYS, ...PAGE_KEYS];
const STAR = '#F59E0B';

const providerPath = (id: string, tab?: string) => `${ROUTES.PROVIDER_VIEW.replace(':id', id)}${tab ? `?tab=${tab}` : ''}`;
const pick = (values: FilterValues, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => values[k]).map((k) => [k, values[k]])) as FilterValues;

const SOURCE_LABEL: Record<ReviewSource, string> = {
  app: 'Written in the app',
  link: 'From the owner’s review link',
  admin: 'Recorded by an admin',
};

const HISTORY_LABEL: Record<string, string> = {
  create_review: 'Recorded',
  remove_review: 'Removed',
  restore_review: 'Restored',
  dismiss_review_reports: 'Reports dismissed',
};

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size, fill: i <= n ? STAR : 'transparent', color: i <= n ? STAR : 'var(--text-muted)' }} />
      ))}
    </span>
  );
}

/** Star counts as bars; the review being looked at, if any, is highlighted. */
function Distribution({ rows, highlight }: { rows: { stars: number; count: number }[]; highlight?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.stars} className="flex items-center gap-2 text-[11px] tabular-nums" style={{ color: r.stars === highlight ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: r.stars === highlight ? 600 : 400 }}>
          <span className="w-6 shrink-0">{r.stars}★</span>
          <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <span className="block h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: r.stars === highlight ? STAR : 'var(--text-muted)', opacity: r.stars === highlight ? 1 : 0.45 }} />
          </span>
          <span className="w-8 text-right">{r.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { values, page, search, sort, update, replace, setSearch, setSort, setPage } = useUrlFilters(ALL_KEYS);
  const filters = pick(values, REVIEW_FILTER_KEYS);
  const keep = pick(values, PAGE_KEYS);
  const selectedId = values.r ?? null;
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isFetching } = useReviews({
    ...(filters as ReviewFilters),
    providerId: values.providerId,
    reviewerId: values.reviewerId,
    sort: (sort || undefined) as ReviewFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: options } = useReviewFilterOptions();
  const { data: detail, isLoading: detailLoading, isError: detailError } = useReview(selectedId);
  const items = data?.items ?? [];
  const counts = options?.counts;
  const stats = options?.stats;

  const narrowed = Object.keys(filters).length > 0 || !!search || !!values.providerId || !!values.reviewerId;
  const open = (id: string | null) => update({ r: id ?? undefined });
  const scopeBusiness = (id: string, name: string) => update({ providerId: id, business: name, r: undefined });
  const scopeReviewer = (id: string, name: string) => update({ reviewerId: id, reviewer: name, r: undefined });

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Every review with the business it’s about and who wrote it — read the context, check reports and take one down when it breaks the rules"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Reviews' }]}
        actions={
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
            <Plus className="w-4 h-4" /> Add review
          </button>
        }
      />

      {/* Health */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Metric icon={Star} color={STAR} label="Average rating" value={stats?.avgRating != null ? `${stats.avgRating.toFixed(2)} ★` : '—'} sub={stats ? `${stats.avgRating30d != null ? `${stats.avgRating30d.toFixed(2)} in the last 30 days · ` : ''}${stats.businessesReviewed.toLocaleString()} businesses` : undefined} />
        <Metric icon={CalendarDays} color="var(--color-primary)" label="New this week" value={counts?.last7d} sub={counts ? `${counts.last30d.toLocaleString()} in 30 days · ${counts.active.toLocaleString()} showing` : undefined} />
        <Metric icon={TrendingDown} color="var(--color-danger)" label="Low ratings" value={counts?.low} sub="1–2 stars, showing now" onClick={() => replace({ ...keep, status: 'active', maxRating: '2' })} />
        <Metric icon={Reply} color="var(--color-warning)" label="No reply yet" value={counts?.unreplied} sub={stats?.replyRate != null ? `Businesses replied to ${stats.replyRate}%` : 'The business hasn’t answered'} onClick={() => replace({ ...keep, status: 'active', hasReply: 'false' })} />
        <Metric icon={Flag} color="var(--color-danger)" label="Reported" value={counts?.reported} sub="Has an open report" onClick={() => replace({ ...keep, reported: 'true' })} />
        <div className="rounded-xl p-3.5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Rating mix</p>
          {stats ? <Distribution rows={stats.distribution} /> : <div className="h-14 rounded animate-pulse" style={{ background: 'var(--surface-1)' }} />}
        </div>
      </div>

      <FilterBar
        defs={withReviewOptions(REVIEW_FILTER_DEFS, options)}
        values={filters}
        onChange={update}
        onReplace={(next) => replace({ ...keep, ...next })}
        search={{ value: search, onChange: setSearch, placeholder: 'Search reviewer, mobile, business or what the review says…' }}
        sort={{ options: REVIEW_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: newest first' }}
        segments={reviewSegments(options)}
        resultCount={narrowed ? data?.meta?.total : undefined}
        totalCount={counts?.total}
      />

      {(values.providerId || values.reviewerId) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {values.providerId && <ScopeChip icon={Store} label={values.business || 'One business'} to={providerPath(values.providerId, 'reviews')} onClear={() => update({ providerId: undefined, business: undefined })} />}
          {values.reviewerId && <ScopeChip icon={UserRound} label={values.reviewer || 'One reviewer'} onClear={() => update({ reviewerId: undefined, reviewer: undefined })} />}
        </div>
      )}

      <div className="card overflow-hidden flex" style={{ height: 'calc(100vh - 230px)', minHeight: 560 }}>
        <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] xl:w-[420px] shrink-0`} style={{ borderRight: '1px solid var(--border-default)' }}>
          <div className={`flex-1 overflow-y-auto transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
            {isLoading ? (
              <div className="p-3 space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[84px] rounded-lg animate-pulse" style={{ background: 'var(--surface-1)' }} />)}</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Inbox className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{narrowed ? 'No reviews match' : 'No reviews yet'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{narrowed ? 'Remove a filter or pick another segment.' : 'Reviews appear here as customers rate businesses.'}</p>
              </div>
            ) : (
              items.map((r) => <ReviewRow key={r.id} r={r} active={r.id === selectedId} onClick={() => open(r.id)} />)
            )}
          </div>
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 text-xs shrink-0" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <span className="tabular-nums">
                {((page - 1) * LIMIT + 1).toLocaleString()}–{Math.min(page * LIMIT, data.meta.total).toLocaleString()} of {data.meta.total.toLocaleString()}
              </span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-md disabled:opacity-40 hover:bg-[var(--surface-1)]" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-md disabled:opacity-40 hover:bg-[var(--surface-1)]" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

        <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
          {selectedId && detail ? (
            <ReviewPanel key={detail.id} r={detail} onBack={() => open(null)} onOpen={open} onScopeBusiness={scopeBusiness} onScopeReviewer={scopeReviewer} />
          ) : selectedId && detailLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
          ) : selectedId && detailError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>This review couldn’t be loaded</p>
              <button onClick={() => open(null)} className="text-xs mt-2 font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>Back to the list</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6" style={{ background: 'var(--surface-1)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--surface-0)' }}><Star className="w-7 h-7" style={{ color: 'var(--text-muted)' }} /></div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pick a review</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>See the business it’s about, who wrote it and their chat with the business, photos, the owner’s reply, reports and what’s been done about it.</p>
            </div>
          )}
        </div>
      </div>

      <AddReviewDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

// ── List ──────────────────────────────────────────────────

function ReviewRow({ r, active, onClick }: { r: Review; active: boolean; onClick: () => void }) {
  const name = r.reviewer?.name || 'Unattributed';
  const off = r.status !== 'active';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors"
      style={{ background: active ? 'var(--sidebar-active)' : 'transparent', borderBottom: '1px solid var(--border-light)', opacity: off && !active ? 0.75 : 1 }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Avatar name={r.provider?.brandName} url={r.provider?.profilePhotoUrl} size={34} square />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>{r.provider?.brandName ?? 'Business'}</p>
          <span className="text-[11px] shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{fmtRelative(r.postedAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Stars n={r.starRating} size={12} />
          <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>by {name}{r.provider?.city ? ` · ${r.provider.city}` : ''}</span>
        </div>
        <p className="text-xs mt-1 line-clamp-2" style={{ color: r.reviewText ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: r.reviewText ? 'normal' : 'italic' }}>
          {r.reviewText || 'Stars only, no text'}
        </p>
        {(off || !!r.reportCount || !!r.photoCount || r.replyText || r.source === 'link' || r.source === 'admin') && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {r.status === 'removed' && <Pill icon={EyeOff} color="var(--color-danger)" bg="var(--color-danger-light)">Removed</Pill>}
            {r.status === 'flagged' && <Pill icon={Flag} color="var(--color-warning-dark)" bg="var(--color-warning-light)">Flagged</Pill>}
            {!!r.reportCount && <Pill icon={Flag} color="var(--color-danger)" bg="var(--color-danger-light)">{r.reportCount} report{r.reportCount === 1 ? '' : 's'}</Pill>}
            {!!r.photoCount && <Pill icon={ImageIcon} color="var(--text-secondary)" bg="var(--surface-2)">{r.photoCount}</Pill>}
            {r.replyText && <Pill icon={Reply} color="var(--color-success)" bg="var(--color-success-light)">Replied</Pill>}
            {r.source === 'link' && <Pill icon={Link2} color="var(--color-info)" bg="var(--color-info-light)">Review link</Pill>}
            {r.source === 'admin' && <Pill icon={ShieldCheck} color="var(--text-secondary)" bg="var(--surface-2)">Admin</Pill>}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Detail ────────────────────────────────────────────────

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function ReviewPanel({ r, onBack, onOpen, onScopeBusiness, onScopeReviewer }: {
  r: ReviewDetail;
  onBack: () => void;
  onOpen: (id: string) => void;
  onScopeBusiness: (id: string, name: string) => void;
  onScopeReviewer: (id: string, name: string) => void;
}) {
  const statusMut = useUpdateReviewStatus();
  const dismissMut = useDismissReviewReports();
  const [confirm, setConfirm] = useState<'remove' | 'restore' | 'dismiss' | null>(null);
  const [reason, setReason] = useState('');
  const p = r.provider;
  const reviewer = r.reviewer;
  const openReports = r.reports.filter((x) => x.status === 'pending' || x.status === 'under_review');

  const act = async () => {
    try {
      if (confirm === 'dismiss') {
        await dismissMut.mutateAsync(r.id);
        toast.success('Reports dismissed — the review stays up');
      } else if (confirm) {
        await statusMut.mutateAsync({ id: r.id, status: confirm === 'remove' ? 'removed' : 'active', reason });
        toast.success(confirm === 'remove' ? 'Review removed — the business’s rating is updated' : r.status === 'flagged' ? 'Review approved' : 'Review restored');
      }
      setConfirm(null);
      setReason('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Couldn’t update the review'));
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>
        <div className="flex items-start gap-2">
          <button onClick={onBack} className="lg:hidden p-1 -ml-1 mt-0.5 rounded-md" style={{ color: 'var(--text-muted)' }} aria-label="Back"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Stars n={r.starRating} size={18} />
              <StatusBadge status={r.status} />
              {openReports.length > 0 && <Pill icon={Flag} color="var(--color-danger)" bg="var(--color-danger-light)">{openReports.length} open report{openReports.length === 1 ? '' : 's'}</Pill>}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Posted {fmtDateTime(r.postedAt)} · {SOURCE_LABEL[r.source ?? 'app']}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {openReports.length > 0 && r.status === 'active' && (
              <button onClick={() => setConfirm('dismiss')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }} title="Keep the review and close its reports">
                <CheckCircle2 className="w-3.5 h-3.5" /> Keep it
              </button>
            )}
            {r.status === 'removed' || r.status === 'flagged' ? (
              <button onClick={() => setConfirm('restore')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--color-success)' }}>
                <RotateCcw className="w-3.5 h-3.5" /> {r.status === 'flagged' ? 'Approve' : 'Restore'}
              </button>
            ) : null}
            {r.status !== 'removed' && (
              <button onClick={() => setConfirm('remove')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--color-danger)' }}>
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Who and which business */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
          <Party
            role="Business"
            name={p?.brandName ?? 'Business'}
            photoUrl={p?.profilePhotoUrl}
            lines={[
              [p?.area, p?.city].filter(Boolean).join(', '),
              r.business.avgRating != null ? `${r.business.avgRating.toFixed(1)}★ from ${r.business.activeReviews} review${r.business.activeReviews === 1 ? '' : 's'}` : 'No other reviews',
              p && p.status !== 'active' ? `status: ${p.status}` : '',
              p?.deleted ? 'deleted' : '',
            ].filter(Boolean)}
            actions={p ? [
              { label: 'Open business', to: providerPath(p.id) },
              { label: 'Its reviews tab', to: providerPath(p.id, 'reviews') },
              ...(p.slug ? [{ label: 'Public page', href: `${PUBLIC_SITE_URL}/business/${p.slug}/` }] : []),
              { label: 'All its reviews here', onClick: () => onScopeBusiness(p.id, p.brandName) },
              { label: 'Its chats', to: `${ROUTES.CHAT_MODERATION}?providerId=${p.id}&business=${encodeURIComponent(p.brandName)}` },
            ] : []}
          />
          <Party
            role="Customer"
            name={reviewer?.name || 'Unattributed'}
            lines={[
              reviewer?.mobileNumber ?? '',
              reviewer?.city ?? '',
              r.reviewerReviewCount ? `${r.reviewerReviewCount} review${r.reviewerReviewCount === 1 ? '' : 's'} written` : '',
              reviewer?.status && reviewer.status !== 'active' ? `account ${reviewer.status}` : '',
            ].filter(Boolean)}
            actions={reviewer ? [
              ...(reviewer.mobileNumber ? [{ label: 'Find in Users', to: `${ROUTES.USERS}?q=${encodeURIComponent(reviewer.mobileNumber)}` }] : []),
              ...((r.reviewerReviewCount ?? 0) > 1 ? [{ label: 'All their reviews', onClick: () => onScopeReviewer(reviewer.id, reviewer.name || 'Reviewer') }] : []),
              ...(r.conversationId ? [{ label: 'Their chat with this business', to: `${ROUTES.CHAT_MODERATION}?c=${r.conversationId}` }] : []),
            ] : []}
          />
        </div>

        {/* Did they actually deal with the business? */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {r.conversationId
              ? <Link to={`${ROUTES.CHAT_MODERATION}?c=${r.conversationId}`} className="hover:underline" style={{ color: 'var(--color-primary)' }}>Chatted with the business</Link>
              : reviewer ? 'Never chatted with the business in the app' : 'No account to check'}
          </span>
          {r.lead && (
            <Link to={`${ROUTES.LEADS}?tab=leads&lead=${r.lead.id}`} className="inline-flex items-center gap-1.5 hover:underline" title="Their interest in this business, scored">
              <TierBadge tier={r.lead.tier} score={r.lead.score} /> lead {r.lead.isUnlocked ? '(unlocked)' : ''}
            </Link>
          )}
          {r.moderatedAt && r.status !== 'active' && (
            <span>{r.status === 'removed' ? 'Removed' : 'Last changed'} {fmtRelative(r.moderatedAt)}{r.moderatorName ? ` by ${r.moderatorName}` : ''}</span>
          )}
        </div>

        <Section title="Review">
          <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {r.reviewText
              ? <p className="text-sm whitespace-pre-line break-words" style={{ color: 'var(--text-primary)' }}>{r.reviewText}</p>
              : <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Stars only, no text.</p>}
          </div>
          {r.photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {r.photos.map((ph) => (
                <a key={ph.id} href={ph.imageUrl} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <img src={ph.imageUrl} alt="Review photo" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title="Business’s reply">
          {r.replyText ? (
            <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)', borderLeft: '3px solid var(--color-success)' }}>
              <p className="text-sm whitespace-pre-line break-words" style={{ color: 'var(--text-primary)' }}>{r.replyText}</p>
              {r.repliedAt && <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{fmtDateTime(r.repliedAt)}</p>}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>The business hasn’t replied.</p>
          )}
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section title={`How ${p?.brandName ?? 'the business'} is rated`}>
            <Distribution rows={r.business.distribution} highlight={r.status === 'active' ? r.starRating : undefined} />
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              {r.business.activeReviews} showing{r.business.totalReviews > r.business.activeReviews ? ` · ${r.business.totalReviews - r.business.activeReviews} removed` : ''}
              {r.business.googleRating != null ? ` · Google ${r.business.googleRating.toFixed(1)}★ (${r.business.googleReviewCount ?? 0})` : ''}
              {p?.combinedRating != null ? ` · shown in the app as ${p.combinedRating.toFixed(1)}★` : ''}
            </p>
          </Section>

          <Section title={`Reports${r.reports.length ? ` (${r.reports.length})` : ''}`}>
            {r.reports.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nobody has reported this review.</p>
            ) : (
              <ul className="space-y-1.5">
                {r.reports.map((rep) => (
                  <li key={rep.id} className="p-2 rounded-lg text-xs" style={{ background: 'var(--surface-1)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{(rep.reason ?? 'No reason').replace(/_/g, ' ')}</span>
                      <span className="ml-auto"><StatusBadge status={rep.status === 'reviewed' ? 'action_taken' : rep.status} size="sm" /></span>
                    </div>
                    {rep.description && <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{rep.description}</p>}
                    <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{rep.reporterName ?? 'Someone'} · {fmtRelative(rep.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {r.reviewerOtherReviews.length > 0 && (
          <Section title={`Other reviews by ${reviewer?.name?.split(' ')[0] || 'them'}`}>
            <ul className="space-y-1">
              {r.reviewerOtherReviews.map((o) => (
                <li key={o.id}>
                  <button onClick={() => onOpen(o.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-[var(--surface-1)]">
                    <Stars n={o.starRating} size={11} />
                    <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{o.brandName}</span>
                    {o.status !== 'active' && <StatusBadge status={o.status} size="sm" />}
                    <span className="tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtRelative(o.postedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="History">
          {r.history.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No admin has changed this review.</p>
          ) : (
            <ul className="space-y-1.5">
              {r.history.map((h) => (
                <li key={h.id} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <History className="w-3.5 h-3.5 mt-px shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{HISTORY_LABEL[h.action] ?? h.action}</span>
                    {h.description ? ` — ${h.description}` : ''} · {fmtRelative(h.at)}{h.adminName ? ` by ${h.adminName}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="shrink-0 px-4 py-2 text-[11px] flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)', background: 'var(--surface-0)' }}>
        <span>Removing a review hides it everywhere and updates the business’s rating.</span>
        <button onClick={() => { navigator.clipboard?.writeText(r.id); toast.success('Review ID copied'); }} className="inline-flex items-center gap-1 font-mono hover:underline"><Copy className="w-3 h-3" />{r.id.slice(0, 8)}</button>
      </div>

      <ConfirmDialog
        open={confirm === 'remove'}
        onClose={() => { setConfirm(null); setReason(''); }}
        onConfirm={act}
        title="Remove this review"
        description={`It disappears from ${p?.brandName ?? 'the business'}’s page and stops counting towards its rating.${openReports.length ? ' Its open reports are marked as handled.' : ''} You can restore it later.`}
        confirmLabel="Remove review"
        variant="danger"
        isLoading={statusMut.isPending}
      >
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Why? (kept in the history)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} rows={2} placeholder="e.g. Abusive language, fake review, not about this business" className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'restore'}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        title={r.status === 'flagged' ? 'Approve this review' : 'Restore this review'}
        description={`It shows on ${p?.brandName ?? 'the business'}’s page again and counts towards its rating.`}
        confirmLabel={r.status === 'flagged' ? 'Approve' : 'Restore'}
        isLoading={statusMut.isPending}
      />
      <ConfirmDialog
        open={confirm === 'dismiss'}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        title="Keep this review"
        description={`The review stays up and its ${openReports.length} open report${openReports.length === 1 ? ' is' : 's are'} dismissed.`}
        confirmLabel="Keep and dismiss reports"
        isLoading={dismissMut.isPending}
      />
    </>
  );
}
