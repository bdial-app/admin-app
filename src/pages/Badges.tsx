import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Award, Loader2, RefreshCw, Sparkles, Store, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AwardBadgeDialog } from '../components/badges/AwardBadgeDialog';
import { badgeStyle } from '../components/badges/badge-style';
import { useBadges, useBadgesOverview, useRecalculateBadges, useRevokeBadge } from '../hooks/useBadges';
import { useHasPermission } from '../hooks/usePermissions';
import { apiErrorMessage } from '../components/whatsapp/wa-utils';
import { ROUTES } from '../utils/constants';
import type { BadgeDefinition, ProviderBadge } from '../types';

const LIMIT = 20;
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

function BadgeMark({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const { icon: Icon, color } = badgeStyle(type);
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-10 h-10 rounded-xl';
  return (
    <span className={`${box} inline-flex items-center justify-center text-white shrink-0`} style={{ background: color }}>
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
    </span>
  );
}

/** One badge: what it says, its rule, and how many hold it. Click to list them. */
function BadgeCard({ badge, active, onClick }: { badge: BadgeDefinition; active: boolean; onClick: () => void }) {
  const { color } = badgeStyle(badge.key);
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-xl transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--surface-0)',
        border: `1px solid ${active ? color : 'var(--border-default)'}`,
        boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <BadgeMark type={badge.key} />
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{badge.holders}</p>
          <p className="text-[10px] uppercase font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
            {badge.holders === 1 ? 'business' : 'businesses'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{badge.label}</p>
        <span
          className="px-1.5 py-px rounded text-[9px] font-bold uppercase"
          style={badge.kind === 'curated' ? { background: '#4f46e51a', color: '#4f46e5' } : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
        >
          {badge.kind === 'curated' ? 'By the team' : 'Automatic'}
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{badge.meaning}</p>
      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{badge.rule}</p>
    </button>
  );
}

/**
 * Badges: every badge with its rule and holders, the businesses holding them,
 * giving and taking back the team's Tijarah Pick, and recalculating the
 * automatic ones (they also update every night).
 */
export default function Badges() {
  const canEdit = useHasPermission('providers.update');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'current' | 'removed'>('current');
  const [page, setPage] = useState(1);
  const [awarding, setAwarding] = useState(false);
  const [revoking, setRevoking] = useState<ProviderBadge | null>(null);

  const { data: overview, isLoading: overviewLoading } = useBadgesOverview();
  const { data, isLoading } = useBadges({ page, limit: LIMIT, type: type || undefined, search: search || undefined, status });
  const recalc = useRecalculateBadges();
  const revoke = useRevokeBadge();

  const runNow = async () => {
    try {
      const r = await recalc.mutateAsync();
      if ('skipped' in r) {
        toast.info('A recalculation is already running — try again in a minute');
        return;
      }
      const added = Object.values(r.added).reduce((a, b) => a + b, 0);
      const removed = Object.values(r.removed).reduce((a, b) => a + b, 0);
      toast.success(`Badges checked: ${added} given, ${removed} taken away`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not recalculate'));
    }
  };

  const doRevoke = async () => {
    if (!revoking) return;
    try {
      await revoke.mutateAsync(revoking.id);
      toast.success(`Took back Tijarah Pick from ${revoking.provider?.brandName ?? 'the business'}`);
      setRevoking(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not take it back'));
    }
  };

  const pick = (key: string) => {
    setType((t) => (t === key ? '' : key));
    setPage(1);
  };

  const columns: Column<ProviderBadge>[] = [
    {
      key: 'business',
      header: 'Business',
      render: (row) => (
        <Link to={`/providers/${row.providerId}`} className="flex items-center gap-3 min-w-0 group">
          {row.provider?.profilePhotoUrl ? (
            <img src={row.provider.profilePhotoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <Store className="w-4 h-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate group-hover:underline" style={{ color: 'var(--text-primary)' }}>
              {row.provider?.brandName ?? row.providerId.slice(0, 8)}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {[row.provider?.area, row.provider?.city].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </Link>
      ),
    },
    {
      key: 'badge',
      header: 'Badge',
      render: (row) => {
        const label = overview?.badges.find((b) => b.key === row.type)?.label ?? row.type;
        return (
          <span className="inline-flex items-center gap-2">
            <BadgeMark type={row.type} size="sm" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
          </span>
        );
      },
    },
    {
      key: 'why',
      header: 'Why',
      render: (row) =>
        row.source === 'curated' ? (
          <p className="text-xs max-w-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }} title={row.reason ?? ''}>
            {row.reason ? `“${row.reason}”` : 'Given by the team'}
          </p>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Meets the rule</span>
        ),
    },
    {
      key: 'since',
      header: status === 'removed' ? 'Ended' : 'Since',
      render: (row) => (
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <p>{fmtDate(status === 'removed' ? row.updatedAt : row.createdAt)}</p>
          {status === 'current' && row.expiresAt && <p style={{ color: 'var(--text-muted)' }}>until {fmtDate(row.expiresAt)}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        canEdit && status === 'current' && row.source === 'curated' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRevoking(row);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
            style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}
          >
            <X className="w-3 h-3" /> Take back
          </button>
        ) : null,
    },
  ];

  const lastRun = overview?.lastRun;

  return (
    <div>
      <PageHeader
        title="Badges"
        description="What each badge means, who holds it, and the team’s Tijarah Picks. Automatic badges follow their rules and update every night."
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Badges' }]}
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <button
                onClick={runNow}
                disabled={recalc.isPending}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
              >
                {recalc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Recalculate now
              </button>
              <button
                onClick={() => setAwarding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: '#4f46e5' }}
              >
                <Award className="w-4 h-4" /> Give Tijarah Pick
              </button>
            </div>
          ) : undefined
        }
      />

      <p className="flex items-center gap-1.5 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <Sparkles className="w-3.5 h-3.5" />
        {lastRun
          ? `Automatic badges last checked ${ago(lastRun.at)} — next check tonight at 2:15 AM.`
          : 'Automatic badges are checked every night at 2:15 AM. Recalculate now to see them today.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {overviewLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: 'var(--surface-1)' }} />
            ))
          : overview?.badges.map((b) => <BadgeCard key={b.key} badge={b} active={type === b.key} onClick={() => pick(b.key)} />)}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {type ? `${overview?.badges.find((b) => b.key === type)?.label ?? type} holders` : 'All badge holders'}
          {type && (
            <button onClick={() => pick(type)} className="ml-2 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              Show all
            </button>
          )}
        </h2>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          {(['current', 'removed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{
                background: status === s ? 'var(--surface-0)' : 'transparent',
                color: status === s ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: status === s ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {s === 'current' ? 'Holding now' : 'Taken away or ended'}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
        searchValue={search}
        searchPlaceholder="Search a business…"
        rowKey={(row) => row.id}
        emptyIcon={<Award className="w-10 h-10" />}
        emptyTitle={status === 'removed' ? 'Nothing taken away yet' : type ? 'No business holds this badge yet' : 'No badges yet'}
        emptyDescription={
          status === 'removed'
            ? 'Badges a business stops qualifying for, and Tijarah Picks that end, appear here.'
            : 'Automatic badges appear after the nightly check (or Recalculate now). Tijarah Picks appear when the team gives one.'
        }
      />

      {awarding && <AwardBadgeDialog open onClose={() => setAwarding(false)} />}

      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={doRevoke}
        isLoading={revoke.isPending}
        title="Take back Tijarah Pick?"
        description={`${revoking?.provider?.brandName ?? 'This business'} stops showing the badge straight away. It stays in the history below.`}
        confirmLabel="Take back"
        variant="danger"
      />
    </div>
  );
}
