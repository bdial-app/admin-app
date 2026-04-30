import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  accent?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, trend, accent = 'var(--color-primary)', onClick }: StatCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
        ? TrendingDown
        : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'var(--color-success)'
      : trend.value < 0
        ? 'var(--color-danger)'
        : 'var(--text-muted)'
    : undefined;

  return (
    <div
      className={`rounded-xl p-5 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
      style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {title}
          </p>
          <p className="text-2xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && TrendIcon && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
              <span className="text-xs font-medium" style={{ color: trendColor }}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="p-2.5 rounded-xl flex-shrink-0"
            style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          >
            <div style={{ color: accent }}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
