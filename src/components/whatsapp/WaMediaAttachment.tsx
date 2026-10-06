import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, ImageOff, Loader2, RotateCw, X } from 'lucide-react';
import api from '../../services/api';
import { URLS } from '../../utils/urls';
import type { WaMessageMedia } from '../../types';

const LABEL: Record<WaMessageMedia['type'], string> = {
  image: 'Photo',
  sticker: 'Sticker',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
};

const fmtSize = (n: number | null) =>
  n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/**
 * A photo, video, voice note or document a customer sent. The bytes come from
 * the API with the admin's sign-in (never a public link), so they are fetched
 * as a blob and shown from a local object URL.
 */
export function WaMediaAttachment({ messageId, media }: { messageId: string; media: WaMessageMedia }) {
  const { data: blob, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['wa-message-media', messageId],
    queryFn: async () => (await api.get<Blob>(URLS.WHATSAPP.MESSAGE_MEDIA(messageId), { responseType: 'blob' })).data,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const [open, setOpen] = useState(false);

  const ext = (media.mimeType ?? blob?.type ?? '').split('/')[1]?.split(';')[0] || 'bin';
  const fileName = media.fileName || `whatsapp-${media.type}-${messageId.slice(0, 8)}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const size = fmtSize(media.size ?? blob?.size ?? null);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadBtn = (
    <button
      type="button"
      onClick={download}
      disabled={!url}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium disabled:opacity-50"
      style={{ background: 'rgba(0,0,0,0.12)', color: 'var(--wa-text)' }}
      title={`Download ${fileName}`}
    >
      <Download className="w-3.5 h-3.5" /> Download
    </button>
  );

  if (isLoading) {
    return (
      <div className="w-64 max-w-full h-40 rounded-md flex items-center justify-center gap-2 text-[12px]" style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--wa-time)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading {LABEL[media.type].toLowerCase()}…
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div className="w-64 max-w-full rounded-md p-3 text-[12px] flex flex-col items-start gap-2" style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--wa-time)' }}>
        <span className="inline-flex items-center gap-1.5"><ImageOff className="w-4 h-4" /> Couldn't load this {LABEL[media.type].toLowerCase()}.</span>
        <span className="text-[11px] leading-snug">Meta only keeps customer media for a limited time; ask them to send it again if it has expired.</span>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--wa-link)' }}>
          <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Try again
        </button>
      </div>
    );
  }

  if (media.type === 'image' || media.type === 'sticker') {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="block rounded-md overflow-hidden" title="Open full size">
          <img src={url} alt={media.caption ?? LABEL[media.type]} className={media.type === 'sticker' ? 'w-32 h-32 object-contain' : 'max-w-full w-72 max-h-80 object-cover'} />
        </button>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px]" style={{ color: 'var(--wa-time)' }}>{LABEL[media.type]}{size ? ` · ${size}` : ''}</span>
          {downloadBtn}
        </div>
        {open &&
          createPortal(
            <div className="fixed inset-0 z-[1000] bg-black/85 flex flex-col" onClick={() => setOpen(false)}>
              <div className="flex items-center justify-end gap-2 p-3" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={download} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white hover:bg-white/15" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                <img src={url} alt={media.caption ?? LABEL[media.type]} className="max-w-full max-h-full object-contain rounded" onClick={(e) => e.stopPropagation()} />
              </div>
              {media.caption && <p className="text-center text-white/90 text-sm px-4 pb-5">{media.caption}</p>}
            </div>,
            document.body,
          )}
      </>
    );
  }

  if (media.type === 'video') {
    return (
      <>
        <video src={url} controls className="max-w-full w-72 max-h-80 rounded-md bg-black" />
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px]" style={{ color: 'var(--wa-time)' }}>Video{size ? ` · ${size}` : ''}</span>
          {downloadBtn}
        </div>
      </>
    );
  }

  if (media.type === 'audio') {
    return (
      <div className="w-72 max-w-full">
        <audio src={url} controls className="w-full" />
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px]" style={{ color: 'var(--wa-time)' }}>{media.voiceNote ? 'Voice note' : 'Audio'}{size ? ` · ${size}` : ''}</span>
          {downloadBtn}
        </div>
      </div>
    );
  }

  // Documents: open in a new tab (PDFs preview there) or download.
  return (
    <div className="w-72 max-w-full flex items-center gap-2.5 p-2.5 rounded-md" style={{ background: 'rgba(0,0,0,0.08)' }}>
      <FileText className="w-8 h-8 shrink-0" style={{ color: 'var(--wa-time)' }} />
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
        <p className="text-[13px] font-medium truncate">{fileName}</p>
        <p className="text-[11px]" style={{ color: 'var(--wa-time)' }}>{[ext.toUpperCase(), size].filter(Boolean).join(' · ')}</p>
      </a>
      {downloadBtn}
    </div>
  );
}
