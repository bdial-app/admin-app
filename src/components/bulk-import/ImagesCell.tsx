import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Link2, Loader2, Check, X, Plus, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  MAX_GALLERY_PHOTOS, MAX_IMAGE_BYTES, allImages, makeFileImage, parseImageFileName,
  type ImageRole, type RowImage, type RowImages,
} from '../../utils/bulk-import-images';

const ROLE_LABEL: Record<ImageRole, string> = { logo: 'Logo', banner: 'Banner', gallery: 'Gallery' };
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const SUPPORTED = /\.(jpe?g|png|webp|gif)$/i;

const shortLink = (url: string) => {
  try {
    const u = new URL(url);
    return /drive\.google\.com|docs\.google\.com/.test(u.hostname) ? 'Google Drive file' : u.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 32);
  }
};

function StatusDot({ img }: { img: RowImage }) {
  if (img.status === 'uploading') return <span className="vet-img-status" data-status="uploading"><Loader2 className="h-2.5 w-2.5 animate-spin" /></span>;
  if (img.status === 'done') return <span className="vet-img-status" data-status="done"><Check className="h-2.5 w-2.5" /></span>;
  if (img.status === 'failed') return <span className="vet-img-status" data-status="failed" title={img.error}><X className="h-2.5 w-2.5" /></span>;
  return null;
}

function Thumb({ img, variant }: { img?: RowImage; variant: ImageRole }) {
  const title = img ? `${ROLE_LABEL[img.role]}: ${img.name}${img.error ? `\n${img.error}` : ''}` : `No ${ROLE_LABEL[variant].toLowerCase()}`;
  return (
    <span className="vet-img-slot" data-variant={variant} data-empty={img ? undefined : 'true'} title={title}>
      {img?.previewUrl ? <img src={img.previewUrl} alt="" loading="lazy" decoding="async" /> : img ? <Link2 className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
      {img && <StatusDot img={img} />}
    </span>
  );
}

function PickButton({ label, multiple, onPick }: { label: string; multiple?: boolean; onPick: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className="vet-btn">
        {multiple ? <Plus className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="hidden"
        onChange={(e) => { onPick(Array.from(e.target.files ?? [])); e.target.value = ''; }}
      />
    </>
  );
}

function SlotEditor({ role, img, disabled, onPick, onRemove }: {
  role: 'logo' | 'banner'; img?: RowImage; disabled: boolean; onPick: (files: File[]) => void; onRemove: (img: RowImage) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Thumb img={img} variant={role} />
      <div className="min-w-0 flex-1">
        <p className="vet-img-label">{ROLE_LABEL[role]}</p>
        {img ? (
          img.source === 'url' ? (
            <a href={img.url} target="_blank" rel="noreferrer" className="vet-img-name inline-flex items-center gap-1">
              {shortLink(img.url ?? '')} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="vet-img-name truncate" title={img.name}>{img.name}</p>
          )
        ) : (
          <p className="vet-sub">None</p>
        )}
        {img?.error && <p className="vet-img-error">{img.error}</p>}
      </div>
      {!disabled && (
        <div className="flex items-center gap-1">
          <PickButton label={img ? 'Replace' : 'Choose'} onPick={onPick} />
          {img && img.status !== 'done' && (
            <button type="button" onClick={() => onRemove(img)} className="vet-btn" aria-label={`Remove ${ROLE_LABEL[role].toLowerCase()}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Logo / banner / gallery for one row: thumbnails, drop target and an editor popover. */
export function ImagesCell({ images, disabled, onChange }: {
  images: RowImages;
  disabled: boolean;
  onChange: (next: RowImages, discarded: RowImage[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = allImages(images).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const addFiles = (files: File[], forcedRole?: ImageRole) => {
    const valid = files.filter((f) => SUPPORTED.test(f.name) && f.size <= MAX_IMAGE_BYTES);
    const skipped = files.length - valid.length;
    if (skipped) toast.warn(`${skipped} file${skipped === 1 ? '' : 's'} skipped — use JPG, PNG, WebP or GIF under 10MB`);
    if (valid.length === 0) return;

    const next: RowImages = { ...images, gallery: [...images.gallery] };
    const discarded: RowImage[] = [];
    let overflow = 0;
    for (const file of valid) {
      const role = forcedRole ?? parseImageFileName(file.name).role;
      if (role === 'gallery') {
        if (next.gallery.length >= MAX_GALLERY_PHOTOS) { overflow++; continue; }
        next.gallery.push(makeFileImage(file, 'gallery'));
      } else {
        const old = next[role];
        if (old) discarded.push(old);
        next[role] = makeFileImage(file, role);
      }
    }
    if (overflow) toast.warn(`Gallery holds ${MAX_GALLERY_PHOTOS} photos — ${overflow} not added`);
    onChange(next, discarded);
  };

  const remove = (img: RowImage) => {
    onChange(
      {
        logo: images.logo?.id === img.id ? undefined : images.logo,
        banner: images.banner?.id === img.id ? undefined : images.banner,
        gallery: images.gallery.filter((g) => g.id !== img.id),
      },
      [img],
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled && total === 0}
        onClick={() => setOpen((o) => !o)}
        onDragOver={(e) => { if (disabled) return; e.preventDefault(); e.stopPropagation(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          addFiles(Array.from(e.dataTransfer.files ?? []));
        }}
        className="vet-img-cell"
        data-over={over ? 'true' : undefined}
        aria-label={total ? `${total} image${total === 1 ? '' : 's'} — edit` : 'Add images'}
        aria-expanded={open}
      >
        <Thumb img={images.logo} variant="logo" />
        <Thumb img={images.banner} variant="banner" />
        {images.gallery.length > 0 ? (
          <span className="vet-img-count">+{images.gallery.length}</span>
        ) : (
          total === 0 && !disabled && <span className="vet-img-hint">Add</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-80 rounded-xl border p-3" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
          <SlotEditor role="logo" img={images.logo} disabled={disabled} onPick={(f) => addFiles(f.slice(0, 1), 'logo')} onRemove={remove} />
          <SlotEditor role="banner" img={images.banner} disabled={disabled} onPick={(f) => addFiles(f.slice(0, 1), 'banner')} onRemove={remove} />

          <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center justify-between">
              <p className="vet-img-label">Gallery <span className="tabular-nums">{images.gallery.length}/{MAX_GALLERY_PHOTOS}</span></p>
              {!disabled && images.gallery.length < MAX_GALLERY_PHOTOS && (
                <PickButton multiple label="Add photos" onPick={(f) => addFiles(f, 'gallery')} />
              )}
            </div>
            {images.gallery.length > 0 ? (
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {images.gallery.map((g) => (
                  <div key={g.id} className="relative">
                    <Thumb img={g} variant="gallery" />
                    {!disabled && g.status !== 'done' && (
                      <button type="button" onClick={() => remove(g)} className="vet-img-remove" aria-label={`Remove ${g.name}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="vet-sub">No gallery photos</p>
            )}
            {images.gallery.some((g) => g.error) && (
              <div className="mt-2 space-y-0.5">
                {images.gallery.filter((g) => g.error).map((g) => (
                  <p key={g.id} className="vet-img-error truncate" title={`${g.name}: ${g.error}`}>{g.error}</p>
                ))}
              </div>
            )}
          </div>

          {!disabled && (
            <p className="vet-sub mt-3">Tip: drop photos onto this cell. Names containing “logo” or “banner” go to that slot; the rest go to the gallery.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Read-only list of a row's images with upload status, for the row detail panel. */
export function ImageList({ images }: { images: RowImages }) {
  return (
    <div className="divide-y rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
      {allImages(images).map((img) => (
        <div key={img.id} className="flex items-center gap-3 px-3 py-2" style={{ borderColor: 'var(--border-light)' }}>
          <Thumb img={img} variant={img.role} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {ROLE_LABEL[img.role]} · {img.source === 'url' ? shortLink(img.url ?? '') : 'Local file'}
            </p>
            <p className="truncate text-sm" style={{ color: 'var(--text-primary)' }} title={img.name}>{img.name}</p>
            {img.error && <p className="vet-img-error">{img.error}</p>}
          </div>
          <span
            className="text-[11px] font-medium"
            style={{ color: img.status === 'failed' ? 'var(--color-danger-dark)' : img.status === 'done' ? 'var(--color-success-dark)' : 'var(--text-muted)' }}
          >
            {img.status === 'done' ? 'Uploaded' : img.status === 'failed' ? 'Failed' : img.status === 'uploading' ? 'Uploading…' : 'Waiting'}
          </span>
        </div>
      ))}
    </div>
  );
}
