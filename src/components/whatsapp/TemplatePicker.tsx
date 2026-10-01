import { useMemo, useState } from 'react';
import { Search, Check, FileText } from 'lucide-react';
import type { WaRates, WaTemplate, WaTemplateCategory } from '../../types';
import { CATEGORY_LABEL, formatInr, getBody, rateFor } from './wa-utils';
import { TemplateStatusBadge } from './TemplateStatusBadge';
import { SkeletonRows } from './Skeleton';
import EmptyState from '../ui/EmptyState';

interface Props {
  templates: WaTemplate[];
  isLoading?: boolean;
  value: string | null;
  onChange: (t: WaTemplate) => void;
  onHover?: (t: WaTemplate | null) => void;
  rates?: WaRates | null;
  /** Default true: only approved templates can be sent. */
  approvedOnly?: boolean;
  emptyAction?: { label: string; onClick: () => void };
  compact?: boolean;
}

const ORDER: WaTemplateCategory[] = ['utility', 'marketing', 'authentication'];

export function TemplatePicker({
  templates,
  isLoading,
  value,
  onChange,
  onHover,
  rates,
  approvedOnly = true,
  emptyAction,
  compact = false,
}: Props) {
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = templates.filter((t) => (!approvedOnly || t.status === 'approved') &&
      (!s || t.name.includes(s) || (getBody(t.components)?.text ?? '').toLowerCase().includes(s) || (t.description ?? '').toLowerCase().includes(s)));
    return ORDER.map((cat) => ({ cat, items: list.filter((t) => t.category === cat) })).filter((g) => g.items.length);
  }, [templates, q, approvedOnly]);

  if (isLoading) return <SkeletonRows rows={4} height="h-20" />;

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={FileText}
          title={approvedOnly ? 'No approved templates' : 'No templates'}
          description={approvedOnly ? 'Only templates approved by Meta can be sent. Submit one for review, or sync from Meta if you approved it there.' : 'Create a template first.'}
          action={emptyAction}
        />
      ) : (
        groups.map((g) => (
          <div key={g.cat}>
            <div className="flex items-center gap-2 mb-1.5 px-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {CATEGORY_LABEL[g.cat]}
              </p>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {formatInr(rateFor(g.cat, rates), 4)} / delivered msg
              </span>
            </div>
            <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {g.items.map((t) => {
                const selected = t.id === value;
                const body = getBody(t.components)?.text ?? '';
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t)}
                    onMouseEnter={() => onHover?.(t)}
                    onMouseLeave={() => onHover?.(null)}
                    className="text-left rounded-xl p-3 transition-all"
                    style={{
                      background: selected ? 'var(--color-primary-light)' : 'var(--surface-0)',
                      border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--border-default)'}`,
                      boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-mono truncate flex-1" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                      <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{t.language}</span>
                      {!approvedOnly && <TemplateStatusBadge status={t.status} reason={t.rejectedReason} />}
                      {selected && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary)' }}>
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                    )}
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{body}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TemplatePicker;
