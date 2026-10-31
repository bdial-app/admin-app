import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  body: string;
  imageUrl?: string | null;
  /** Shown under the phone: who this preview is personalised for, where it opens. */
  caption?: string;
}

/**
 * The push as it lands on a lock screen. Android expands to show a big
 * picture; iPhone shows it as a thumbnail until the person presses on it.
 */
export function PushPhonePreview({ title, body, imageUrl, caption }: Props) {
  const [os, setOs] = useState<'android' | 'ios'>('android');
  const [broken, setBroken] = useState<string | null>(null);
  const img = imageUrl && broken !== imageUrl ? imageUrl : null;
  const t = title.trim() || 'Your title';
  const b = body.trim() || 'Your message shows here.';

  return (
    <div>
      <div className="flex gap-1 p-1 rounded-lg w-fit mb-3" style={{ background: 'var(--surface-1)' }}>
        {(['android', 'ios'] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOs(o)}
            className="px-3 py-1 text-xs font-medium rounded-md"
            style={{
              background: os === o ? 'var(--surface-0)' : 'transparent',
              color: os === o ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: os === o ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {o === 'android' ? 'Android' : 'iPhone'}
          </button>
        ))}
      </div>

      <div
        className="rounded-[28px] p-3 pt-8 pb-10 mx-auto"
        style={{
          maxWidth: 340,
          background: 'linear-gradient(160deg, #1f3b57 0%, #0f1e2e 55%, #2a1f3d 100%)',
          border: '6px solid #111827',
        }}
      >
        <p className="text-center text-white/90 text-3xl font-light tracking-wide">9:41</p>
        <p className="text-center text-white/60 text-[11px] mb-5">Friday, 31 October</p>

        {os === 'android' ? (
          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.94)' }}>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#4b5563' }}>
              <img src="/logo.jpeg" alt="" className="w-4 h-4 rounded-full object-cover" />
              <span className="font-medium">Tijarah</span>
              <span>· now</span>
              <ChevronDown className="w-3 h-3 ml-auto" />
            </div>
            <div className="flex gap-2 mt-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug line-clamp-1" style={{ color: '#111827' }}>{t}</p>
                <p className="text-[13px] leading-snug mt-0.5 line-clamp-6 whitespace-pre-line" style={{ color: '#374151' }}>{b}</p>
              </div>
            </div>
            {img && (
              <img
                src={img}
                alt=""
                onError={() => setBroken(img)}
                className="mt-2 w-full rounded-xl object-cover"
                style={{ aspectRatio: '2 / 1' }}
              />
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-3 flex gap-2.5" style={{ background: 'rgba(245,245,245,0.82)', backdropFilter: 'blur(8px)' }}>
            <img src="/logo.jpeg" alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-[13px] font-semibold leading-snug line-clamp-1 flex-1" style={{ color: '#111827' }}>{t}</p>
                <span className="text-[11px] flex-shrink-0" style={{ color: '#6b7280' }}>now</span>
              </div>
              <p className="text-[13px] leading-snug line-clamp-4 whitespace-pre-line" style={{ color: '#1f2937' }}>{b}</p>
            </div>
            {img && (
              <img src={img} alt="" onError={() => setBroken(img)} className="w-9 h-9 rounded-md object-cover flex-shrink-0 self-center" />
            )}
          </div>
        )}
      </div>

      {imageUrl && broken === imageUrl && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-danger)' }}>
          That image didn't load. Check the link opens a picture.
        </p>
      )}
      {caption && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>{caption}</p>
      )}
    </div>
  );
}
