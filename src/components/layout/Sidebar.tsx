import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store,
  FileCheck, Star, FolderTree, LogOut,
  X, ChevronLeft, Shield, AlertTriangle,
  Package, Image, Megaphone, Gift, Award,
  MessageSquare, BarChart3, ShieldAlert,
  UserCog, FileText, Settings, Bell, Bug,
  UserPlus, PlusCircle, Camera, ToggleLeft,
  ClipboardList, Ticket, CreditCard, Crown, DollarSign, Coins
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { ROUTES } from '../../utils/constants';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { useState } from 'react';

interface SidebarProps {
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

const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="h-full flex flex-col transition-all duration-200"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        width: collapsed ? '72px' : '100%',
      }}
    >
      {/* Brand Header */}
      <div
        className="h-16 flex items-center justify-between px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                Tijarah
              </h1>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                Admin Panel
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Shield className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-md transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Collapse button (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 rounded-md transition-colors hover:bg-primary-light"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft
            className="h-4 w-4 transition-transform duration-200"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      </div>

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
                    className={`group relative flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    style={{
                      color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--sidebar-active)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                    title={collapsed ? item.name : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                      />
                    )}
                    <Icon
                      className="flex-shrink-0 w-[18px] h-[18px] transition-colors"
                      style={{
                        color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                      }}
                    />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 pulse-dot" />
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

      {/* Bottom — Logout */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid var(--border-light)' }}
      >
        <button
          onClick={() => {
            dispatch(logout());
            navigate(ROUTES.LOGIN);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          style={{ color: 'var(--color-danger)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
