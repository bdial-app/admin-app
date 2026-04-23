import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, MapPin, Calendar, Tag, ImageIcon, FileText } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

interface Provider { id: string; name: string; mobileNumber: string; }
interface Category { id: string; name: string; }
interface ListingCategory { category: Category; }
interface Listing {
  id: string; businessName: string; description: string | null; status: string;
  city: string | null; area: string | null; provider: Provider;
  listingCategories: ListingCategory[]; submittedAt: string | null;
}

const Providers = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchPendingListings = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get('/admin/listings/pending');
      let d = res.data;
      while (d && !Array.isArray(d) && d.data) d = d.data;
      setListings(Array.isArray(d) ? d : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pending listings');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchPendingListings(); }, [fetchPendingListings]);

  const handleApprove = async (listing?: Listing) => {
    const t = listing || selectedListing;
    if (!t) return;
    try {
      setIsProcessing(true);
      await api.patch(`/admin/listings/${t.id}/approve`);
      await fetchPendingListings();
      setSelectedListing(null); setExpandedRow(null);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setIsProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedListing || !rejectionNote.trim()) { alert('Please provide a rejection reason'); return; }
    try {
      setIsProcessing(true);
      await api.patch(`/admin/listings/${selectedListing.id}/reject`, { note: rejectionNote });
      await fetchPendingListings();
      setSelectedListing(null); setRejectionNote('');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setIsProcessing(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filtered = listings.filter(l =>
    l.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.provider.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Listing Approvals</h2>
        {!isLoading && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {listings.length > 0 ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} awaiting review` : 'All caught up!'}
        </p>}
      </div>

      {/* Search */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by business, provider, or city…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl animate-fade-in"
          style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
              style={{ background: 'var(--color-success)' }}><CheckCircle2 className="w-3.5 h-3.5" />Approve All</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton w-5 h-5 rounded" /><div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-48 rounded" /><div className="skeleton h-3 w-32 rounded" /></div>
              <div className="skeleton h-6 w-16 rounded-full" /><div className="skeleton h-8 w-20 rounded-lg" />
            </div>
          ))}</div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up!" description="No pending listings to review right now." />
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full">
            <thead><tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-default)' }}>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={() => selectedIds.size === filtered.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(l => l.id)))}
                  className="w-4 h-4 rounded border-2 accent-primary cursor-pointer" style={{ borderColor: 'var(--border-strong)' }} />
              </th>
              {['Business', 'Category', 'Location', 'Submitted', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(listing => {
              const isExp = expandedRow === listing.id;
              const isSel = selectedIds.has(listing.id);
              return (
                <RowGroup key={listing.id} listing={listing} isExp={isExp} isSel={isSel}
                  onToggleExpand={() => setExpandedRow(isExp ? null : listing.id)}
                  onToggleSelect={() => toggleSelect(listing.id)}
                  onApprove={() => handleApprove(listing)}
                  onOpenReject={() => setSelectedListing(listing)}
                  isProcessing={isProcessing} />
              );
            })}</tbody>
          </table></div>
        )}
      </div>

      {/* Reject Modal */}
      <Dialog.Root open={!!selectedListing} onOpenChange={open => { if (!open) { setSelectedListing(null); setRejectionNote(''); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg animate-slide-in-up"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', padding: '24px' }}>
            <Dialog.Title className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reject Listing</Dialog.Title>
            <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>Rejecting "{selectedListing?.businessName}"</p>
            <textarea rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)}
              placeholder="Reason for rejection (required)…" className="w-full px-3 py-2.5 text-sm rounded-xl focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'none' }} />
            <div className="flex justify-end gap-2 mt-5">
              <Dialog.Close asChild><button className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>Cancel</button></Dialog.Close>
              <button onClick={handleReject} disabled={isProcessing || !rejectionNote.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 text-white"
                style={{ background: 'var(--color-danger)' }}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Reject
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

/* ── Extracted Row Component ── */
const RowGroup = ({ listing, isExp, isSel, onToggleExpand, onToggleSelect, onApprove, onOpenReject, isProcessing }: {
  listing: Listing; isExp: boolean; isSel: boolean; onToggleExpand: () => void;
  onToggleSelect: () => void; onApprove: () => void; onOpenReject: () => void; isProcessing: boolean;
}) => (
  <>
    <tr className="group transition-colors cursor-pointer"
      style={{ borderBottom: isExp ? 'none' : '1px solid var(--border-light)', background: isSel ? 'var(--color-primary-light)' : 'var(--surface-0)' }}
      onMouseEnter={e => { if (!isSel) (e.currentTarget).style.background = 'var(--surface-1)'; }}
      onMouseLeave={e => { if (!isSel) (e.currentTarget).style.background = 'var(--surface-0)'; }}
      onClick={onToggleExpand}>
      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={isSel} onChange={onToggleSelect} className="w-4 h-4 rounded border-2 accent-primary cursor-pointer" style={{ borderColor: 'var(--border-strong)' }} />
      </td>
      <td className="px-4 py-3.5"><div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{listing.businessName.charAt(0).toUpperCase()}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{listing.businessName}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>by {listing.provider.name}</p>
        </div>
      </div></td>
      <td className="px-4 py-3.5"><div className="flex flex-wrap gap-1">
        {listing.listingCategories.length > 0 ? listing.listingCategories.slice(0, 2).map(lc => (
          <span key={lc.category.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}><Tag className="w-3 h-3" />{lc.category.name}</span>
        )) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
      </div></td>
      <td className="px-4 py-3.5"><span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />{listing.city || '—'}</span></td>
      <td className="px-4 py-3.5"><span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Calendar className="w-3 h-3" />{listing.submittedAt ? new Date(listing.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}</span></td>
      <td className="px-4 py-3.5"><StatusBadge status="pending" /></td>
      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}><div className="flex items-center gap-1.5">
        <button onClick={onApprove} disabled={isProcessing} className="p-1.5 rounded-lg transition-colors hover:bg-emerald-50" title="Approve" style={{ color: 'var(--color-success)' }}><CheckCircle2 className="w-4 h-4" /></button>
        <button onClick={onOpenReject} className="p-1.5 rounded-lg transition-colors hover:bg-red-50" title="Reject" style={{ color: 'var(--color-danger)' }}><XCircle className="w-4 h-4" /></button>
        <button onClick={onToggleExpand} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
          {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
      </div></td>
    </tr>
    {isExp && <tr><td colSpan={7} style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-default)' }}>
      <div className="p-5 animate-fade-in"><div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          <div><h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Description</h4>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{listing.description || <em style={{ color: 'var(--text-muted)' }}>No description</em>}</p></div>
          <div className="grid grid-cols-2 gap-4">
            <div><h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Provider</h4>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{listing.provider.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{listing.provider.mobileNumber}</p></div>
            <div><h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Location</h4>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{listing.city || '—'}</p>
              {listing.area && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{listing.area}</p>}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center" style={{ background: 'var(--surface-0)', border: '1px dashed var(--border-strong)', minHeight: '80px' }}>
            <ImageIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /><span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Photo Gallery</span></div>
          <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center" style={{ background: 'var(--surface-0)', border: '1px dashed var(--border-strong)', minHeight: '60px' }}>
            <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /><span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Documents</span></div>
          <div className="flex gap-2">
            <button onClick={onApprove} disabled={isProcessing} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 text-white"
              style={{ background: 'var(--color-success)' }}><CheckCircle2 className="w-4 h-4" />Approve</button>
            <button onClick={onOpenReject} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}><XCircle className="w-4 h-4" />Reject</button>
          </div>
        </div>
      </div></div>
    </td></tr>}
  </>
);

export default Providers;
