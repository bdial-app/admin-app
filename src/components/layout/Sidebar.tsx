import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store,
  FileCheck, Star, FolderTree, LogOut,
  ChevronLeft, AlertTriangle,
  Package, Image, Megaphone, Gift, Award,
  MessageSquare, BarChart3, ShieldAlert,
  UserCog, FileText, Settings, Bell, Bug,
  UserPlus, PlusCircle, Camera, ToggleLeft,
  ClipboardList, Ticket, CreditCard, Crown, DollarSign, Coins, Heart
} from 'lucide-react';
import logo from '../../assets/logo.jpeg';
import { useDispatch } from 'react-redux';
import { ROUTES } from '../../utils/constants';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const sections = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Users', path: ROUTES.USERS, icon: Users },
      { name: 'Create User', path: ROUTES.CREATE_USER, icon: UserPlus },
      { name: 'Providers', path: ROUTES.PROVIDERS, icon: Store, badge: true },
      { name: 'Create Provider', path: ROUTES.CREATE_PROVIDER, icon: PlusCircle },
      { name: 'Categories', path: ROUTES.CATEGORIES, icon: FolderTree },
      { name: 'Products', path: ROUTES.PRODUCTS, icon: Package },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { name: 'Queue', path: ROUTES.MODERATION_QUEUE, icon: ClipboardList, badge: true },
      { name: 'Verifications', path: ROUTES.REGISTRATIONS, icon: FileCheck, badge: true },
      { name: 'Reviews', path: ROUTES.REVIEWS, icon: Star },
      { name: 'Reports', path: ROUTES.REPORTS, icon: AlertTriangle, badge: true },
      { name: 'Warnings', path: ROUTES.WARNINGS, icon: ShieldAlert },
      { name: 'Chat', path: ROUTES.CHAT_MODERATION, icon: MessageSquare },
      { name: 'Photos', path: ROUTES.PHOTO_MODERATION, icon: Camera },
      { name: 'Bug Reports', path: ROUTES.BUG_REPORTS, icon: Bug },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Banners', path: ROUTES.BANNERS, icon: Image },
      { name: 'Sponsorships', path: ROUTES.SPONSORSHIPS, icon: Megaphone },
      { name: 'Offers', path: ROUTES.OFFERS, icon: Gift },
      { name: 'Badges', path: ROUTES.BADGES, icon: Award },
      { name: 'Notifications', path: ROUTES.NOTIFICATIONS, icon: Bell },
    ],
  },
  {
    label: 'Monetization',
    items: [
      { name: 'Payments', path: ROUTES.PAYMENTS, icon: CreditCard },
      { name: 'Subscriptions', path: ROUTES.SUBSCRIPTIONS, icon: Crown },
      { name: 'Vouchers', path: ROUTES.VOUCHERS, icon: Ticket },
      { name: 'Revenue', path: ROUTES.REVENUE, icon: DollarSign },
      { name: 'Pricing Config', path: ROUTES.MONETIZATION_SETTINGS, icon: Coins },
    ],
  },
  {
    label: 'Women-Led',
    items: [
      { name: 'Women-Led', path: ROUTES.WOMEN_LED, icon: Heart },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Admin Users', path: ROUTES.ADMIN_USERS, icon: UserCog },
      { name: 'Feature Flags', path: ROUTES.FEATURE_FLAGS, icon: ToggleLeft },
      { name: 'Audit Log', path: ROUTES.AUDIT_LOG, icon: FileText },
      { name: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
    ],
  },
];

const Sidebar = ({ collapsed, onToggle, onClose }: SidebarProps) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  return (
    <div
      className="h-full flex flex-col transition-all duration-300"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        width: '100%',
      }}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center flex-shrink-0 px-4 transition-all duration-300 ${collapsed ? 'justify-center' : 'justify-between'}`}
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10">
              <img src={logo} alt="Tijarah Logo" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                Tijarah
              </h1>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-lg border border-white/10 transition-all hover:scale-110 duration-300 bg-primary">
            <img src={logo} alt="Tijarah Logo" className="w-full h-full object-cover opacity-90 hover:opacity-100" />
          </div>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg transition-all duration-200 hover:bg-surface-2 group"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Toggle Button for Collapsed State - Floating or Centered? Let's use a subtle bar */}
      {collapsed && (
        <div className="flex justify-center py-1.5">
          <button
            onClick={onToggle}
            className="p-1 rounded-md transition-all duration-200 hover:bg-surface-2 opacity-50 hover:opacity-100"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5">
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p
                className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.label}
              </p>
            )}
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={`group relative flex items-center rounded-xl transition-all duration-300 ${
                      collapsed ? 'justify-center w-12 h-12 mx-auto mb-1.5' : 'gap-3 px-3 py-2.5 mb-1'
                    }`}
                    style={{
                      color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--sidebar-active)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                      if (collapsed) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05) translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                      if (collapsed) (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateX(0)';
                    }}
                    title={collapsed ? item.name : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span
                        className={`absolute rounded-full bg-primary transition-all duration-300 shadow-[0_0_8px_rgba(79,70,229,0.4)] ${
                          collapsed ? 'left-[-12px] w-1.5 h-7 top-1/2 -translate-y-1/2' : 'left-0 w-1 h-6 top-1/2 -translate-y-1/2'
                        }`}
                      />
                    )}
                    <Icon
                      className={`flex-shrink-0 transition-all duration-300 ${
                        collapsed ? 'w-5.5 h-5.5' : 'w-[18px] h-[18px]'
                      }`}
                      style={{
                        color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                    {!collapsed && (
                      <>
                        <span className="truncate font-medium text-[13.5px]">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 pulse-dot" />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div
        className={`flex-shrink-0 ${collapsed ? 'py-4 flex justify-center' : 'p-3'}`}
        style={{ borderTop: '1px solid var(--border-light)' }}
      >
        <button
          onClick={() => {
            dispatch(logout());
            navigate(ROUTES.LOGIN);
          }}
          className={`group flex items-center transition-all duration-300 ${
            collapsed ? 'w-12 h-12 justify-center rounded-xl' : 'w-full gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg'
          }`}
          style={{ color: 'var(--color-danger)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)';
            if (collapsed) (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            if (collapsed) (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
          }}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className={`flex-shrink-0 transition-transform group-hover:scale-110 ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
