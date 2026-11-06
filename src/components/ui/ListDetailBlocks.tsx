import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, X, type LucideIcon } from 'lucide-react';
import { Avatar } from '../leads/LeadBadges';

// Building blocks of the admin's list + detail pages (Chats, Reviews).

/** Who someone is, with links to everything else about them. */
export function Party({ role, name, photoUrl, lines, actions }: {
  role: string;
  name: string;
  photoUrl?: string | null;
  lines: string[];
  actions: { label: string; to?: string; href?: string; onClick?: () => void }[];
}) {
  const isBusiness = role === 'Business';
  return (
    <div className="flex items-start gap-2.5 p-2 rounded-lg min-w-0" style={{ background: 'var(--surface-1)' }}>
      <Avatar name={name} url={photoUrl} size={36} square={isBusiness} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isBusiness ? 'var(--color-primary)' : 'var(--color-success)' }}>{role}</p>
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
        {lines.length > 0 && <p className="text-[11px] truncate tabular-nums" style={{ color: 'var(--text-muted)' }}>{lines.join(' · ')}</p>}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
            {actions.map((a) => {
              const cls = 'inline-flex items-center gap-0.5 text-[11px] font-medium hover:underline';
              const style = { color: 'var(--color-primary)' };
              if (a.to) return <Link key={a.label} to={a.to} className={cls} style={style}>{a.label}<ArrowRight className="w-3 h-3" /></Link>;
              if (a.href) return <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className={cls} style={style}>{a.label}<ExternalLink className="w-3 h-3" /></a>;
              return <button key={a.label} onClick={a.onClick} className={cls} style={style}>{a.label}</button>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function Metric({ icon: Icon, color, label, value, sub, onClick }: { icon: LucideIcon; color: string; label: string; value?: number | string; sub?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-3.5 ${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}`}
      style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-1.5">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        <p className="text-[11px] font-semibold uppercase tracking-wide leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>{value == null ? '—' : typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

export function Pill({ icon: Icon, color, bg, children }: { icon: LucideIcon; color: string; bg: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: bg, color }}>
      <Icon className="w-3 h-3" />
      {children}
    </span>
  );
}

export function ScopeChip({ icon: Icon, label, to, onClear }: { icon: LucideIcon; label: string; to?: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      {to && <Link to={to} className="font-medium opacity-80 hover:underline">open</Link>}
      <button onClick={onClear} className="p-0.5 rounded-full hover:bg-[var(--surface-0)]" aria-label="Clear"><X className="w-3.5 h-3.5" /></button>
    </span>
  );
}
