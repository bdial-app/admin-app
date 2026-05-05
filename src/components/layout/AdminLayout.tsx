import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { Menu, Moon, Sun, Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { useTheme } from '../../hooks/useTheme';
import { ROUTES } from '../../utils/constants';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--surface-1)' }}
    >
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: isCollapsed ? '72px' : '260px' }}
      >
        <Sidebar
          collapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header
          className="h-16 flex items-center px-4 lg:px-6 justify-between flex-shrink-0"
          style={{
            background: 'var(--surface-0)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {/* Left: Mobile menu + Search */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              style={{ color: 'var(--text-secondary)' }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden sm:block text-sm font-bold uppercase tracking-widest ml-2" style={{ color: 'var(--text-muted)' }}>
              Admin Panel
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition-colors focus-ring"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-[18px] h-[18px]" />
              ) : (
                <Sun className="w-[18px] h-[18px]" />
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate(ROUTES.NOTIFICATIONS)}
              className="relative p-2 rounded-lg transition-colors focus-ring"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Divider */}
            <div
              className="hidden sm:block w-px h-6 mx-1"
              style={{ background: 'var(--border-default)' }}
            />

            {/* User */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {user?.name || 'Admin'}
                </p>
                <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  {user?.role || 'Super Admin'}
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main
          className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6"
          style={{ background: 'var(--surface-1)' }}
        >
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
