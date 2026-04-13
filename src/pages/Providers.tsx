import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../services/api';

// ── Types matching the backend response ──────────────────────────────────────
interface Provider {
  id: string;
  name: string;
  mobileNumber: string;
}

interface Category {
  id: string;
  name: string;
}

interface ListingCategory {
  category: Category;
}

interface Listing {
  id: string;
  businessName: string;
  description: string | null;
  status: string;
  city: string | null;
  area: string | null;
  provider: Provider;
  listingCategories: ListingCategory[];
  submittedAt: string | null;
}

const Providers = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  
  // For rejection 
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPendingListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/admin/listings/pending');
      
      // Safely unwrap data no matter how deeply nested the backend puts it 
      // e.g. res.data.data or res.data.data.data
      let fetchedData = res.data;
      while (fetchedData && !Array.isArray(fetchedData) && fetchedData.data) {
        fetchedData = fetchedData.data;
      }
      
      setListings(Array.isArray(fetchedData) ? fetchedData : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pending listings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingListings();
  }, [fetchPendingListings]);

  const handleApprove = async () => {
    if (!selectedListing) return;
    try {
      setIsProcessing(true);
      await api.patch(`/admin/listings/${selectedListing.id}/approve`);
      await fetchPendingListings();
      setSelectedListing(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve listing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedListing) return;
    if (!rejectionNote.trim()) {
      alert('Please provide a rejection note');
      return;
    }
    try {
      setIsProcessing(true);
      await api.patch(`/admin/listings/${selectedListing.id}/reject`, {
        note: rejectionNote
      });
      await fetchPendingListings();
      setSelectedListing(null);
      setRejectionNote('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject listing');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredListings = listings.filter(l => 
    l.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending Listings</h2>
          {listings.length > 0 && !isLoading && (
            <p className="text-sm text-gray-500 mt-1">{listings.length} listings waiting for approval</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search business or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48 border-2 border-dashed border-gray-200 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-500">Loading pending listings...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex justify-center text-sm">{error}</div>
      ) : filteredListings.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-48 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <CheckCircle2 className="h-8 w-8 text-green-400 mb-2" />
          <span className="text-gray-600 font-medium">All caught up!</span>
          <span className="text-gray-400 text-sm mt-1">No pending listings to review right now.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <div key={listing.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={listing.businessName}>
                    {listing.businessName}
                  </h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex-shrink-0">
                    Pending
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 mb-3 line-clamp-2 min-h-[40px]">
                  {listing.description || <span className="italic">No description provided</span>}
                </p>
                
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-500 w-16 inline-block">Provider:</span>
                    <span className="font-medium text-gray-900 truncate">{listing.provider.name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500 w-16 inline-block">Location:</span>
                    <span className="font-medium text-gray-900 truncate">
                      {listing.city ? `${listing.city}${listing.area ? `, ${listing.area}` : ''}` : 'Not specified'}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500 w-16 inline-block">Category:</span>
                    <span className="font-medium inline-block truncate align-bottom">
                      {listing.listingCategories.map(lc => lc.category.name).join(', ') || 'None'}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                <Dialog.Root open={selectedListing?.id === listing.id} onOpenChange={(open) => {
                  if (open) setSelectedListing(listing);
                  else { setSelectedListing(null); setRejectionNote(''); }
                }}>
                  <Dialog.Trigger asChild>
                    <button className="w-full flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4 mr-2" />
                      Review Listing
                    </button>
                  </Dialog.Trigger>
                  
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 transition-opacity" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-lg p-6 overflow-hidden">
                      <Dialog.Title className="text-xl font-bold text-gray-900 mb-1 border-b pb-3">
                        Review Listing Request
                      </Dialog.Title>
                      
                      {selectedListing && (
                        <div className="mt-4 space-y-5">
                          {/* Business Info */}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">{selectedListing.businessName}</h4>
                            <p className="text-sm text-gray-600">{selectedListing.description}</p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 border border-gray-100">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Provider Info</p>
                              <p className="font-medium text-sm text-gray-900">{selectedListing.provider.name}</p>
                              <p className="text-sm text-gray-500">{selectedListing.provider.mobileNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Categories</p>
                              <p className="font-medium text-sm text-gray-900 flex flex-wrap gap-1">
                                {selectedListing.listingCategories.map(lc => (
                                  <span key={lc.category.id} className="bg-white border rounded px-1.5 py-0.5 text-xs">
                                    {lc.category.name}
                                  </span>
                                ))}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
                              <p className="font-medium text-sm text-gray-900">
                                {selectedListing.city ? `${selectedListing.city}` : 'Not provided'}
                              </p>
                              {selectedListing.area && <p className="text-sm text-gray-500">{selectedListing.area}</p>}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Submitted On</p>
                              <p className="font-medium text-sm text-gray-900">
                                {selectedListing.submittedAt ? new Date(selectedListing.submittedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Rejection Note Field */}
                          <div className="pt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rejection Note (required if rejecting)
                            </label>
                            <textarea
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                              placeholder="Reason for rejecting this listing..."
                              value={rejectionNote}
                              onChange={(e) => setRejectionNote(e.target.value)}
                            />
                          </div>

                          <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                            <Dialog.Close asChild>
                              <button 
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                                disabled={isProcessing}
                              >
                                Cancel
                              </button>
                            </Dialog.Close>

                            <div className="flex gap-2">
                              <button 
                                onClick={handleReject}
                                disabled={isProcessing}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                              >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                Reject
                              </button>
                              <button 
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50"
                              >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Approve
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Providers;
