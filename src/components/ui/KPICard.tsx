import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
  delay?: number;
}

const KPICard = ({ label, value, icon: Icon, trend, accentColor = '#4F46E5', delay = 0 }: KPICardProps) => {
  return (
    <div
      className="card group relative overflow-hidden p-5 cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accentColor }}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-bold tracking-tight animate-fade-in-up"
            style={{ color: 'var(--text-primary)', animationDelay: `${delay + 100}ms` }}
          >
            {value}
          </p>
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend.positive ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>

        <div
          className="flex-shrink-0 p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ background: `${accentColor}12` }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
