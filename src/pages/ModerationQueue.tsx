import { useNavigate } from 'react-router-dom';
import { ClipboardList, Store, Megaphone, Gift, AlertTriangle, FileCheck, ChevronRight, Download } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import { useModerationQueue } from '../hooks/useModeration';
import { useExportCsv } from '../hooks/useExport';
import { ROUTES } from '../utils/constants';
import type { ModerationQueueItem, ExportEntity } from '../types';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const TYPE_CONFIG: Record<string, { icon: typeof Store; color: string; bg: string; route: string }> = {
  provider: { icon: Store, color: 'var(--color-primary)', bg: 'var(--color-primary-light)', route: ROUTES.PROVIDERS },
  sponsorship: { icon: Megaphone, color: 'var(--color-info)', bg: 'var(--color-info-light, rgba(59,130,246,0.1))', route: ROUTES.SPONSORSHIPS },
  offer: { icon: Gift, color: 'var(--color-warning)', bg: 'var(--color-warning-light)', route: ROUTES.OFFERS },
  report: { icon: AlertTriangle, color: 'var(--color-danger)', bg: 'var(--color-danger-light)', route: ROUTES.REPORTS },
  verification: { icon: FileCheck, color: 'var(--color-success)', bg: 'var(--color-success-light)', route: ROUTES.REGISTRATIONS },
};

const EXPORT_ENTITIES: { entity: ExportEntity; label: string }[] = [
  { entity: 'users', label: 'Users' },
  { entity: 'providers', label: 'Providers' },
  { entity: 'products', label: 'Products' },
  { entity: 'reviews', label: 'Reviews' },
  { entity: 'reports', label: 'Reports' },
];

export default function ModerationQueue() {
  const navigate = useNavigate();
  const { data, isLoading } = useModerationQueue();
  const { exportCsv, isExporting } = useExportCsv();

  const items = data?.items ?? [];
  const grouped = items.reduce<Record<string, ModerationQueueItem[]>>((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Moderation Queue"
        description="Items pending admin review across all modules"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Moderation Queue' }]}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const count = grouped[type]?.length ?? 0;
          return (
            <StatCard
              key={type}
              title={type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              value={count}
              icon={<Icon className="w-5 h-5" />}
              accent={config.color}
            />
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Queue is empty"
          description="No items need moderation right now"
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, typeItems]) => {
            const config = TYPE_CONFIG[type] || TYPE_CONFIG.provider;
            const Icon = config.icon;
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {type}s ({typeItems.length})
                  </h3>
                  <button
                    onClick={() => navigate(config.route)}
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {typeItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(config.route)}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                      style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-0)'; }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: config.bg, color: config.color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                        {item.subtitle && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.subtitle}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                          {item.status}
                        </span>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {typeItems.length > 5 && (
                    <p className="text-xs text-center py-1" style={{ color: 'var(--text-muted)' }}>
                      +{typeItems.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export Section */}
      <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--border-default)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Data Export
        </h3>
        <div className="flex flex-wrap gap-3">
          {EXPORT_ENTITIES.map(({ entity, label }) => (
            <button
              key={entity}
              onClick={() => exportCsv(entity)}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-0)'; }}
            >
              <Download className="w-4 h-4" />
              Export {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
