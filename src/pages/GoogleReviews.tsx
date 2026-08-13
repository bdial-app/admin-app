import { useState } from 'react';
import { Search, Link2, Unlink, RefreshCw, Shield, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import {
  useGoogleLinkedProviders,
  useTrustOverview,
  useVerifyGooglePlace,
  useConfirmGooglePlace,
  useUnlinkGooglePlace,
  useRefreshGoogleAggregates,
} from '../hooks/useGoogleReviews';
import type { GoogleLinkedProvider, GooglePlaceCandidate } from '../services/google-reviews.service';
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

const TRUST_TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Trusted', value: 'trusted' },
  { label: 'Verified', value: 'verified' },
  { label: 'Basic', value: 'basic' },
  { label: 'Unverified', value: 'unverified' },
];

export default function GoogleReviews() {
  const [page, setPage] = useState(1);
  const [trustFilter, setTrustFilter] = useState('');
  const [verifyingProvider, setVerifyingProvider] = useState<GoogleLinkedProvider | null>(null);
  const [candidates, setCandidates] = useState<GooglePlaceCandidate[]>([]);
  const [unlinkConfirm, setUnlinkConfirm] = useState<GoogleLinkedProvider | null>(null);

  const { data, isLoading } = useGoogleLinkedProviders({
    page,
    limit: LIMIT,
    trustLevel: trustFilter || undefined,
  });

  const { data: trustOverview } = useTrustOverview();
  const verifyMutation = useVerifyGooglePlace();
  const confirmMutation = useConfirmGooglePlace();
  const unlinkMutation = useUnlinkGooglePlace();
  const refreshMutation = useRefreshGoogleAggregates();

  const handleVerify = async (provider: GoogleLinkedProvider) => {
    setVerifyingProvider(provider);
    try {
      const results = await verifyMutation.mutateAsync({ providerId: provider.id });
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
      toast.success('Google Place linked successfully');
      setVerifyingProvider(null);
      setCandidates([]);
    } catch {
      toast.error('Failed to link Google Place');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) return;
    try {
      await unlinkMutation.mutateAsync(unlinkConfirm.id);
      toast.success('Google Place unlinked');
      setUnlinkConfirm(null);
    } catch {
      toast.error('Failed to unlink');
    }
  };

  const handleRefresh = async (providerId: string) => {
    try {
      await refreshMutation.mutateAsync(providerId);
      toast.success('Aggregates refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const columns: Column<GoogleLinkedProvider>[] = [
    {
      key: 'businessName',
      header: 'Business',
      render: (row) => (
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {row.businessName}
        </span>
      ),
    },
    {
      key: 'trustLevel',
      header: 'Trust Level',
      render: (row) => (
        <StatusBadge status={row.trustLevel} />
      ),
    },
    {
      key: 'googleRating',
      header: 'Google Rating',
      render: (row) =>
        row.googlePlaceId ? (
          <span style={{ color: 'var(--text-primary)' }}>
            {fmtRating(row.googleRating)} ({row.googleReviewCount ?? 0})
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Not linked</span>
        ),
    },
    {
      key: 'combinedRating',
      header: 'Combined',
      render: (row) => (
        <span style={{ color: 'var(--text-primary)' }}>
          {fmtRating(row.combinedRating)} ({row.combinedReviewCount ?? 0})
        </span>
      ),
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
              title="Search & Link Google Place"
            >
              <Search className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleRefresh(row.id)}
                className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Refresh aggregates"
                disabled={refreshMutation.isPending}
              >
                <RefreshCw className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Reviews"
        description="Manage Google Place links and trust levels"
      />

      {/* Trust Overview Cards */}
      {trustOverview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrustCard icon={<ShieldAlert className="w-5 h-5 text-gray-400" />} label="Unverified" count={trustOverview.unverified} />
          <TrustCard icon={<Shield className="w-5 h-5 text-yellow-500" />} label="Basic" count={trustOverview.basic} />
          <TrustCard icon={<ShieldCheck className="w-5 h-5 text-blue-500" />} label="Verified" count={trustOverview.verified} />
          <TrustCard icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} label="Trusted" count={trustOverview.trusted} />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TRUST_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setTrustFilter(tab.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              trustFilter === tab.value
                ? 'text-white'
                : 'hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            style={
              trustFilter === tab.value
                ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Providers Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        emptyTitle="No providers found"
      />

      {/* Verify / Link Modal */}
      {verifyingProvider && candidates.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Link Google Place
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Select the correct Google listing for <strong>{verifyingProvider.businessName}</strong>
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {candidates.map((c) => (
                <button
                  key={c.placeId}
                  onClick={() => handleConfirm(c.placeId)}
                  disabled={confirmMutation.isPending}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-info)' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.address}</p>
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

      {/* Unlink Confirmation */}
      <ConfirmDialog
        open={!!unlinkConfirm}
        title="Unlink Google Place"
        description={`Remove Google link for "${unlinkConfirm?.businessName}"? The combined rating will be recalculated using only app reviews.`}
        confirmLabel="Unlink"
        variant="danger"
        isLoading={unlinkMutation.isPending}
        onConfirm={handleUnlink}
        onClose={() => setUnlinkConfirm(null)}
      />
    </div>
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
