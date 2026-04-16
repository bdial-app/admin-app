import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, AlertTriangle, Phone, ToggleRight, ToggleLeft } from 'lucide-react';
import axios from 'axios';

interface Reviewer {
  id: string;
  name: string;
  mobileNumber: string;
}

interface Review {
  id: string;
  listingId: string;
  reviewerId: string;
  starRating: number;
  reviewText: string | null;
  status: string; // 'active' | 'removed'
  postedAt: string;
  reviewer: Reviewer;
}

const API_BASE = 'https://xjkzgdt0-3001.inc1.devtunnels.ms/api';

const Reviews = () => {
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch all reviews once
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/reviews`);
        const list: Review[] = response.data.data ?? [];
        setAllReviews(list);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, ratingFilter]);

  // Toggle active/removed status
  const toggleActive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'removed' : 'active';
    setAllReviews(prev =>
      prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
    );
    try {
      await axios.patch(`${API_BASE}/reviews/${id}`, { status: newStatus });
    } catch (error) {
      console.error('Toggle error:', error);
      // rollback
      setAllReviews(prev =>
        prev.map(r => r.id === id ? { ...r, status: currentStatus } : r)
      );
    }
  };

  // Filter by search + star rating
  const filteredReviews = allReviews.filter(r => {
    const name = (r.reviewer?.name ?? '').toLowerCase();
    const phone = r.reviewer?.mobileNumber ?? '';
    const matchesSearch = !searchTerm ||
      name.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);
    const matchesRating = ratingFilter === 0 || r.starRating === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const visibleReviews = filteredReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReviews.length;

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    if (hasMore && !loading) setVisibleCount(prev => prev + 10);
  }, [hasMore, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 p-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <h2 className="text-2xl font-bold text-gray-900">Reviews & Moderation</h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(Number(e.target.value))}
          >
            <option value={0}>All Ratings</option>
            {[5, 4, 3, 2, 1].map(r => (
              <option key={r} value={r}>{r} Stars</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleReviews.map((review) => (
          <div
            key={review.id}
            className={`bg-white rounded-lg shadow border p-6 transition-all ${
              review.status === 'removed' ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  {review.reviewer?.name ?? '—'}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {formatDate(review.postedAt)}
                </p>

                {/* Toggle Button */}
                <button
                  onClick={() => toggleActive(review.id, review.status)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    review.status === 'active'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {review.status === 'active'
                    ? <ToggleRight className="w-3 h-3" />
                    : <ToggleLeft className="w-3 h-3" />}
                  {review.status === 'active' ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Star Rating */}
              <div className="text-right">
                <div className="text-yellow-500 text-lg mb-1">
                  {'★'.repeat(review.starRating ?? 0)}{'☆'.repeat(5 - (review.starRating ?? 0))}
                </div>
                <span className="text-sm text-gray-600">({review.starRating ?? 0})</span>
                {review.status === 'removed' && (
                  <AlertTriangle className="w-5 h-5 text-red-500 ml-1 inline" />
                )}
              </div>
            </div>

            <p className="text-gray-700 italic bg-gray-50 p-3 rounded-md mb-4">
              "{review.reviewText ?? 'No comment provided.'}"
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <a
                href={`tel:${review.reviewer?.mobileNumber ?? ''}`}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 font-medium border rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call {review.reviewer?.mobileNumber ?? ''}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-2" />

      {/* Empty state */}
      {filteredReviews.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 text-lg">
          No reviews match your filters.
        </div>
      )}

      {/* All loaded */}
      {!hasMore && visibleReviews.length > 0 && !loading && (
        <p className="text-center text-xs text-gray-400 py-2">
          All {filteredReviews.length} reviews loaded
        </p>
      )}
    </div>
  );
};

export default Reviews;
