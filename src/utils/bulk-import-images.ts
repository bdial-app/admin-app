import { Unzip, UnzipInflate, UnzipPassThrough } from 'fflate';
import type { ImportRow, RowIssue } from './bulk-import';

// ═══════════════════════════════════════════════════════════════════════════
// Images for bulk provider import
//
// Three ways in, one model:
//  1. Link columns in the sheet (Google Form file uploads land as Drive links)
//  2. A folder / ZIP / loose files, matched to rows by the owner's mobile number
//  3. Per-row attach in the vet table
// Nothing is uploaded until the provider exists; then each image succeeds or
// fails on its own and can be retried.
// ═══════════════════════════════════════════════════════════════════════════

export type ImageRole = 'logo' | 'banner' | 'gallery';
export type ImageStatus = 'uploading' | 'done' | 'failed';

export interface RowImage {
  id: string;
  role: ImageRole;
  source: 'file' | 'url';
  /** File name, or the link as written in the sheet */
  name: string;
  file?: File;
  url?: string;
  /** Object URL for local files. Links aren't previewed — Drive blocks hot-linking. */
  previewUrl?: string;
  status?: ImageStatus;
  error?: string;
}

export interface RowImages {
  logo?: RowImage;
  banner?: RowImage;
  gallery: RowImage[];
}

/** Same ceiling the server enforces per provider. */
export const MAX_GALLERY_PHOTOS = 10;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;
const JUNK_PATH = /(^|\/)(__MACOSX|\.[^/]*)(\/|$)/;

let seq = 0;
const nextId = () => `img-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const emptyImages = (): RowImages => ({ gallery: [] });

export function allImages(images: RowImages): RowImage[] {
  return [images.logo, images.banner, ...images.gallery].filter((i): i is RowImage => !!i);
}

export const countImages = (images: RowImages) => allImages(images).length;

export function makeFileImage(file: File, role: ImageRole): RowImage {
  const canPreview = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  return { id: nextId(), role, source: 'file', name: file.name, file, previewUrl: canPreview ? URL.createObjectURL(file) : undefined };
}

export function makeLinkImage(url: string, role: ImageRole): RowImage {
  return { id: nextId(), role, source: 'url', name: url, url };
}

/** Free the memory held by local-file previews. */
export function revokeImages(images: RowImage[]): void {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  for (const img of images) if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
}

// ── 1. Links from sheet cells ─────────────────────────────────────────────

const NOT_A_VALUE = /^(na|n\/a|no|none|nil|-|nope|not yet|will send|later)$/i;

export function extractLinks(raw: string): string[] {
  return (raw ?? '').split(/[\s,;|]+/).map((s) => s.trim()).filter((s) => /^https?:\/\/\S+$/i.test(s));
}

export function imagesFromLinks(logoRaw: string, bannerRaw: string, galleryRaw: string): { images: RowImages; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const read = (raw: string, label: string) => {
    const text = (raw ?? '').trim();
    const links = extractLinks(text);
    if (text && links.length === 0 && !NOT_A_VALUE.test(text)) {
      issues.push({ field: 'images', message: `${label} isn't a link: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"` });
    }
    return links;
  };
  const logo = read(logoRaw, 'Logo cell');
  const banner = read(bannerRaw, 'Banner cell');
  const gallery = read(galleryRaw, 'Gallery cell');

  const images = emptyImages();
  if (logo[0]) images.logo = makeLinkImage(logo[0], 'logo');
  if (banner[0]) images.banner = makeLinkImage(banner[0], 'banner');
  // A form that allowed several logo/banner uploads: keep the extras as gallery photos.
  const extra = [...logo.slice(1), ...banner.slice(1), ...gallery];
  images.gallery = extra.slice(0, MAX_GALLERY_PHOTOS).map((u) => makeLinkImage(u, 'gallery'));
  if (extra.length > MAX_GALLERY_PHOTOS) {
    issues.push({ field: 'images', message: `${extra.length} gallery links — only the first ${MAX_GALLERY_PHOTOS} will be imported` });
  }
  return { images, issues };
}

// ── 2. Local files: folder, ZIP or loose images ───────────────────────────

export interface SourceFile {
  /** Relative path inside the folder/ZIP, or just the file name */
  path: string;
  file: File;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
};
const extOf = (name: string) => (name.match(/\.([^./]+)$/)?.[1] ?? '').toLowerCase();

/** Bytes kept per ZIP entry. Anything larger is cut off and reported by the matcher as too large. */
const ENTRY_KEEP_BYTES = MAX_IMAGE_BYTES + 1;

/**
 * Read a ZIP entry by entry instead of loading it whole. A ZIP of photos for a few
 * hundred businesses can run to several GB — reading that into one ArrayBuffer
 * crashes the tab. Only image entries are decompressed, and each is capped.
 */
async function unzipImages(zip: File): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  const root = zip.name.replace(/\.zip$/i, '');
  const state: { error: Error | null } = { error: null };

  const unzipper = new Unzip((entry) => {
    const name = entry.name;
    // Entries that are never started are skipped without being decompressed.
    if (name.endsWith('/') || JUNK_PATH.test(name) || !(IMAGE_EXT.test(name) || HEIC_EXT.test(name))) return;
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let kept = 0;
    entry.ondata = (err, chunk, final) => {
      if (err) { state.error = err; return; }
      if (kept < ENTRY_KEEP_BYTES) {
        const piece = chunk.slice(0, ENTRY_KEEP_BYTES - kept);
        parts.push(piece);
        kept += piece.byteLength;
      }
      if (final) {
        const base = name.split('/').pop() ?? name;
        out.push({ path: `${root}/${name}`, file: new File(parts, base, { type: MIME_BY_EXT[extOf(base)] ?? '' }) });
      }
    };
    try {
      entry.start();
    } catch (err) {
      state.error = err as Error;
    }
  });
  unzipper.register(UnzipInflate);
  unzipper.register(UnzipPassThrough);

  const reader = zip.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      unzipper.push(new Uint8Array(0), true);
      break;
    }
    unzipper.push(value);
    if (state.error) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  if (state.error) {
    throw new Error(`Couldn't read ${zip.name} (${state.error.message}). Try “Choose a folder” instead.`);
  }
  return out;
}

/** Expand ZIPs, drop OS junk (.DS_Store, __MACOSX). Non-images are kept so they can be reported. */
export async function expandImageSources(files: File[]): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  for (const f of files) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (/\.zip$/i.test(f.name)) {
      out.push(...(await unzipImages(f)));
    } else if (!JUNK_PATH.test(path)) {
      out.push({ path, file: f });
    }
  }
  return out;
}

/**
 * Files dropped from the OS, including whole folders.
 * Must be called synchronously inside the drop handler — the browser clears
 * DataTransfer items once the event returns.
 */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items ?? [])
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() ?? null : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (entries.length === 0) return Array.from(dt.files ?? []);

  const out: File[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      Object.defineProperty(file, 'webkitRelativePath', { value: `${prefix}${file.name}` });
      out.push(file);
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  };
  for (const entry of entries) await walk(entry, '');
  return out;
}

// Indian mobile, optionally +91 / 91 / 0 prefixed, spaces or dashes allowed inside.
const PHONE = /(?<!\d)(?:\+?91[\s-]?|0)?([6-9](?:[\s-]?\d){9})(?!\d)/;

const ROLE_WORDS: Record<string, ImageRole> = {
  logo: 'logo', dp: 'logo', profile: 'logo', avatar: 'logo', icon: 'logo',
  banner: 'banner', cover: 'banner', header: 'banner', shopfront: 'banner', storefront: 'banner',
};

/**
 * "9876543210_logo.jpg" → logo, "98765 43210 cover.png" → banner,
 * "9876543210_3.jpg" → gallery, "9876543210/logo.jpg" → logo (folder per business).
 */
export function parseImageFileName(path: string): { mobile: string | null; role: ImageRole } {
  const segments = path.split(/[\\/]/).filter(Boolean);
  const base = (segments.pop() ?? '').replace(/\.[^.]+$/, '');
  const parent = segments.pop() ?? '';
  const inBase = base.match(PHONE);
  const match = inBase ?? parent.match(PHONE);
  const mobile = match ? match[1].replace(/\D/g, '') : null;
  const words = (inBase ? base.replace(inBase[0], ' ') : base).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const role = words.map((w) => ROLE_WORDS[w]).find((r): r is ImageRole => !!r) ?? 'gallery';
  return { mobile, role };
}

export interface ImageMatchSummary {
  files: number;
  attached: number;
  rowsTouched: number;
  /** Logo/banner images (e.g. from a sheet link) replaced by a matched file */
  replaced: number;
  unmatched: { name: string; reason: string }[];
}

export function matchImageFiles(
  sources: SourceFile[],
  rows: ImportRow[],
): { rows: ImportRow[]; summary: ImageMatchSummary; discarded: RowImage[] } {
  const byMobile = new Map<string, number>();
  rows.forEach((r, i) => { if (r.fields.mobile && !byMobile.has(r.fields.mobile)) byMobile.set(r.fields.mobile, i); });

  const next = rows.slice();
  const touched = new Set<number>();
  const batchIds = new Set<string>();
  const discarded: RowImage[] = [];
  const unmatched: ImageMatchSummary['unmatched'] = [];
  let attached = 0;
  let replaced = 0;

  // Stable, human order: 9876543210_2 before 9876543210_10, and 9876543210_logo before
  // 9876543210_logo_alt. Compare without the extension — otherwise "_logo." sorts after
  // "_logo_" and the decorated file would claim the logo slot.
  const sortKey = (p: string) => p.replace(/\.[^./]+$/, '');
  const ordered = [...sources].sort((a, b) => sortKey(a.path).localeCompare(sortKey(b.path), undefined, { numeric: true }));

  for (const { path, file } of ordered) {
    if (HEIC_EXT.test(file.name)) { unmatched.push({ name: path, reason: 'HEIC photos aren\'t supported — export as JPG or PNG' }); continue; }
    if (!IMAGE_EXT.test(file.name)) { unmatched.push({ name: path, reason: 'Not a JPG, PNG, WebP or GIF image' }); continue; }
    if (file.size > MAX_IMAGE_BYTES) { unmatched.push({ name: path, reason: `Larger than ${MAX_IMAGE_BYTES / (1024 * 1024)}MB` }); continue; }

    const { mobile, role } = parseImageFileName(path);
    if (!mobile) { unmatched.push({ name: path, reason: 'No mobile number in the file or folder name' }); continue; }
    const i = byMobile.get(mobile);
    if (i === undefined) { unmatched.push({ name: path, reason: `No row with mobile ${mobile}` }); continue; }
    const row = next[i];
    if (row.importResult?.ok) { unmatched.push({ name: path, reason: `Row ${row.sourceIndex} is already imported` }); continue; }

    const images: RowImages = { ...row.images, gallery: [...row.images.gallery] };
    let target: ImageRole = role;
    // Two "logo" files in the same drop: keep the first as logo, the rest as gallery.
    if (role !== 'gallery' && images[role] && batchIds.has(images[role]!.id)) target = 'gallery';

    if (target === 'gallery') {
      if (images.gallery.length >= MAX_GALLERY_PHOTOS) {
        // A second logo/banner only lands here because its slot was taken — say both.
        const reason = role === 'gallery'
          ? `Row ${row.sourceIndex} already has ${MAX_GALLERY_PHOTOS} gallery photos`
          : `Row ${row.sourceIndex} already has a ${role} and ${MAX_GALLERY_PHOTOS} gallery photos`;
        unmatched.push({ name: path, reason });
        continue;
      }
      const img = makeFileImage(file, 'gallery');
      batchIds.add(img.id);
      images.gallery.push(img);
    } else {
      const img = makeFileImage(file, target);
      batchIds.add(img.id);
      const old = images[target];
      if (old) { discarded.push(old); replaced++; }
      images[target] = img;
    }

    next[i] = { ...row, images };
    touched.add(i);
    attached++;
  }

  return { rows: next, summary: { files: sources.length, attached, rowsTouched: touched.size, replaced, unmatched }, discarded };
}

// ── 3. Upload after the provider exists ───────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Re-run a request that was rate-limited (HTTP 429). The throttler rejects before
 * the handler runs, so a retry can never create a duplicate. Every other error is
 * re-thrown untouched. Retry-After isn't readable cross-origin, so back off
 * exponentially (2s, 4s, 8s, 16s) to outlast a one-minute window.
 */
export async function withRateLimitRetry<T>(fn: () => Promise<T>, attempts = 5, baseDelayMs = 2000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 429 || attempt >= attempts - 1) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

export interface LinkImportResult {
  kind: ImageRole;
  url: string;
  ok: boolean;
  error?: string;
}

export interface ImageUploadApi {
  updateImages: (providerId: string, payload: { logo?: File; banner?: File }) => Promise<unknown>;
  uploadPhotos: (providerId: string, files: File[]) => Promise<unknown>;
  importImageUrls: (providerId: string, body: { logoUrl?: string; bannerUrl?: string; galleryUrls?: string[] }) => Promise<{ results: LinkImportResult[] }>;
}

const apiMessage = (err: unknown) => {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string') return msg;
  return (err as Error)?.message || 'Upload failed';
};

/** The images that should go up now. */
export function imagesToSend(images: RowImages, onlyFailed: boolean): RowImage[] {
  return allImages(images).filter((img) => (onlyFailed ? img.status === 'failed' : img.status !== 'done'));
}

export function withStatus(images: RowImages, ids: string[], status: ImageStatus): RowImages {
  const set = new Set(ids);
  const upd = (img?: RowImage) => (img && set.has(img.id) ? { ...img, status, error: undefined } : img);
  return { logo: upd(images.logo), banner: upd(images.banner), gallery: images.gallery.map((g) => upd(g) as RowImage) };
}

/**
 * Upload one provider's images: logo/banner files in one request, gallery files
 * in one request, links in one request that the server downloads and reports on
 * individually. Every image ends as done or failed with a reason.
 */
export async function uploadRowImages(providerId: string, images: RowImages, api: ImageUploadApi, onlyFailed = false): Promise<RowImages> {
  const sending = new Set(imagesToSend(images, onlyFailed).map((i) => i.id));
  const state = new Map(allImages(images).map((i) => [i.id, i]));
  const settle = (list: RowImage[], ok: boolean, error?: string) => {
    for (const img of list) state.set(img.id, { ...img, status: ok ? 'done' : 'failed', error: ok ? undefined : error });
  };
  const pick = (img: RowImage | undefined, source: RowImage['source']) => (img && img.source === source && sending.has(img.id) ? img : undefined);

  const logoFile = pick(images.logo, 'file');
  const bannerFile = pick(images.banner, 'file');
  const slotFiles = [logoFile, bannerFile].filter((i): i is RowImage => !!i);
  if (slotFiles.length) {
    try {
      await api.updateImages(providerId, { logo: logoFile?.file, banner: bannerFile?.file });
      settle(slotFiles, true);
    } catch (err) {
      settle(slotFiles, false, apiMessage(err));
    }
  }

  const galleryFiles = images.gallery.filter((g) => !!pick(g, 'file'));
  if (galleryFiles.length) {
    try {
      await api.uploadPhotos(providerId, galleryFiles.map((g) => g.file as File));
      settle(galleryFiles, true);
    } catch (err) {
      settle(galleryFiles, false, apiMessage(err));
    }
  }

  const linkLogo = pick(images.logo, 'url');
  const linkBanner = pick(images.banner, 'url');
  const galleryLinks = images.gallery.filter((g) => !!pick(g, 'url'));
  const links = [linkLogo, linkBanner, ...galleryLinks].filter((i): i is RowImage => !!i);
  if (links.length) {
    try {
      const { results } = await api.importImageUrls(providerId, {
        logoUrl: linkLogo?.url,
        bannerUrl: linkBanner?.url,
        galleryUrls: galleryLinks.map((g) => g.url as string),
      });
      const pending = [...links];
      for (const r of results ?? []) {
        const idx = pending.findIndex((img) => img.role === r.kind && img.url === r.url);
        if (idx === -1) continue;
        const [img] = pending.splice(idx, 1);
        settle([img], r.ok, r.error);
      }
      settle(pending, false, 'The server did not report a result for this image');
    } catch (err) {
      settle(links, false, apiMessage(err));
    }
  }

  const get = (img?: RowImage) => (img ? state.get(img.id) : undefined);
  return { logo: get(images.logo), banner: get(images.banner), gallery: images.gallery.map((g) => get(g) as RowImage) };
}

/** One-line summary for the import report CSV. */
export function summarizeImages(images: RowImages): string {
  const all = allImages(images);
  if (all.length === 0) return '';
  const done = all.filter((i) => i.status === 'done').length;
  const failed = all.filter((i) => i.status === 'failed');
  if (done === 0 && failed.length === 0) return `${all.length} attached`;
  return [`${done}/${all.length} uploaded`, ...failed.map((f) => `${f.role}: ${f.error ?? 'failed'}`)].join('; ');
}
