import { Fragment, type ReactNode } from 'react';

/**
 * Preview of a legal document as the app shows it. Same Markdown subset as
 * the customer app's renderer (customer-app/app/components/legal/legal-markdown.tsx):
 * "## " / "### " headings, paragraphs, "- " / "1. " lists, "> " callouts,
 * **bold** and [links](/legal?doc=privacy). Keep the two in step.
 */

type Block =
  | { kind: 'h2' | 'h3' | 'p' | 'callout'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] };

function parseLegalMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;
  let callout: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
    if (list) blocks.push(list);
    if (callout.length) blocks.push({ kind: 'callout', text: callout.join(' ') });
    para = [];
    list = null;
    callout = [];
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: heading[1].length >= 3 ? 'h3' : 'h2', text: heading[2] });
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (para.length || callout.length || (list && list.kind !== kind)) flush();
      list = list ?? { kind, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (line.startsWith('>')) {
      if (para.length || list) flush();
      callout.push(line.replace(/^>\s?/, ''));
    } else if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line}`;
    } else {
      if (list || callout.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE).filter(Boolean).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          return (
            <span key={i} title={link[2]} className="underline underline-offset-2" style={{ color: 'var(--color-primary)' }}>
              {link[1]}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export default function LegalMarkdown({ content }: { content: string }) {
  const nodes: ReactNode[] = parseLegalMarkdown(content).map((b, i) => {
    switch (b.kind) {
      case 'h2':
        return <h3 key={i} className="text-[15px] font-bold pt-3" style={{ color: 'var(--text-primary)' }}><Inline text={b.text} /></h3>;
      case 'h3':
        return <h4 key={i} className="text-sm font-semibold pt-1" style={{ color: 'var(--text-primary)' }}><Inline text={b.text} /></h4>;
      case 'callout':
        return (
          <div key={i} className="rounded-lg border px-4 py-3" style={{ borderColor: '#fcd34d', background: 'rgba(251,191,36,0.10)' }}>
            <Inline text={b.text} />
          </div>
        );
      case 'ul':
      case 'ol': {
        const List = b.kind;
        return (
          <List key={i} className={`${b.kind === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1`}>
            {b.items.map((item, j) => <li key={j}><Inline text={item} /></li>)}
          </List>
        );
      }
      default:
        return <p key={i}><Inline text={b.text} /></p>;
    }
  });
  return <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary, var(--text-muted))' }}>{nodes}</div>;
}
