import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import type { RootState } from './store/store';
import { ROUTES } from './utils/constants';

// Layout
import AdminLayout from './components/layout/AdminLayout';

// Eager-loaded auth pages
import Login from './pages/Login';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Providers = lazy(() => import('./pages/Providers'));
const ProviderView = lazy(() => import('./pages/ProviderView'));
const Verifications = lazy(() => import('./pages/Verifications'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Categories = lazy(() => import('./pages/Categories'));
const Products = lazy(() => import('./pages/Products'));
const Reports = lazy(() => import('./pages/Reports'));
const BugReports = lazy(() => import('./pages/BugReports'));
const Warnings = lazy(() => import('./pages/Warnings'));
const ChatModeration = lazy(() => import('./pages/ChatModeration'));
const Banners = lazy(() => import('./pages/Banners'));
const Sponsorships = lazy(() => import('./pages/Sponsorships'));
const Offers = lazy(() => import('./pages/Offers'));
const Badges = lazy(() => import('./pages/Badges'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const SystemSettings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CreateUser = lazy(() => import('./pages/CreateUser'));
const CreateProviderFlow = lazy(() => import('./pages/CreateProviderFlow'));
const PhotoModeration = lazy(() => import('./pages/PhotoModeration'));
const FeatureFlags = lazy(() => import('./pages/FeatureFlags'));
const ModerationQueuePage = lazy(() => import('./pages/ModerationQueue'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const PaymentsPage = lazy(() => import('./pages/Payments'));
const SubscriptionsPage = lazy(() => import('./pages/Subscriptions'));
const RevenuePage = lazy(() => import('./pages/Revenue'));
const MonetizationSettingsPage = lazy(() => import('./pages/MonetizationSettings'));
const WomenLedPage = lazy(() => import('./pages/WomenLed'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />

          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            {/* Overview */}
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />

            {/* Content */}
            <Route path={ROUTES.USERS} element={<Users />} />
            <Route path={ROUTES.PROVIDER_VIEW} element={<ProviderView />} />
            <Route path={ROUTES.PROVIDERS} element={<Providers />} />
            <Route path={ROUTES.CATEGORIES} element={<Categories />} />
            <Route path={ROUTES.PRODUCTS} element={<Products />} />
            <Route path={ROUTES.CREATE_USER} element={<CreateUser />} />
            <Route path={ROUTES.CREATE_PROVIDER} element={<CreateProviderFlow />} />

            {/* Moderation */}
            <Route path={ROUTES.REGISTRATIONS} element={<Verifications />} />
            <Route path={ROUTES.REVIEWS} element={<Reviews />} />
            <Route path={ROUTES.REPORTS} element={<Reports />} />
            <Route path={ROUTES.BUG_REPORTS} element={<BugReports />} />
            <Route path={ROUTES.WARNINGS} element={<Warnings />} />
            <Route path={ROUTES.CHAT_MODERATION} element={<ChatModeration />} />
            <Route path={ROUTES.PHOTO_MODERATION} element={<PhotoModeration />} />
            <Route path={ROUTES.MODERATION_QUEUE} element={<ModerationQueuePage />} />

            {/* Marketing */}
            <Route path={ROUTES.BANNERS} element={<Banners />} />
            <Route path={ROUTES.SPONSORSHIPS} element={<Sponsorships />} />
            <Route path={ROUTES.OFFERS} element={<Offers />} />
            <Route path={ROUTES.BADGES} element={<Badges />} />
            <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />

            {/* Monetization */}
            <Route path={ROUTES.VOUCHERS} element={<Vouchers />} />
            <Route path={ROUTES.PAYMENTS} element={<PaymentsPage />} />
            <Route path={ROUTES.SUBSCRIPTIONS} element={<SubscriptionsPage />} />
            <Route path={ROUTES.REVENUE} element={<RevenuePage />} />
            <Route path={ROUTES.MONETIZATION_SETTINGS} element={<MonetizationSettingsPage />} />

            {/* Women-Led */}
            <Route path={ROUTES.WOMEN_LED} element={<WomenLedPage />} />

            {/* Insights */}
            <Route path={ROUTES.ANALYTICS} element={<Analytics />} />

            {/* System */}
            <Route path={ROUTES.ADMIN_USERS} element={<AdminUsers />} />
            <Route path={ROUTES.AUDIT_LOG} element={<AuditLog />} />
            <Route path={ROUTES.SETTINGS} element={<SystemSettings />} />
            <Route path={ROUTES.FEATURE_FLAGS} element={<FeatureFlags />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
