import { useState } from 'react';
import { Search, Trash2, AlertTriangle, Star, Check, X } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const MOCK_REVIEWS = [
  { id: '1', provider: 'Fatema Tailors', user: 'Sakina M.', rating: 5, date: '2026-03-30', comment: 'Excellent stitching, the fits are perfect!', flagged: false },
  { id: '2', provider: 'Burhani Tuitions', user: 'Abbas S.', rating: 1, date: '2026-03-29', comment: 'Unprofessional behavior. Did not show up.', flagged: true },
  { id: '3', provider: 'Zainab Mehandi Arts', user: 'Murtaza K.', rating: 4, date: '2026-03-28', comment: 'Beautiful designs for the wedding.', flagged: false },
  { id: '4', provider: 'Quick Fix Plumbing', user: 'Taher B.', rating: 2, date: '2026-03-27', comment: 'Very rude. Charged extra without telling.', flagged: true },
  { id: '5', provider: 'Saifee Catering', user: 'Maryam T.', rating: 5, date: '2026-03-26', comment: 'Amazing biryani and service. Highly recommended.', flagged: false },
];

const TABS = ['all', 'flagged'] as const;

const Reviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [activeTab, setActiveTab] = useState<string>('all');

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this review?')) {
      setReviews(reviews.filter(r => r.id !== id));
    }
  };

  const filtered = reviews
    .filter(r => activeTab === 'all' || r.flagged)
    .filter(r =>
      r.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className="w-3.5 h-3.5" style={{
          color: s <= rating ? '#F59E0B' : 'var(--surface-3)',
          fill: s <= rating ? '#F59E0B' : 'none',
        }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Reviews & Moderation</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {reviews.filter(r => r.flagged).length} flagged review{reviews.filter(r => r.flagged).length !== 1 ? 's' : ''} need attention
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all"
              style={{
                background: activeTab === tab ? 'var(--surface-0)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              }}>
              {tab === 'flagged' ? `Flagged (${reviews.filter(r => r.flagged).length})` : 'All Reviews'}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by provider or user…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No reviews found" description="No reviews match your current filter." />
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full">
            <thead><tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-default)' }}>
              {['Provider', 'Reviewer', 'Rating', 'Comment', 'Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(review => (
              <tr key={review.id} className="transition-colors"
                style={{
                  borderBottom: '1px solid var(--border-light)',
                  background: review.flagged ? 'var(--color-warning-light)' : 'var(--surface-0)',
                }}
                onMouseEnter={e => { if (!review.flagged) (e.currentTarget).style.background = 'var(--surface-1)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = review.flagged ? 'var(--color-warning-light)' : 'var(--surface-0)'; }}>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{review.provider}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{review.user}</span>
                </td>
                <td className="px-5 py-3.5">{renderStars(review.rating)}</td>
                <td className="px-5 py-3.5 max-w-[300px]">
                  <p className="text-sm italic truncate" style={{ color: 'var(--text-secondary)' }}>"{review.comment}"</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{review.date}</span>
                </td>
                <td className="px-5 py-3.5">
                  {review.flagged ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
                      <AlertTriangle className="w-3 h-3" />Flagged
                    </span>
                  ) : (
                    <StatusBadge status="active" showDot={false} />
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg transition-colors hover:bg-emerald-50" title="Keep"
                      style={{ color: 'var(--color-success)' }}><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(review.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50" title="Remove"
                      style={{ color: 'var(--color-danger)' }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
