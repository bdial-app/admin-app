import { useState } from 'react';
import { ImageOff, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import { PHOTO_FILTER_DEFS, PHOTO_FILTER_KEYS, PHOTO_SORTS, photoSegments, withPhotoOptions } from '../components/photos/photo-filters';
import { usePhotosForModeration, usePhotoFilterOptions, useRemovePhoto } from '../hooks/usePhotoModeration';
import type { PhotoFilters } from '../services/photo-moderation.service';
import { ROUTES } from '../utils/constants';
import type { PhotoType } from '../types';

const LIMIT = 50;

const PHOTO_TYPE_LABEL: Record<string, string> = {
  provider: 'Business gallery',
  review: 'Review',
  product: 'Product',
};

export default function PhotoModeration() {
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(PHOTO_FILTER_KEYS);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: PhotoType } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data, isLoading } = usePhotosForModeration({
    ...(filters as PhotoFilters),
    sort: (sort || undefined) as PhotoFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = usePhotoFilterOptions();
  const removeMutation = useRemovePhoto();

  const photos = data?.items ?? [];
  const meta = data?.meta;
  const totalCount = filterOptions?.counts.total;

  const handleRemove = async () => {
    if (!confirmDelete) return;
    await removeMutation.mutateAsync(confirmDelete);
    setConfirmDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Photo Moderation"
        description={
          meta
            ? hasNarrowing && totalCount != null
              ? `${meta.total.toLocaleString()} of ${totalCount.toLocaleString()} photos match your filters`
              : `${meta.total.toLocaleString()} photos`
            : 'Review and remove inappropriate photos'
        }
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Photo Moderation' }]}
      />

      <FilterBar
        defs={withPhotoOptions(PHOTO_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by business or product name…' }}
        sort={{ options: PHOTO_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: newest first' }}
        segments={photoSegments(filterOptions)}
        resultCount={hasNarrowing ? meta?.total : undefined}
        totalCount={totalCount}
      />

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title={hasNarrowing ? 'No photos match these filters' : 'No photos to moderate'}
          description={hasNarrowing ? 'Remove a filter or pick a different segment above.' : 'All photos have been reviewed'}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden border"
                style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}
              >
                <div className="aspect-square relative">
                  <img
                    src={photo.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setPreviewUrl(photo.imageUrl)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ background: 'var(--surface-0)', color: 'var(--text-secondary)' }}
                      aria-label="Preview photo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: photo.id, type: photo.photoType })}
                      className="p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-600 transition-colors"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {photo.brandName || photo.productName || photo.providerId?.slice(0, 8) || '—'}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {PHOTO_TYPE_LABEL[photo.photoType] || photo.photoType}
                    {photo.city ? ` · ${photo.city}` : ''}
                    {photo.uploadedAt ? ` · ${new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pager */}
          {meta && meta.totalPages > 1 && (
            <div
              className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
            >
              <span>
                Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  disabled={meta.page <= 1}
                  onClick={() => setPage(meta.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="px-3 py-1 text-xs font-medium rounded-lg tabular-nums" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage(meta.page + 1)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Full-screen preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <img src={previewUrl} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleRemove}
        title="Remove Photo"
        description="This photo will be permanently deleted. This action cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
