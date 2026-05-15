import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle2, XCircle, Star, MapPin, PlusCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { PermissionGate } from '../components/auth/PermissionGate';
import {
  useProviders,
  useApproveProvider,
  useSuspendProvider,
  useUnsuspendProvider,
} from '../hooks/useProviders';
import { ROUTES } from '../utils/constants';
import IconByName from '../components/IconByName';
import { GRADIENT_PALETTE } from '../components/ColorPicker';
import { toast } from 'react-toastify';
import type { Provider, ProviderStatus } from '../types';

const LIMIT = 10;
const STATUS_TABS: { label: string; value: ProviderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Unverified', value: 'unverified' },
  { label: 'Verified', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Providers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProviderStatus | ''>('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'suspend' | 'unsuspend'; provider: Provider } | null>(null);

  const { data, isLoading } = useProviders({
    page,
    limit: LIMIT,
    search: search || undefined,
    status: status || undefined,
  });

  const approveMutation = useApproveProvider();
  const suspendMutation = useSuspendProvider();
  const unsuspendMutation = useUnsuspendProvider();

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'approve') {
        await approveMutation.mutateAsync(confirmAction.provider.id);
        toast.success('Provider approved');
      } else if (confirmAction.type === 'unsuspend') {
        await unsuspendMutation.mutateAsync(confirmAction.provider.id);
        toast.success('Suspension revoked');
      } else {
        await suspendMutation.mutateAsync(confirmAction.provider.id);
        toast.success('Provider suspended');
      }
      setConfirmAction(null);
      setSelectedProvider(null);
    } catch {
      toast.error(`Failed to ${confirmAction.type} provider`);
    }
  };

  const columns: Column<Provider>[] = [
    {
      key: 'brandName',
      header: 'Business',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: row.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)' }}
          >
            {(row.brandName || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.brandName || '—'}
              {row.isFeatured && (
                <Star className="w-3.5 h-3.5 inline ml-1 fill-amber-400 text-amber-400" />
              )}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {row.user?.name || row.user?.mobileNumber || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'city',
      header: 'Location',
      render: (row) => (
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[row.area, row.city].filter(Boolean).join(', ') || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'averageRating',
      header: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {row.averageRating?.toFixed(1) || '—'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ({row.totalReviews || 0})
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); navigate(`/providers/${row.id}`); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Providers"
        description={data?.meta ? `${data.meta.total.toLocaleString()} providers total` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Providers' },
        ]}
        actions={
          <button
            onClick={() => navigate(ROUTES.CREATE_PROVIDER)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            <PlusCircle className="w-4 h-4" />
            Create Provider
          </button>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: status === tab.value ? 'var(--surface-0)' : 'transparent',
              color: status === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: status === tab.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable<Provider>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by business name, owner, or mobile…"
        searchValue={search}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/providers/${row.id}`)}
      />

      {/* Provider Detail Panel */}
      <DetailPanel
        open={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        title={selectedProvider?.brandName || 'Provider Detail'}
        subtitle={selectedProvider?.user?.name || undefined}
        actions={
          selectedProvider && (
            <div className="flex gap-2 flex-wrap">
              {(selectedProvider.status === 'pending' || selectedProvider.status === 'in_review' || selectedProvider.status === 'unverified') && (
                <>
                  <PermissionGate permission="providers.approve">
                  <button
                    onClick={() => setConfirmAction({ type: 'approve', provider: selectedProvider })}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                    style={{ background: 'var(--color-success)' }}
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                    Approve
                  </button>
                  </PermissionGate>
                  <PermissionGate permission="providers.approve">
                  <button
                    onClick={() => setConfirmAction({ type: 'suspend', provider: selectedProvider })}
                    className="px-4 py-2 text-sm font-medium rounded-lg"
                    style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                  >
                    <XCircle className="w-4 h-4 inline mr-1.5" />
                    Reject
                  </button>
                  </PermissionGate>
                </>
              )}
              {selectedProvider.status === 'active' && (
                <PermissionGate permission="providers.suspend">
                <button
                  onClick={() => setConfirmAction({ type: 'suspend', provider: selectedProvider })}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-danger)' }}
                >
                  Suspend
                </button>
                </PermissionGate>
              )}
              {selectedProvider.status === 'suspended' && (
                <PermissionGate permission="providers.suspend">
                <button
                  onClick={() => setConfirmAction({ type: 'unsuspend', provider: selectedProvider })}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: 'var(--color-success)' }}
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                  Revoke Suspension
                </button>
                </PermissionGate>
              )}
            </div>
          )
        }
      >
        {selectedProvider && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {(selectedProvider.brandName || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedProvider.brandName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={selectedProvider.status} />
                  {selectedProvider.isFeatured && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      Featured
                    </span>
                  )}
                  {selectedProvider.communityVerified && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedProvider.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {selectedProvider.description}
              </p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Owner', value: selectedProvider.user?.name },
                { label: 'Mobile', value: selectedProvider.user?.mobileNumber },
                { label: 'City', value: selectedProvider.city },
                { label: 'Area', value: selectedProvider.area },
                { label: 'Rating', value: selectedProvider.averageRating ? `${selectedProvider.averageRating.toFixed(1)} (${selectedProvider.totalReviews} reviews)` : null },
                { label: 'Women-Led', value: selectedProvider.isWomenLed ? 'Yes' : 'No' },
                { label: 'Available', value: selectedProvider.isAvailable ? 'Yes' : 'No' },
                { label: 'Created', value: formatDate(selectedProvider.createdAt) },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {field.value || '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Online Presence (quick view) */}
            {(selectedProvider.websiteUrl || selectedProvider.instagramHandle || selectedProvider.facebookHandle || selectedProvider.youtubeHandle || selectedProvider.whatsappNumber) && (
              <div>
                <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Online Presence</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProvider.websiteUrl && (
                    <a href={selectedProvider.websiteUrl.startsWith('http') ? selectedProvider.websiteUrl : `https://${selectedProvider.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-2 py-1 rounded-md hover:underline" style={{ background: 'var(--surface-2)', color: 'var(--color-primary)' }}>
                      🌐 {selectedProvider.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 25)}
                    </a>
                  )}
                  {selectedProvider.instagramHandle && (
                    <a href={`https://instagram.com/${selectedProvider.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-2 py-1 rounded-md hover:underline" style={{ background: 'var(--surface-2)', color: '#E4405F' }}>
                      IG @{selectedProvider.instagramHandle}
                    </a>
                  )}
                  {selectedProvider.facebookHandle && (
                    <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--surface-2)', color: '#1877F2' }}>FB</span>
                  )}
                  {selectedProvider.youtubeHandle && (
                    <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--surface-2)', color: '#FF0000' }}>YT</span>
                  )}
                  {selectedProvider.whatsappNumber && (
                    <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--surface-2)', color: '#25D366' }}>WA</span>
                  )}
                </div>
              </div>
            )}

            {/* Categories */}
            {selectedProvider.providerCategories && selectedProvider.providerCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                  Categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProvider.providerCategories.map((pc) => (
                    <span
                      key={pc.id || pc.category?.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                    >
                      {pc.category?.icon && (
                        <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${
                          GRADIENT_PALETTE[pc.category.iconColor || 'amber']?.gradient || 'from-amber-400 to-orange-500'
                        }`}>
                          <IconByName name={pc.category.icon} size={10} className="text-white" strokeWidth={2.5} />
                        </span>
                      )}
                      {pc.category?.name || 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Confirm Approve / Suspend / Unsuspend */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.type === 'approve'
            ? 'Approve Provider'
            : confirmAction?.type === 'unsuspend'
              ? 'Revoke Suspension'
              : 'Suspend Provider'
        }
        description={
          confirmAction?.type === 'approve'
            ? `Are you sure you want to approve "${confirmAction.provider.brandName}"? They will become visible on the platform.`
            : confirmAction?.type === 'unsuspend'
              ? `Are you sure you want to revoke the suspension for "${confirmAction?.provider.brandName}"? Their profile will become active again.`
              : `Are you sure you want to suspend "${confirmAction?.provider.brandName}"? Their listing will be hidden.`
        }
        confirmLabel={
          confirmAction?.type === 'approve'
            ? 'Approve'
            : confirmAction?.type === 'unsuspend'
              ? 'Revoke Suspension'
              : 'Suspend'
        }
        variant={confirmAction?.type === 'suspend' ? 'danger' : 'default'}
        isLoading={approveMutation.isPending || suspendMutation.isPending || unsuspendMutation.isPending}
      />
    </div>
  );
}
