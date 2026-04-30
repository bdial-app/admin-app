import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// ── Breadcrumb ───────────────────────────────────────────
interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3 h-3" />}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {description && (
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
