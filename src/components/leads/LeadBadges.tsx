import { Flame } from 'lucide-react';
import { TIER_META } from './lead-meta';
import type { LeadTier } from '../../types';

export function TierBadge({ tier, score }: { tier: LeadTier; score?: number }) {
  const m = TIER_META[tier] ?? TIER_META.cold;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold w-fit" style={{ background: m.bg, color: m.color }}>
      {tier === 'hot' && <Flame className="w-3 h-3" />}
      {m.label}
      {score != null && <span className="font-semibold opacity-75 tabular-nums">· {score}</span>}
    </span>
  );
}

export function Avatar({ name, url, size = 32, square = false }: { name?: string | null; url?: string | null; size?: number; square?: boolean }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const radius = square ? 8 : 999;
  if (url) return <img src={url} alt="" className="object-cover shrink-0" style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <span className="flex items-center justify-center shrink-0 font-bold" style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.36, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
      {initials}
    </span>
  );
}
