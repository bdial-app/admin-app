import { useState } from 'react';
import { ImageOff, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { usePhotosForModeration, useRemovePhoto } from '../hooks/usePhotoModeration';
import { ROUTES } from '../utils/constants';
import type { PhotoType } from '../types';

const TYPE_TABS = [
  { label: 'All', value: '' },
  { label: 'Provider Photos', value: 'provider' },
  { label: 'Review Photos', value: 'review' },
  { label: 'Product Photos', value: 'product' },
] as const;

const PHOTO_TYPE_LABEL: Record<string, string> = {
  provider: 'Provider',
  review: 'Review',
  product: 'Product',
};

export default function PhotoModeration() {
  const [type, setType] = useState<PhotoType | ''>('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: PhotoType } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: photos, isLoading } = usePhotosForModeration({
    type: type || undefined,
    limit: 50,
  });
  const removeMutation = useRemovePhoto();

  const handleRemove = async () => {
    if (!confirmDelete) return;
    await removeMutation.mutateAsync(confirmDelete);
    setConfirmDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Photo Moderation"
        description="Review and remove inappropriate photos"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Photo Moderation' }]}
      />

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setType(tab.value as typeof type)}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: type === tab.value ? 'var(--surface-0)' : 'transparent',
              color: type === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: type === tab.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : !photos || photos.length === 0 ? (
        <EmptyState icon={ImageOff} title="No photos to moderate" description="All photos have been reviewed" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: photo.id, type: photo.photoType })}
                    className="p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {photo.brandName || photo.productName || photo.providerId?.slice(0, 8) || '—'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {PHOTO_TYPE_LABEL[photo.photoType] || photo.photoType}{photo.uploadedAt ? ` · ${new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
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
