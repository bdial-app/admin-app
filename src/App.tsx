import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import { ROUTES } from './utils/constants';

// Layout
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Providers from './pages/Providers';
import Registrations from './pages/Registrations';
import Reviews from './pages/Reviews';
import Categories from './pages/Categories';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        
        <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.USERS} element={<Users />} />
          <Route path={ROUTES.PROVIDERS} element={<Providers />} />
          <Route path={ROUTES.REGISTRATIONS} element={<Registrations />} />
          <Route path={ROUTES.REVIEWS} element={<Reviews />} />
          <Route path={ROUTES.CATEGORIES} element={<Categories />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
