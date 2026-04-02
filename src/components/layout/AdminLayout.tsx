import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-16 flex items-center px-4 justify-between lg:justify-end">
          <button 
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Admin User</span>
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
