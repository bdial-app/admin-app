import { TONES, toneColor, type AttentionTone } from './attention-items';

/** A count pill, or — with `dot` — just a coloured dot (collapsed sidebar). */
export function CountBadge({ count, tone, dot, className = '' }: { count: number; tone: AttentionTone; dot?: boolean; className?: string }) {
  if (count <= 0) return null;
  if (dot) {
    return (
      <span
        className={`w-2 h-2 rounded-full ring-2 ${tone === 'waiting' ? 'pulse-dot' : ''} ${className}`}
        style={{ background: toneColor(tone), ['--tw-ring-color' as string]: 'var(--sidebar-bg)' }}
      />
    );
  }
  return (
    <span
      className={`min-w-[20px] h-[18px] px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums flex-shrink-0 ${className}`}
      style={TONES[tone]}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
