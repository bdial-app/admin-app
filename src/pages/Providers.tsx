import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { providersService } from '../services/providers.service';
import { providerKeys } from '../hooks/useProviders';
import { Eye, CheckCircle2, XCircle, Star, MapPin, PlusCircle, FileSpreadsheet, Trash2, Sparkles, Loader2, Download, SlidersHorizontal, X } from 'lucide-react';
import { EnrichProvidersPanel } from '../components/providers/EnrichProvidersPanel';
import { ProviderFiltersPanel } from '../components/providers/ProviderFiltersPanel';
import { shortDate } from '../components/ui/filters/dates';
import {
  CHOICE_FILTERS, QUICK_VIEWS, SORTS, countActive, sameFilters, useProviderFilterState,
  type FilterKey, type FilterState,
} from '../components/providers/provider-filters';
import { LocationHealthCard } from '../components/providers/LocationHealthCard';
import { MissingLogosCard } from '../components/providers/MissingLogosCard';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { PermissionGate } from '../components/auth/PermissionGate';
import { useHasPermission } from '../hooks/usePermissions';
import { useFlatCategories } from '../hooks/useCategories';
import {
  useProviders,
  useApproveProvider,
  useSuspendProvider,
  useUnsuspendProvider,
  useBulkDeleteProviders,
  useExportProviders,
} from '../hooks/useProviders';
import { ROUTES } from '../utils/constants';
import IconByName from '../components/IconByName';
import { GRADIENT_PALETTE } from '../components/ColorPicker';
import { toast } from 'react-toastify';
import type { Provider, ProviderStatus } from '../types';

const PAGE_SIZES = [10, 25, 50, 100];
const STATUS_TABS: { label: string; value: ProviderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Unverified', value: 'unverified' },
  { label: 'Verified', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

/** Only an owner's pin or a precise address lookup counts; a city centre doesn't. */
const hasExactPin = (p: Provider) =>
  Boolean(p.latitude && p.longitude && p.geocodePrecision !== 'city');

/**
 * A WhatsApp draft asking the owner to drop their own pin — the only way to get
 * a rooftop-accurate location for a business that was bulk-imported.
 */
const pinRequestLink = (p: Provider) => {
  const raw = p.user?.mobileNumber ?? p.contactNumber ?? '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const text =
    `Assalamu alaikum${p.user?.name ? ` ${p.user.name}` : ''}, this is the Tijarah team. ` +
    `${p.brandName} is listed on Tijarah, but we don't have your shop's exact location yet, ` +
    `so customers nearby can't see how far you are or get directions to you.\n\n` +
    `Please open the Tijarah app → Business → Details → Business Location, and drop the pin on your shop. It takes a minute.\n\n` +
    `Get the app: https://tijarahapp.in`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** A removable chip for each active filter, worded as the panel words it. */
function activeChips(filters: FilterState, categories: { id: string; name: string }[]) {
  const chips: { key: FilterKey; label: string }[] = [];
  for (const f of CHOICE_FILTERS) {
    const v = filters[f.key];
    if (!v) continue;
    chips.push({ key: f.key, label: `${f.label}: ${f.options.find((o) => o.value === v)?.label ?? v}` });
  }
  if (filters.cities) chips.push({ key: 'cities', label: `City: ${filters.cities.split(',').join(', ')}` });
  if (filters.area) chips.push({ key: 'area', label: `Area: ${filters.area}` });
  if (filters.categoryIds) {
    const names = filters.categoryIds.split(',').map((id) => categories.find((c) => c.id === id)?.name ?? 'Unknown');
    chips.push({ key: 'categoryIds', label: `Category: ${names.join(', ')}` });
  }
  if (filters.createdFrom) chips.push({ key: 'createdFrom', label: `Added from ${shortDate(filters.createdFrom)}` });
  if (filters.createdTo) chips.push({ key: 'createdTo', label: `Added until ${shortDate(filters.createdTo)}` });
  return chips;
}

export default function Providers() {
  const navigate = useNavigate();
  const { filters, apiFilters, page, update, replace, setPage } = useProviderFilterState();
  const search = filters.search ?? '';
  const status = (filters.status ?? '') as ProviderStatus | '';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'suspend' | 'unsuspend'; provider: Provider } | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [enrichIds, setEnrichIds] = useState<string[] | null>(null);
  const [fixingLocations, setFixingLocations] = useState(false);
  // Bumped per open so the panel remounts with fresh state.
  const [enrichRun, setEnrichRun] = useState(0);
  const canDelete = useHasPermission('providers.delete');
  const canUpdate = useHasPermission('providers.update');

  const { data: categories = [] } = useFlatCategories();

  const { data, isLoading } = useProviders({ ...apiFilters, page, limit: pageSize });

  const { exportProviders, isExporting } = useExportProviders();
  // What the export will contain: the filters, never the page on screen.
  const exportFilters = apiFilters;
  const activeCount = countActive(filters);
  const isFiltered = Boolean(search || status || activeCount);
  const matching = data?.meta?.total;

  const approveMutation = useApproveProvider();
  const suspendMutation = useSuspendProvider();
  const unsuspendMutation = useUnsuspendProvider();
  const bulkDeleteMutation = useBulkDeleteProviders();
  const qc = useQueryClient();

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

  // Selection survives paging but is cleared whenever the filters change, so a
  // row that's no longer on screen can't be deleted by accident.
  const resetSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    try {
      const { affected, skipped } = await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      toast.success(
        `Deleted ${affected} provider${affected === 1 ? '' : 's'}${skipped > 0 ? ` · ${skipped} were already deleted` : ''}`,
      );
      resetSelection();
      setBulkDeleteOpen(false);
    } catch {
      toast.error('Bulk delete stopped part-way — the list is refreshed, check which providers remain');
    }
  };

  /**
   * Put the selected businesses on the map. The server never overwrites a pin
   * the owner set: it geocodes the address or locality (once per distinct place,
   * cached) and falls back to the city centre, marked approximate.
   */
  const handleFixLocations = async () => {
    const ids = Array.from(selectedIds);
    setFixingLocations(true);
    let exact = 0;
    let approx = 0;
    let none = 0;
    let failed = 0;
    try {
      for (let i = 0; i < ids.length; i += 50) {
        try {
          const res = await providersService.geocode(ids.slice(i, i + 50));
          for (const r of res) {
            if (r.skipped) continue;
            if (!r.precision) none += 1;
            else if (r.precision === 'city') approx += 1;
            else exact += 1;
          }
        } catch {
          failed += Math.min(50, ids.length - i);
        }
      }
      await qc.invalidateQueries({ queryKey: providerKeys.all });
      if (exact || approx) toast.success(`Located ${exact} from their address, ${approx} at the city centre`);
      else if (!none && !failed) toast.info('These already had a good location');
      if (none) toast.warn(`${none} had no usable address or city — they stay off the map`);
      if (failed) toast.error(`Location lookup failed for ${failed} provider${failed === 1 ? '' : 's'}`);
    } finally {
      setFixingLocations(false);
    }
  };

  const selectedOnPage = (data?.items ?? []).filter((p) => selectedIds.has(p.id));
  const PREVIEW_COUNT = 8;
  const previewRows = selectedOnPage.slice(0, PREVIEW_COUNT);

  const columns: Column<Provider>[] = [
    {
      key: 'brandName',
      header: 'Business',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.profilePhotoUrl ? (
            <img
              src={row.profilePhotoUrl}
              alt={row.brandName}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              style={{ background: 'var(--surface-2)' }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: row.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)' }}
            >
              {(row.brandName || '?')[0]?.toUpperCase()}
            </div>
          )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => void exportProviders(exportFilters)}
              disabled={isExporting}
              title={
                matching === undefined
                  ? 'Download providers as a CSV file'
                  : isFiltered
                    ? `Downloads the ${matching.toLocaleString()} providers matching your filters`
                    : `Downloads all ${matching.toLocaleString()} providers`
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', background: 'var(--surface-0)' }}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Exporting…' : isFiltered ? `Export ${matching?.toLocaleString() ?? ''}`.trim() : 'Export All'}
            </button>
            <button
              onClick={() => navigate(ROUTES.BULK_IMPORT_PROVIDERS)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', background: 'var(--surface-0)' }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Import
            </button>
            <button
              onClick={() => navigate(ROUTES.CREATE_PROVIDER)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              <PlusCircle className="w-4 h-4" />
              Create Provider
            </button>
          </div>
        }
      />

      {canUpdate && <LocationHealthCard />}
      {canUpdate && <MissingLogosCard />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Status Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { update({ status: tab.value }); resetSelection(); }}
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

        <div className="flex items-center gap-2 ml-auto">
          <select
            value={filters.sort ?? 'newest'}
            onChange={(e) => { update({ sort: e.target.value === 'newest' ? '' : e.target.value }); resetSelection(); }}
            className="px-2 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)', color: 'var(--text-primary)' }}
            aria-label="Sort"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border"
            style={{
              borderColor: activeCount ? 'var(--color-primary)' : 'var(--border-default)',
              background: 'var(--surface-0)',
              color: 'var(--text-primary)',
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-white text-center" style={{ background: 'var(--color-primary)' }}>
                {activeCount}
              </span>
            )}
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)', color: 'var(--text-primary)' }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs" style={{ color: 'var(--text-muted)' }}>Quick views</span>
        {QUICK_VIEWS.map((v) => {
          const on = activeCount > 0 && sameFilters(filters, v.filters());
          return (
            <button
              key={v.label}
              title={v.hint}
              onClick={() => { replace(on ? {} : v.filters()); resetSelection(); }}
              className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: on ? 'var(--color-primary)' : 'var(--border-default)',
                background: on ? 'var(--color-primary)' : 'var(--surface-0)',
                color: on ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {activeCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {activeChips(filters, categories).map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium"
              style={{ background: 'var(--color-primary-light, var(--surface-2))', color: 'var(--color-primary)' }}
            >
              {chip.label}
              <button
                onClick={() => { update({ [chip.key]: '' }); resetSelection(); }}
                className="rounded-full p-0.5 hover:opacity-70"
                aria-label={`Remove ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => { replace({}); resetSelection(); }}
            className="px-2 py-1 text-xs font-medium underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear all
          </button>
        </div>
      )}

      <ProviderFiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={(patch) => { update(patch); resetSelection(); }}
        onClearAll={() => { replace({}); resetSelection(); }}
        categories={categories}
        matching={matching}
      />

      <DataTable<Provider>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { update({ search: q }); resetSelection(); }}
        searchPlaceholder="Search name, owner, phone, area, pincode, Instagram…"
        searchValue={search}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/providers/${row.id}`)}
        selectable={canDelete || canUpdate}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={resetSelection}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              Clear
            </button>
            {canUpdate && (
              <button
                onClick={() => { setEnrichRun((n) => n + 1); setEnrichIds(Array.from(selectedIds)); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg"
                style={{ background: 'var(--color-primary-light, var(--surface-2))', color: 'var(--color-primary)' }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Find logos & websites
              </button>
            )}
            {canUpdate && (
              <button
                onClick={() => void handleFixLocations()}
                disabled={fixingLocations}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg disabled:opacity-60"
                style={{ background: 'var(--color-info-light, var(--surface-2))', color: 'var(--color-info, var(--text-primary))' }}
                title="Geocode the address or locality we already hold; anything with only a city is placed at the city centre and marked approximate. Pins set by the owner are left alone."
              >
                {fixingLocations ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />} Fix locations
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg"
                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        }
      />

      <EnrichProvidersPanel key={enrichRun} providerIds={enrichIds} onClose={() => setEnrichIds(null)} />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} provider${selectedIds.size === 1 ? '' : 's'}?`}
        description="They disappear from the app and from this list, and each owner gets a “profile removed” notification. This can't be undone from the admin."
        confirmLabel={bulkDeleteMutation.isPending ? 'Deleting…' : 'Delete'}
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      >
        {previewRows.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
            {previewRows.map((p) => (
              <li key={p.id} className="truncate">
                • {p.brandName || '—'}{p.user?.mobileNumber ? ` · ${p.user.mobileNumber}` : ''}
              </li>
            ))}
            {selectedIds.size > previewRows.length && (
              <li style={{ color: 'var(--text-muted)' }}>+ {selectedIds.size - previewRows.length} more</li>
            )}
          </ul>
        )}
      </ConfirmDialog>

      {/* Provider Detail Panel */}
      <DetailPanel
        open={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        title={selectedProvider?.brandName || 'Provider Detail'}
        subtitle={selectedProvider?.user?.name || undefined}
        actions={
          selectedProvider && (
            <div className="flex gap-2 flex-wrap">
              {(selectedProvider.status === 'unverified') && (
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
            {/* Banner */}
            {selectedProvider.bannerImageUrl && (
              <img
                src={selectedProvider.bannerImageUrl}
                alt={`${selectedProvider.brandName} banner`}
                className="w-full h-28 object-cover rounded-xl"
                style={{ background: 'var(--surface-2)' }}
              />
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
              {selectedProvider.profilePhotoUrl ? (
                <img
                  src={selectedProvider.profilePhotoUrl}
                  alt={`${selectedProvider.brandName} logo`}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  style={{ background: 'var(--surface-2)' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {(selectedProvider.brandName || '?')[0]?.toUpperCase()}
                </div>
              )}
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

            {/* Location quality — a bulk-imported business usually needs the owner's own pin */}
            {!hasExactPin(selectedProvider) && (
              <div className="rounded-lg p-3" style={{ background: 'var(--color-warning-light)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-warning-dark)' }}>
                  <MapPin className="inline w-3.5 h-3.5 mr-1" />
                  {selectedProvider.latitude && selectedProvider.longitude
                    ? 'Approximate location — placed at the city centre'
                    : 'No location on the map'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Customers can't see how far away this business is, and can't get directions to it.
                </p>
                {pinRequestLink(selectedProvider) && (
                  <a
                    href={pinRequestLink(selectedProvider) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg"
                    style={{ background: 'var(--surface-0)', color: 'var(--color-warning-dark)' }}
                  >
                    Ask the owner on WhatsApp
                  </a>
                )}
              </div>
            )}

            {/* Online Presence (quick view) */}
            {(selectedProvider.websiteUrl || selectedProvider.instagramHandle || selectedProvider.facebookHandle || selectedProvider.youtubeHandle || selectedProvider.whatsappNumber || selectedProvider.linkedinHandle) && (
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
                  {selectedProvider.linkedinHandle && (
                    <a href={selectedProvider.linkedinHandle.startsWith('http') ? selectedProvider.linkedinHandle : `https://linkedin.com/in/${selectedProvider.linkedinHandle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-2 py-1 rounded-md hover:underline" style={{ background: 'var(--surface-2)', color: '#0A66C2' }}>
                      LI
                    </a>
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
