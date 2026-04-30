import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { useRevenueStats } from '../hooks/usePayments';
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  sponsorship: 'Sponsorships',
  lead_unlock: 'Lead Unlocks',
  subscription: 'Subscriptions',
  badge: 'Badges',
  deal_unlock: 'Deal Unlocks',
};

const TYPE_COLORS: Record<string, string> = {
  sponsorship: '#6366f1',
  lead_unlock: '#10b981',
  subscription: '#f59e0b',
  badge: '#ef4444',
  deal_unlock: '#8b5cf6',
};

export default function Revenue() {
  const { data: stats, isLoading } = useRevenueStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revenue" description="Revenue analytics and insights" />
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      </div>
    );
  }

  const totalRevenue = Number(stats?.totalRevenue ?? 0);
  const totalTransactions = Number(stats?.totalTransactions ?? 0);
  const mrr = Number(stats?.mrr ?? 0);
  const activeSubs = Number(stats?.activeSubscriptions ?? 0);
  const breakdown = stats?.breakdown ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" description="Revenue analytics and insights" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign size={20} />} />
        <StatCard title="MRR" value={`₹${mrr.toLocaleString()}`} icon={<TrendingUp size={20} />} accent="var(--color-success)" />
        <StatCard title="Transactions" value={totalTransactions} icon={<CreditCard size={20} />} />
        <StatCard title="Active Subscriptions" value={activeSubs} icon={<Users size={20} />} accent="var(--color-primary)" />
      </div>

      {/* Revenue Breakdown by Type */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Revenue by Type</h3>
        <div className="space-y-3">
          {breakdown.map((item) => {
            const amount = Number(item.totalRevenue);
            const count = Number(item.count);
            const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
            return (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {TYPE_LABELS[item.type] ?? item.type}
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>({count} txns)</span>
                  </span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>₹{amount.toLocaleString()} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: TYPE_COLORS[item.type] ?? 'var(--color-primary)' }} />
                </div>
              </div>
            );
          })}
          {breakdown.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No revenue data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
