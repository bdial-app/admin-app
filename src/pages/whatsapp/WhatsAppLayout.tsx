import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Megaphone, FileText, Users, Inbox, Settings, AlertTriangle, FlaskConical } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useWaSettings, useWaUnreadCount } from '../../hooks/useWhatsApp';
import { ROUTES } from '../../utils/constants';
import { WA_ROUTES } from '../../components/whatsapp/wa-utils';

const TABS = [
  { label: 'Overview', to: WA_ROUTES.root, end: true, icon: LayoutDashboard },
  { label: 'Campaigns', to: WA_ROUTES.campaigns, end: false, icon: Megaphone },
  { label: 'Templates', to: WA_ROUTES.templates, end: false, icon: FileText },
  { label: 'Audience', to: WA_ROUTES.audience, end: false, icon: Users },
  { label: 'Inbox', to: WA_ROUTES.inbox, end: false, icon: Inbox },
  { label: 'Settings', to: WA_ROUTES.settings, end: false, icon: Settings },
];

export default function WhatsAppLayout() {
  const { data: unread } = useWaUnreadCount();
  const { data: settings } = useWaSettings();

  const badge = settings && !settings.configured ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
      <AlertTriangle className="w-3 h-3" /> Not configured
    </span>
  ) : settings?.isTestNumber ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }} title="Meta test numbers can only message up to 5 verified recipients">
      <FlaskConical className="w-3 h-3" /> Test number
    </span>
  ) : null;

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Template campaigns to business owners, a shared inbox for replies, and Cloud API settings."
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'WhatsApp' }]}
        badge={badge}
      />

      <nav
        className="flex gap-1 mb-6 p-1 rounded-lg w-fit max-w-full overflow-x-auto"
        style={{ background: 'var(--surface-1)', scrollbarWidth: 'none' }}
        aria-label="WhatsApp sections"
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
            style={({ isActive }) => ({
              background: isActive ? 'var(--surface-0)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
            })}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.label === 'Inbox' && !!unread && unread > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white tabular-nums" style={{ background: '#25D366' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
