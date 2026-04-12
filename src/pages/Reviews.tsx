import { useState, useEffect, useRef, useCallback  } from 'react';
import { Search, Trash2, AlertTriangle } from 'lucide-react';
import { Phone, Star } from 'lucide-react';

import axios from 'axios';


const api = axios.create({
  baseURL: 'https://xjkzgdt0-3001.inc1.devtunnels.ms/api',
  headers: { 'Content-Type': 'application/json' },
});
 
// Response shape from GET /reviews
interface ReviewsResponse {
  data: Review[];
  total: number;
  page: number;
  pageSize: number;
}
 
const PAGE_SIZE = 6;
 
const StarFilter = ({ selected, onChange }: { selected: number | null; onChange: (val: number | null) => void }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-500 font-medium">Stars:</span>
      <button
        onClick={() => onChange(null)}
        className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
          selected === null ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
        }`}
      >
        All
      </button>
      {[5, 4, 3, 2, 1].map((star) => (
        <button
          key={star}
          onClick={() => onChange(selected === star ? null : star)}
          className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
            selected === star
              ? 'bg-yellow-400 text-yellow-900 border-yellow-400'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-yellow-50'
          }`}
        >
          <Star className="w-3 h-3 fill-current" />
          {star}
        </button>
      ))}
    </div>
  );
};
 
const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`w-3.5 h-3.5 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
      />
    ))}
    <span className="text-xs text-gray-500 ml-1">{rating}/5</span>
  </div>
);
 
interface Review {
  id: string;
  provider: string;
  user: string;
  phone: string;
  rating: number;
  active: boolean;
  date: string;
  comment: string;
  flagged: boolean;
}
 
const Reviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Cancel token ref to abort in-flight requests on filter change
  const abortRef = useRef<AbortController | null>(null);
 
  const hasMore = reviews.length < total;
 
  // Fetch a page of reviews from the API
  const fetchReviews = useCallback(async (pageNum: number, replace: boolean) => {
    if (isLoading) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
 
    setIsLoading(true);
    setError(null);
 
    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        pageSize: PAGE_SIZE,
      };
      if (searchTerm) params.search = searchTerm;
      if (starFilter !== null) params.rating = starFilter;
 
      const { data } = await api.get<ReviewsResponse>('/reviews', {
        params,
        signal: abortRef.current.signal,
      });
 
      setReviews((prev) => (replace ? data.data : [...prev, ...data.data]));
      setTotal(data.total);
      setPage(pageNum);
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError('Failed to load reviews. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, starFilter, isLoading]);
 
  // Re-fetch from page 1 whenever filters change
  useEffect(() => {
    fetchReviews(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, starFilter]);
 
  // Load next page when sentinel comes into view
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    fetchReviews(page + 1, false);
  }, [isLoading, hasMore, page, fetchReviews]);
 
  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);
 
  // PATCH /reviews/:id/toggle-active
  const toggleActive = async (id: string) => {
    const original = reviews.find((r) => r.id === id);
    if (!original) return;
 
    // Optimistic update
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
 
    try {
      await api.patch(`/reviews/${id}`, { active: !original.active });
    } catch {
      // Rollback on failure
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, active: original.active } : r)));
    }
  };





  

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      setReviews(reviews.filter(r => r.id !== id));
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.provider.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Reviews & Moderation</h2>
        
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Star filter bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <StarFilter selected={starFilter} onChange={setStarFilter} />
      </div>
 
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.map((review) => (
          <div key={review.id} className={`bg-white rounded-lg shadow border ${review.flagged ? 'border-red-300' : 'border-gray-200'} p-5`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{review.provider}</h3>
                <p className="text-xs text-gray-500">by {review.user} on {review.date}</p>

                {/* Active Toggle */}

              <button
                onClick={() => toggleActive(review.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium ${review.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
              >
                {review.active ? 'Active' : 'De-active'}
              </button>
              </div>

             <div className="text-yellow-500 text-sm mb-3">
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              <span className="text-gray-600 ml-2">|{review.rating}stars</span>
            
                {review.flagged && (
                  <span title="Reported/Flagged Review">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </span>
                )}
              </div>
            </div>
            
            
            <p className="text-gray-700 text-sm italic mb-4">"{review.comment}"</p>
            
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button 
                onClick={() => handleDelete(review.id)}
                className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Review
              </button>
              {/* Call CTA */}
         
            <a
              href={`tel:${review.phone}`}
              className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-blue-600 font-medium">
                <Phone className="w-4 h-4" />
                Call User
              </span>
              <span className="text-gray-600">{review.phone}</span>
            </a>
            </div>
          </div>
        ))}

         
          
        

        {filteredReviews.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            No reviews found matching that filter.
          </div>
        )}
      </div>
       {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading more reviews...
          </div>
        )}
        {!hasMore && reviews.length > 0 && !isLoading && (
          <p className="text-xs text-gray-400">All {total} reviews loaded</p>
        )}
      </div>
    </div>
  );
};
    

    
export default Reviews;
