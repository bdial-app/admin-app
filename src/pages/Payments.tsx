import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { usePayments } from '../hooks/usePayments';
import type { Payment } from '../services/payments.service';

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
};

const TYPE_OPTIONS = ['', 'sponsorship', 'lead_unlock', 'subscription', 'badge', 'deal_unlock'];
const STATUS_OPTIONS = ['', 'pending', 'processing', 'succeeded', 'failed', 'refunded'];

export default function Payments() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = usePayments({
    page, limit: 20,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const columns: Column<Payment>[] = [
    { key: 'createdAt', header: 'Date', render: (p) => new Date(p.createdAt).toLocaleDateString() },
    { key: 'provider', header: 'Provider', render: (p) => p.provider?.brandName ?? p.providerId?.slice(0, 8) },
    { key: 'type', header: 'Type', render: (p) => <span className="capitalize">{p.type?.replace('_', ' ')}</span> },
    { key: 'amount', header: 'Amount', render: (p) => `₹${p.amount?.toLocaleString()}` },
    { key: 'discountAmount', header: 'Discount', render: (p) => p.discountAmount ? `-₹${p.discountAmount}` : '—' },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'stripeReceiptUrl', header: '', render: (p) => p.stripeReceiptUrl ? (
        <a href={p.stripeReceiptUrl} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-gray-100 inline-flex"><ExternalLink size={14} /></a>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="All payment transactions" />

      <div className="flex gap-3">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input px-3 py-1.5 text-sm rounded">
          <option value="">All Types</option>
          {TYPE_OPTIONS.filter(Boolean).map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input px-3 py-1.5 text-sm rounded">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading}
        rowKey={(p) => p.id} meta={data?.meta} onPageChange={setPage} />
    </div>
  );
}
