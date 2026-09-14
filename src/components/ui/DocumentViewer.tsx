import { useState } from 'react';
import { FileText, ExternalLink, ZoomIn, RotateCw, AlertTriangle, Download } from 'lucide-react';

const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

interface DocumentViewerProps {
  url: string;
  label: string;
  /** Shown under the label, e.g. an Ijamat number */
  caption?: string;
}

/**
 * Inline preview of a verification document so a reviewer can actually read it
 * without leaving the panel. Images render directly with zoom and rotate; PDFs
 * embed; anything that fails to load falls back to an open-in-new-tab link.
 */
export function DocumentViewer({ url, label, caption }: DocumentViewerProps) {
  const [zoomed, setZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);
  const pdf = isPdf(url);

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{label}</p>
            {caption && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{caption}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!pdf && !failed && (
              <>
                <button onClick={() => setRotation((r) => (r + 90) % 360)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }} title="Rotate">
                  <RotateCw className="w-4 h-4" />
                </button>
                <button onClick={() => setZoomed(true)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }} title="Enlarge">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }} title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </a>
            <a href={url} download target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }} title="Download">
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {failed ? (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--color-warning)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Preview unavailable</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              Open the file directly
            </a>
          </div>
        ) : pdf ? (
          <object data={url} type="application/pdf" className="w-full" style={{ height: 420 }}>
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                Open PDF
              </a>
            </div>
          </object>
        ) : (
          <button onClick={() => setZoomed(true)} className="block w-full cursor-zoom-in" style={{ background: 'var(--surface-2)' }}>
            <img
              src={url}
              alt={label}
              onError={() => setFailed(true)}
              className="w-full object-contain transition-transform"
              style={{ maxHeight: 360, transform: `rotate(${rotation}deg)` }}
            />
          </button>
        )}
      </div>

      {/* Full-screen lightbox */}
      {zoomed && !pdf && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setZoomed(false)}
        >
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `rotate(${rotation}deg)` }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setRotation((r) => (r + 90) % 360); }}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button onClick={() => setZoomed(false)} className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
