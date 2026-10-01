import { Fragment, type ReactNode } from 'react';

/** `*bold*`, `_italic_`, `~strike~`, ```` ```mono``` ```` and `{{n}}` chips, WhatsApp-style. */
export function renderWaMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, li) => (
    <Fragment key={li}>
      {renderInline(line)}
      {li < lines.length - 1 && <br />}
    </Fragment>
  ));
}

const INLINE_RE = /(```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\{\{\s*\d+\s*\}\})/g;

function renderInline(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(line.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith('```')) {
      out.push(<code key={i++} className="font-mono text-[12px] px-1 rounded" style={{ background: 'rgba(0,0,0,0.06)' }}>{tok.slice(3, -3)}</code>);
    } else if (tok.startsWith('*')) {
      out.push(<strong key={i++} className="font-semibold">{tok.slice(1, -1)}</strong>);
    } else if (tok.startsWith('_')) {
      out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('~')) {
      out.push(<s key={i++}>{tok.slice(1, -1)}</s>);
    } else {
      out.push(
        <span
          key={i++}
          className="inline-block px-1 rounded text-[11px] font-mono align-baseline"
          style={{ background: 'rgba(37, 211, 102, 0.18)', color: 'var(--wa-text)', border: '1px dashed rgba(37, 211, 102, 0.6)' }}
        >
          {tok.replace(/\s/g, '')}
        </span>,
      );
    }
    last = idx + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

