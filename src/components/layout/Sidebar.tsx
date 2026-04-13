import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  X, LayoutDashboard, Users, UsersRound, 
  FileCheck, Star, FolderTree, LogOut
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { ROUTES } from '../../utils/constants';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';

interface SidebarProps {
  onClose: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { name: 'Categories', path: ROUTES.CATEGORIES, icon: FolderTree },
    { name: 'Verifications', path: ROUTES.REGISTRATIONS, icon: FileCheck },
    { name: 'Listings', path: ROUTES.PROVIDERS, icon: UsersRound },
    { name: 'Users', path: ROUTES.USERS, icon: Users },
    { name: 'Reviews', path: ROUTES.REVIEWS, icon: Star },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-16 flex items-center justify-between px-6 border-b">
        <h1 className="text-xl font-bold tracking-tight text-blue-600">Bohri Connect</h1>
        <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t">
        <button
          onClick={() => {
            dispatch(logout());
            navigate(ROUTES.LOGIN);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
