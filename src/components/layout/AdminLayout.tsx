import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { Menu, Moon, Sun, Bell, Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { useTheme } from '../../hooks/useTheme';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const { theme, toggle } = useTheme();

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
        className={`fixed inset-y-0 left-0 z-30 bg-white transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '260px', minWidth: '72px' }}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
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

            {/* Desktop Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search anything…"
                  className="pl-9 pr-16 py-1.5 w-64 text-sm rounded-lg focus-ring transition-colors"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <kbd
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  ⌘K
                </kbd>
              </div>
            </div>
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
