/**
 * Same optimizer as customer-app/utils/compress-image.ts — keep the two in step
 * (the profiles match the server's presets in bdial-service/src/common/image-processor.ts).
 *
 * Every photo the admin panel uploads goes through here first. Whatever comes in — a
 * 100 MB camera original, a screenshot, a transparent logo — goes up as a
 * right-sized image of a few hundred KB that still looks sharp on a phone:
 *
 * - decoded already scaled down where the browser can, so huge photos don't
 *   run the browser out of memory, and one photo at a time for the same reason;
 * - turned the right way up, with location and camera data removed;
 * - saved as WebP (JPEG where the browser can't write WebP) at the highest
 *   quality that fits the size target for what the photo is for.
 *
 * It never hangs: each photo has a deadline, and if the browser can't shrink one
 * the original goes up instead (the server shrinks it), as long as the server
 * will take it.
 */

export type ImageUse =
  | "avatar"
  | "banner"
  | "product"
  | "gallery"
  | "chat"
  | "review"
  | "document"
  | "icon"
  | "thumbnail";

interface Profile {
  /** Longest side, in pixels. */
  maxEdge: number;
  /** What the uploaded file should weigh at most. */
  targetKB: number;
  /** Never go below this quality, even to hit the target. */
  minQuality: number;
}

// Kept at or under the server's presets, so the server stores these as they are.
const PROFILES: Record<ImageUse, Profile> = {
  thumbnail: { maxEdge: 400, targetKB: 40, minQuality: 0.6 },
  // Category icons are shown small.
  icon: { maxEdge: 256, targetKB: 40, minQuality: 0.7 },
  avatar: { maxEdge: 800, targetKB: 120, minQuality: 0.62 },
  product: { maxEdge: 1600, targetKB: 280, minQuality: 0.62 },
  gallery: { maxEdge: 1600, targetKB: 280, minQuality: 0.62 },
  chat: { maxEdge: 1600, targetKB: 260, minQuality: 0.62 },
  review: { maxEdge: 1600, targetKB: 260, minQuality: 0.62 },
  banner: { maxEdge: 1920, targetKB: 360, minQuality: 0.62 },
  // ID documents must stay readable.
  document: { maxEdge: 2400, targetKB: 650, minQuality: 0.74 },
};

const QUALITY_STEPS = [0.82, 0.74, 0.66];

/** The largest file any upload endpoint accepts (matches the server). */
export const SERVER_MAX_BYTES = 25 * 1024 * 1024;
/** Photos this big are still shrunk in the browser; beyond this, they're refused. */
export const MAX_PHOTO_PICK_BYTES = 200 * 1024 * 1024;

const DEADLINE_MS = 45_000;

/** A message that can be shown to the person as it is. */
export class UploadFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadFileError";
  }
}

const MB = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/**
 * Checks a picked file before anything else happens. Returns a message to
 * show, or null if it's fine. Photos may be huge (they're shrunk here);
 * PDFs and other files go up as they are, so they must fit the server.
 */
export function checkPickedFile(file: File): string | null {
  if (isImage(file)) {
    return file.size > MAX_PHOTO_PICK_BYTES
      ? `"${file.name}" is over ${MB(MAX_PHOTO_PICK_BYTES)}. Please choose a different photo.`
      : null;
  }
  return file.size > SERVER_MAX_BYTES
    ? `"${file.name}" is over ${MB(SERVER_MAX_BYTES)}. Please choose a smaller file.`
    : null;
}

const isImage = (file: File) =>
  file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|avif)$/i.test(file.name);

// ─── Public API ──────────────────────────────────────────────────────

/** One photo, ready to upload. Non-images (PDFs) come back unchanged. */
export function optimizeImage(file: File, use: ImageUse): Promise<File> {
  // One at a time: a few large photos decoded together can crash the tab.
  const run = queue.then(() => optimizeNow(file, use));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Several photos, in order. */
export async function optimizeImages(files: File[], use: ImageUse): Promise<File[]> {
  return Promise.all(files.map((f) => optimizeImage(f, use)));
}

let queue: Promise<void> = Promise.resolve();

// ─── Implementation ──────────────────────────────────────────────────

async function optimizeNow(file: File, use: ImageUse): Promise<File> {
  if (!isImage(file) || file.type === "image/svg+xml") return fitsServer(file);
  // GIFs would lose their animation.
  if (file.type === "image/gif") return fitsServer(file);
  if (file.size > MAX_PHOTO_PICK_BYTES) throw new UploadFileError(checkPickedFile(file)!);

  const profile = PROFILES[use];
  const dims = await readDimensions(file).catch(() => null);

  // Already right-sized: sending it as it is keeps it from losing quality twice.
  if (
    dims &&
    (file.type === "image/jpeg" || file.type === "image/webp") &&
    Math.max(dims.w, dims.h) <= profile.maxEdge &&
    file.size <= profile.targetKB * 1024
  ) {
    return file;
  }

  try {
    const blob = await withTimeout(shrink(file, profile, dims), DEADLINE_MS);
    if (blob.size >= file.size && file.size <= SERVER_MAX_BYTES && dims && Math.max(dims.w, dims.h) <= profile.maxEdge) {
      return file;
    }
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = (file.name || use).replace(/\.[^.]+$/, "") || use;
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[optimizeImage] falling back to original:", err);
    if (file.size <= SERVER_MAX_BYTES) return file;
    throw new UploadFileError(
      "This photo couldn't be processed in the browser. Please choose a JPG or PNG photo.",
    );
  }
}

function fitsServer(file: File): File {
  if (file.size > SERVER_MAX_BYTES) {
    throw new UploadFileError(`"${file.name}" is over ${MB(SERVER_MAX_BYTES)}. Please choose a smaller file.`);
  }
  return file;
}

async function shrink(file: File, profile: Profile, dims: Dims | null): Promise<Blob> {
  const type = (await canEncodeWebp()) ? "image/webp" : "image/jpeg";
  const source = await decode(file, profile.maxEdge, dims);
  let edge = profile.maxEdge;
  let best: Blob | null = null;
  try {
    // Up to three sizes: full target size, then a little smaller if a very
    // detailed photo still won't fit at an acceptable quality.
    for (let round = 0; round < 3; round++) {
      const canvas = draw(source, edge, type === "image/jpeg");
      try {
        for (const q of [...QUALITY_STEPS.filter((s) => s > profile.minQuality), profile.minQuality]) {
          const blob = await toBlob(canvas, type, q);
          if (!best || blob.size < best.size) best = blob;
          if (blob.size <= profile.targetKB * 1024) return blob;
        }
      } finally {
        release(canvas);
      }
      edge = Math.round(edge * 0.82);
      if (edge < 640) break;
    }
    return best!;
  } finally {
    if ("close" in source) source.close();
  }
}

type Source = ImageBitmap | HTMLImageElement;
const sizeOf = (s: Source) =>
  "naturalWidth" in s ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height };

/** Decode the photo, scaled down while decoding where the browser allows. */
async function decode(file: File, maxEdge: number, dims: Dims | null): Promise<Source> {
  if (typeof createImageBitmap === "function") {
    try {
      const scale = dims ? Math.min(1, (maxEdge * 1.25) / Math.max(dims.w, dims.h)) : 1;
      // Only the width is given, so the shape is kept even if the photo is
      // stored sideways (any extra size is trimmed when drawing).
      return await createImageBitmap(
        file,
        scale < 1
          ? { resizeWidth: Math.max(1, Math.round(dims!.w * scale)), resizeQuality: "high", imageOrientation: "from-image" }
          : { imageOrientation: "from-image" },
      );
    } catch {
      /* fall through to <img>, e.g. HEIC on Safari */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The decoded image stays usable after the URL is revoked.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Draw into a canvas no bigger than `edge`, halving in steps for a crisp result. */
function draw(source: Source, edge: number, opaque: boolean): HTMLCanvasElement {
  const { w, h } = sizeOf(source);
  const scale = Math.min(1, edge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  let current: CanvasImageSource = source;
  let cw = w;
  let ch = h;
  let step: HTMLCanvasElement | null = null;
  // Big jumps in one go look soft; halve until within 2x of the target.
  while (cw > 2 * tw) {
    const next = document.createElement("canvas");
    next.width = Math.round(cw / 2);
    next.height = Math.round(ch / 2);
    const ctx = next.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, next.width, next.height);
    if (step) release(step);
    step = next;
    current = next;
    cw = next.width;
    ch = next.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d")!;
  if (opaque) {
    // JPEG has no transparency: a logo's clear background becomes white, not black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, tw, th);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, tw, th);
  if (step) release(step);
  return canvas;
}

/** Free a canvas's memory now (iOS keeps it otherwise). */
function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode-failed"))), type, quality),
  );
}

let webpSupport: Promise<boolean> | null = null;
/** Safari can't write WebP from a canvas (it quietly writes PNG instead). */
function canEncodeWebp(): Promise<boolean> {
  webpSupport ??= new Promise((resolve) => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      c.toBlob((b) => resolve(b?.type === "image/webp"), "image/webp", 0.8);
    } catch {
      resolve(false);
    }
  });
  return webpSupport;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error("optimize-timeout")), ms);
    }),
  ]);
}

// ─── Reading a photo's size without decoding it ──────────────────────

interface Dims {
  w: number;
  h: number;
}

/** Width and height from the file header (JPEG, PNG, WebP), as stored. */
async function readDimensions(file: File): Promise<Dims | null> {
  const buf = new DataView(await file.slice(0, 512 * 1024).arrayBuffer());
  const len = buf.byteLength;
  if (len < 30) return null;

  // PNG: IHDR right after the signature.
  if (buf.getUint32(0) === 0x89504e47) return { w: buf.getUint32(16), h: buf.getUint32(20) };

  // WebP: RIFF....WEBP
  if (buf.getUint32(0) === 0x52494646 && buf.getUint32(8) === 0x57454250) {
    const chunk = buf.getUint32(12);
    if (chunk === 0x56503820) {
      // "VP8 " (lossy)
      return { w: buf.getUint16(26, true) & 0x3fff, h: buf.getUint16(28, true) & 0x3fff };
    }
    if (chunk === 0x5650384c) {
      // "VP8L" (lossless)
      const b = buf.getUint32(21, true);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 0x56503858) {
      // "VP8X" (extended)
      const w = 1 + (buf.getUint8(24) | (buf.getUint8(25) << 8) | (buf.getUint8(26) << 16));
      const h = 1 + (buf.getUint8(27) | (buf.getUint8(28) << 8) | (buf.getUint8(29) << 16));
      return { w, h };
    }
    return null;
  }

  // JPEG: walk the markers to the frame header (SOFn).
  if (buf.getUint16(0) === 0xffd8) {
    let i = 2;
    while (i + 9 < len) {
      if (buf.getUint8(i) !== 0xff) {
        i++;
        continue;
      }
      const marker = buf.getUint8(i + 1);
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const size = buf.getUint16(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { h: buf.getUint16(i + 5), w: buf.getUint16(i + 7) };
      i += 2 + size;
    }
  }
  return null;
}
