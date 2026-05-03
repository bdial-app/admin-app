import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: 'image/webp',
};

/**
 * Compress an image file before upload.
 * Skips non-images, GIFs, and files already under 100KB.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file;
  if (file.size < 100 * 1024) return file;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: opts.useWebWorker,
      fileType: opts.fileType,
      initialQuality: 0.8,
    });
    const newName = file.name.replace(/\.[^.]+$/, '.webp');
    return new File([compressed], newName, { type: opts.fileType });
  } catch (error) {
    console.warn('[Image Compression] Failed, using original:', error);
    return file;
  }
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImageFiles(
  files: File[],
  options: CompressOptions = {},
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageFile(f, options)));
}

export const COMPRESS_PRESETS = {
  banner: { maxSizeMB: 1, maxWidthOrHeight: 1600 } satisfies CompressOptions,
  product: { maxSizeMB: 1, maxWidthOrHeight: 2048 } satisfies CompressOptions,
  icon: { maxSizeMB: 0.3, maxWidthOrHeight: 512 } satisfies CompressOptions,
} as const;
