import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { ROUTES } from '../utils/constants';
import {
  LayoutList, Clock, ShieldCheck, AlertTriangle, Users,
  ArrowRight, TrendingUp, CheckCircle2, FileWarning
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import KPICard from '../components/ui/KPICard';

/* ── Mock data ─────────────────────────────────────────────────────────── */
const growthData = [
  { month: 'Jan', listings: 12, approved: 10 },
  { month: 'Feb', listings: 19, approved: 16 },
  { month: 'Mar', listings: 28, approved: 22 },
  { month: 'Apr', listings: 35, approved: 30 },
  { month: 'May', listings: 42, approved: 38 },
  { month: 'Jun', listings: 55, approved: 48 },
  { month: 'Jul', listings: 67, approved: 60 },
];

const approvalData = [
  { name: 'Approved', value: 68, color: '#10B981' },
  { name: 'Pending', value: 23, color: '#F59E0B' },
  { name: 'Rejected', value: 9, color: '#EF4444' },
];

const recentActivity = [
  { action: 'Listing approved', detail: 'Fatema Tailors — Rander', time: '2 min ago', type: 'approve' },
  { action: 'New verification', detail: 'Sakina Electricals submitted Aadhaar', time: '15 min ago', type: 'verify' },
  { action: 'Review flagged', detail: '"Unprofessional behavior" on Burhani Tuitions', time: '1 hr ago', type: 'flag' },
  { action: 'Listing rejected', detail: 'Quick Fix Plumbing — missing documents', time: '2 hrs ago', type: 'reject' },
  { action: 'User suspended', detail: 'Abbas K. — multiple violations', time: '5 hrs ago', type: 'reject' },
];

const activityIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  approve: { icon: CheckCircle2, color: '#10B981' },
  verify:  { icon: ShieldCheck,  color: '#4F46E5' },
  flag:    { icon: FileWarning,  color: '#F59E0B' },
  reject:  { icon: AlertTriangle,color: '#EF4444' },
};

/* ── Custom chart tooltip ──────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Dashboard Page ───────────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Welcome back, {user?.name?.split(' ')[0] || 'Admin'} 👋
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {today} — Here's your platform overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          label="Total Listings"
          value="142"
          icon={LayoutList}
          trend={{ value: '12% this month', positive: true }}
          accentColor="#4F46E5"
          delay={0}
        />
        <KPICard
          label="Pending Approvals"
          value="23"
          icon={Clock}
          trend={{ value: '3 new today', positive: false }}
          accentColor="#F59E0B"
          delay={50}
        />
        <KPICard
          label="Verified Listings"
          value="98"
          icon={ShieldCheck}
          trend={{ value: '69% approval rate', positive: true }}
          accentColor="#10B981"
          delay={100}
        />
        <KPICard
          label="Flagged Reviews"
          value="7"
          icon={AlertTriangle}
          trend={{ value: '2 critical', positive: false }}
          accentColor="#EF4444"
          delay={150}
        />
        <KPICard
          label="Active Users"
          value="4,521"
          icon={Users}
          trend={{ value: '8% growth', positive: true }}
          accentColor="#8B5CF6"
          delay={200}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Listings Growth Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Listings Growth
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                New vs Approved listings over 7 months
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--chart-1)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Total</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--chart-2)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Approved</span>
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="listings"
                  name="Total"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#gradientPrimary)"
                  dot={{ r: 3, fill: 'var(--chart-1)', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface-0)' }}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  name="Approved"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#gradientSuccess)"
                  dot={{ r: 3, fill: 'var(--chart-2)', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface-0)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Rate Donut */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Approval Rate
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Overall listing status distribution
          </p>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={approvalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {approvalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--surface-0)',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {approvalData.map((item) => (
              <span key={item.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                {item.name} ({item.value}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Quick Actions
          </h3>
          <div className="space-y-2.5">
            <button
              onClick={() => navigate(ROUTES.PROVIDERS)}
              className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-150 group"
              style={{
                background: 'var(--color-warning-light)',
                color: 'var(--color-warning-dark)',
              }}
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                Review Pending Listings
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
            <button
              onClick={() => navigate(ROUTES.REVIEWS)}
              className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-150 group"
              style={{
                background: 'var(--color-danger-light)',
                color: 'var(--color-danger-dark)',
              }}
            >
              <span className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4" />
                View Flagged Reviews
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
            <button
              onClick={() => navigate(ROUTES.REGISTRATIONS)}
              className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-150 group"
              style={{
                background: 'var(--color-info-light)',
                color: 'var(--color-info-dark)',
              }}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" />
                Verify Documents
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h3>
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              <TrendingUp className="w-3 h-3" />
              Live
            </span>
          </div>
          <div className="space-y-0">
            {recentActivity.map((item, index) => {
              const { icon: ActivityIcon, color } = activityIcons[item.type] || activityIcons.approve;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 py-3 animate-fade-in-up"
                  style={{
                    borderBottom: index < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none',
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: `${color}15` }}
                  >
                    <ActivityIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.action}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.detail}
                    </p>
                  </div>
                  <span className="text-[11px] flex-shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
